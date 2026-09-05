import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Idempotent repair script for active sessions missing a DRAFT invoice.
 * Usage:
 *   Dry-run (safe, default): node --env-file=.env scripts/repair-missing-invoices.mjs
 *   Execute repair:         node --env-file=.env scripts/repair-missing-invoices.mjs --execute
 *   Specific session:       node --env-file=.env scripts/repair-missing-invoices.mjs --sessionId=<uuid> --execute
 */
export async function repairMissingInvoices(options = {}) {
    // Safety lock: Only run in dry-run mode unless explicitly approved via ALLOW_REPAIR_EXECUTE
    const isExecute = Boolean(options.execute || (process.argv.includes("--execute") && process.env.ALLOW_REPAIR_EXECUTE === "true"));
    const targetSessionId = options.sessionId ?? process.argv.find(a => a.startsWith("--sessionId="))?.split("=")[1];

    console.log(`=== REPAIR SESSIONS MISSING INVOICE (${isExecute ? "EXECUTE MODE" : "DRY-RUN MODE"}) ===`);
    if (!isExecute && process.argv.includes("--execute")) {
        console.log("CHÚ Ý: Chế độ ghi dữ liệu bị khóa theo chính sách dự án. Đang chạy ở chế độ DRY-RUN an toàn.\n");
    }

    let query = `
        SELECT s.id as "sessionId", s."lakeId", l.name as "lakeName",
               s."packageNameSnapshot", s."packagePriceVndSnapshot", s."packageDurationMinutesSnapshot",
               s."startAt", s."plannedEndAt", s."createdAt",
               c.id as "customerId", c.name as "customerName",
               COUNT(fsh."hutId")::int as "hutCount",
               ARRAY_AGG(h.name) as huts
        FROM "FishingSession" s
        JOIN "Lake" l ON s."lakeId" = l.id
        LEFT JOIN "Customer" c ON s."customerId" = c.id
        LEFT JOIN "FishingSessionHut" fsh ON s.id = fsh."fishingSessionId"
        LEFT JOIN "Hut" h ON fsh."hutId" = h.id
        LEFT JOIN "Invoice" i ON s.id = i."fishingSessionId"
        WHERE s.status = 'ACTIVE' AND i.id IS NULL
    `;
    const params = [];
    if (targetSessionId) {
        query += ` AND s.id = $1`;
        params.push(targetSessionId);
    }
    query += `
        GROUP BY s.id, s."lakeId", l.name, s."packageNameSnapshot", s."packagePriceVndSnapshot",
                 s."packageDurationMinutesSnapshot", s."startAt", s."plannedEndAt", s."createdAt",
                 c.id, c.name
        ORDER BY s."createdAt" ASC
    `;

    const res = await pool.query(query, params);
    console.log(`Found ${res.rows.length} active session(s) missing DRAFT invoice.\n`);

    const results = [];

    for (const s of res.rows) {
        const hutCount = s.hutCount || 1;
        const unitPrice = Number(s.packagePriceVndSnapshot || 0);
        const totalVnd = unitPrice * hutCount;
        const lineName = `Tiền ca: ${s.packageNameSnapshot || "Gói câu"}${hutCount > 1 ? ` (${hutCount} ô)` : ""}`;

        console.log(`Session ID: ${s.sessionId}`);
        console.log(`  Lake ID: ${s.lakeId} (${s.lakeName})`);
        console.log(`  Spot / Hut: ${s.huts.join(", ")}`);
        console.log(`  Customer: ${s.customerName || "Khách lẻ"}`);
        console.log(`  Giá gói snapshot: ${unitPrice.toLocaleString("vi-VN")}đ (${s.packageNameSnapshot})`);
        console.log(`  Thời gian tạo: ${s.createdAt.toISOString()}`);

        if (isExecute) {
            // Run inside transaction
            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Check idempotency: ensure no invoice was created concurrently
                const check = await client.query(
                    `SELECT id FROM "Invoice" WHERE "lakeId" = $1 AND "fishingSessionId" = $2`,
                    [s.lakeId, s.sessionId]
                );
                if (check.rows.length > 0) {
                    console.log(`  -> BỎ QUA: Hóa đơn ${check.rows[0].id} đã tồn tại.`);
                    await client.query("ROLLBACK");
                    continue;
                }

                // 1. Create Invoice DRAFT
                const invRes = await client.query(`
                    INSERT INTO "Invoice" ("id", "lakeId", "customerId", "fishingSessionId", "status", "totalAmountVnd", "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), $1, $2, $3, 'DRAFT', $4, $5, NOW())
                    RETURNING id
                `, [s.lakeId, s.customerId || null, s.sessionId, totalVnd, s.createdAt]);
                const invoiceId = invRes.rows[0].id;

                // 2. Create initial InvoiceLine
                await client.query(`
                    INSERT INTO "InvoiceLine" ("id", "invoiceId", "name", "unitPrice", "quantity", "totalVnd", "createdAt")
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
                `, [invoiceId, lineName, unitPrice, hutCount, totalVnd, s.createdAt]);

                // 3. Get lake user for AuditEvent createdBy
                const memberRes = await client.query(
                    `SELECT "userId" FROM "Membership" WHERE "lakeId" = $1 LIMIT 1`,
                    [s.lakeId]
                );
                const createdByUserId = memberRes.rows[0]?.userId;

                // 4. Create AuditEvent
                if (createdByUserId) {
                    await client.query(`
                        INSERT INTO "AuditEvent" ("id", "lakeId", "entityType", "entityId", "action", "payload", "createdBy", "createdAt")
                        VALUES (gen_random_uuid(), $1, 'Invoice', $2, 'INVOICE_REPAIRED_FROM_SESSION', $3, $4, NOW())
                    `, [s.lakeId, invoiceId, JSON.stringify({
                        sessionId: s.sessionId,
                        totalAmountVnd: totalVnd,
                        reason: "Automated backfill of missing DRAFT invoice for active session"
                    }), createdByUserId]);
                }

                await client.query("COMMIT");
                console.log(`  -> ĐÃ TẠO HÓA ĐƠN DRAFT: ${invoiceId} thành công!`);
                results.push({ sessionId: s.sessionId, invoiceId, status: "CREATED" });
            } catch (err) {
                await client.query("ROLLBACK");
                console.error(`  -> LỖI khi tạo hóa đơn cho session ${s.sessionId}:`, err.message);
                results.push({ sessionId: s.sessionId, error: err.message, status: "FAILED" });
            } finally {
                client.release();
            }
        } else {
            console.log(`  -> [DRY-RUN] Dự kiến tạo Invoice DRAFT trị giá ${totalVnd.toLocaleString("vi-VN")}đ kèm 1 dòng InvoiceLine "${lineName}". Không sửa đổi DB.`);
            results.push({ sessionId: s.sessionId, expectedTotalVnd: totalVnd, status: "DRY_RUN" });
        }
    }

    return results;
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("repair-missing-invoices.mjs")) {
    repairMissingInvoices()
        .catch(console.error)
        .finally(() => pool.end());
}
