/**
 * Recompute Invoice.paidAmountVnd, refundedAmountVnd, balanceDueVnd and status
 * from each invoice's own payments. Dry-run unless --apply is passed.
 *
 * The formula matches invoiceMoneyFromPayments in src/lib/money.ts.
 * VOIDED invoices keep status VOIDED and balance 0.
 * Only rows that differ are written. Safe to run more than once.
 *
 * Refuses any DATABASE_URL whose host is not localhost, 127.0.0.1 or ::1
 * unless --allow-nonlocal is passed for a throwaway copy. Never point this
 * at production.
 */
import fs from "node:fs";
import vm from "node:vm";
import pg from "pg";
import ts from "typescript";

const apply = process.argv.includes("--apply");
const allowNonlocal = process.argv.includes("--allow-nonlocal");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("Thiếu DATABASE_URL. Không chạy.");
    process.exit(1);
}

const host = new URL(databaseUrl).hostname;
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
console.log(`Host: ${host}`);
if (!localHosts.has(host) && !allowNonlocal) {
    console.error("Từ chối host không phải máy local. Dùng --allow-nonlocal chỉ với bản sao vứt đi, không dùng production.");
    process.exit(1);
}

const source = fs.readFileSync(new URL("../src/lib/money.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const money = {};
vm.runInNewContext(code, { exports: money, require: () => { throw new Error("money.ts must stay import-free"); } });

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const invoices = await client.query(`
    SELECT i.id, i."totalAmountVnd", i.status::text AS status,
           i."paidAmountVnd", i."refundedAmountVnd", i."balanceDueVnd",
           COALESCE(json_agg(json_build_object('amountVnd', p."amountVnd", 'direction', p.direction::text))
                    FILTER (WHERE p.id IS NOT NULL), '[]') AS payments
    FROM "Invoice" i
    LEFT JOIN "Payment" p ON p."invoiceId" = i.id
    GROUP BY i.id
`);

let changed = 0;
for (const row of invoices.rows) {
    const next = money.invoiceMoneyFromPayments({
        totalAmountVnd: row.totalAmountVnd,
        status: row.status,
        payments: row.payments,
    });
    const same = next.paidAmountVnd === row.paidAmountVnd
        && next.refundedAmountVnd === row.refundedAmountVnd
        && next.balanceDueVnd === row.balanceDueVnd
        && next.status === row.status;
    if (same) continue;
    changed += 1;
    console.log(`${row.id} ${row.status} paid ${row.paidAmountVnd}->${next.paidAmountVnd} balance ${row.balanceDueVnd}->${next.balanceDueVnd} status ${next.status}`);
    if (apply) {
        await client.query(
            `UPDATE "Invoice"
             SET "paidAmountVnd" = $2, "refundedAmountVnd" = $3, "balanceDueVnd" = $4, status = $5::"InvoiceStatus"
             WHERE id = $1
               AND ("paidAmountVnd" IS DISTINCT FROM $2
                 OR "refundedAmountVnd" IS DISTINCT FROM $3
                 OR "balanceDueVnd" IS DISTINCT FROM $4
                 OR status::text IS DISTINCT FROM $5)`,
            [row.id, next.paidAmountVnd, next.refundedAmountVnd, next.balanceDueVnd, next.status],
        );
    }
}

console.log(apply ? `Đã cập nhật ${changed} hoá đơn.` : `Dry-run: ${changed} hoá đơn sẽ đổi. Thêm --apply để ghi.`);
await client.end();
