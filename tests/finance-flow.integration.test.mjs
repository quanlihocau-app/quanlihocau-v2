import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Opt-in: creates isolated fixtures and deletes only those exact IDs in finally.
test("Real database: staff receipt → cashbook → report → export → details → shift close", {
    skip: process.env.RUN_FINANCE_INTEGRATION !== "1", timeout: 240000,
}, async () => {
    nextEnv.loadEnvConfig(process.cwd());
    const base = process.env.TEST_BASE_URL || "http://localhost:3010";
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
    const orgId = crypto.randomUUID(), lakeId = crypto.randomUUID(), foreignLakeId = crypto.randomUUID();
    const ownerId = crypto.randomUUID(), staffId = crypto.randomUUID(), foreignExpenseId = crypto.randomUUID();
    const password = "FinanceIntegration123!";
    const ownerEmail = `finance-owner-${ownerId}@example.test`, staffEmail = `finance-staff-${staffId}@example.test`;
    const previewPath = path.join(os.tmpdir(), "qlhc-finance-preview.json");
    const releasePath = previewPath + ".release";
    let seeded = false;
    try {
        const hash = await bcrypt.hash(password, 10);
        const c = await pool.connect();
        try {
            await c.query("BEGIN");
            await c.query('INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,$2,NOW())', [orgId, "Finance integration"]);
            for (const id of [lakeId, foreignLakeId]) await c.query('INSERT INTO "Lake" (id,"organizationId",name,"updatedAt") VALUES ($1,$2,$3,NOW())', [id, orgId, "Hồ kiểm tra thu chi"]);
            for (const [id, email, role] of [[ownerId, ownerEmail, "OWNER"], [staffId, staffEmail, "STAFF"]]) {
                await c.query('INSERT INTO "User" (id,email,name,"passwordHash","phoneVerified","updatedAt") VALUES ($1,$2,$3,$4,true,NOW())', [id, email, role === "STAFF" ? "Nhân viên kiểm tra" : "Chủ hồ kiểm tra", hash]);
                await c.query('INSERT INTO "Membership" (id,"userId","lakeId",role,"updatedAt") VALUES ($1,$2,$3,$4,NOW())', [crypto.randomUUID(), id, lakeId, role]);
            }
            await c.query('INSERT INTO "Expense" (id,"lakeId",description,"amountVnd","updatedAt") VALUES ($1,$2,$3,123,NOW())', [foreignExpenseId, foreignLakeId, "Cross-tenant fixture"]);
            await c.query("COMMIT"); seeded = true;
        } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
        async function login(email) {
            const csrf = await fetch(`${base}/api/auth/csrf`);
            const { csrfToken } = await csrf.json();
            const cookies = csrf.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
            const r = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", redirect: "manual",
                headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
                body: new URLSearchParams({ email, password, csrfToken, redirect: "false", json: "true" }) });
            const result = r.headers.getSetCookie().map(v => v.split(";")[0]).join("; ");
            if (!result.includes("session-token")) {
                const info = await r.json();
                const target = new URL(info.url || base);
                assert.fail(`Test login: HTTP ${r.status}; error=${target.searchParams.get("error") || "none"}; csrf=${target.searchParams.get("csrf") || "none"}`);
            }
            return result;
        }
        const ownerCookie = await login(ownerEmail), staffCookie = await login(staffEmail);
        async function request(url, cookie = ownerCookie, body) {
            const r = await fetch(`${base}${url}`, { headers: { Cookie: cookie, "Content-Type": "application/json", ...(body ? { "Idempotency-Key": crypto.randomUUID() } : {}) },
                ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
            assert.ok(r.ok, `${url}: status ${r.status}`);
            return r;
        }
        const receipt = await (await request("/api/receipts", ownerCookie, { description: "Bán gà ngoài", category: "Bán gà", amountVnd: 1000000, paymentMethod: "CASH" })).json();
        const expense = await (await request("/api/expenses", ownerCookie, { description: "Thanh toán tiền điện", category: "Tiền điện", amountVnd: 100000, paymentMethod: "CASH" })).json();
        await request("/api/receipts", staffCookie, { description: "Bán máy ngoài", category: "Bán máy", amountVnd: 700000, paymentMethod: "BANK_TRANSFER" });
        const date = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
        const range = `from=${date}&to=${date}`;
        const book = await (await request(`/api/cashbook?${range}&scope=all`)).json();
        assert.equal(book.summary.cashIn, 1000000); assert.equal(book.summary.cashOut, 100000);
        assert.equal(book.summary.netCash, 900000); assert.equal(book.summary.netTransfer, 700000);
        assert.equal(book.items.find(i => i.method === "BANK_TRANSFER").recordedBy, "Nhân viên kiểm tra");
        const t = performance.now();
        const report = await (await request(`/api/reports/analytics?preset=custom&${range}`)).json();
        const reportMs = Math.round(performance.now() - t);
        assert.equal(report.summary.otherRevenue, 1700000); assert.equal(report.summary.totalExpense, 100000);
        assert.equal(report.summary.netProfit, 1600000);
        assert.equal(report.summary.netCash, book.summary.netCash); assert.equal(report.summary.netTransfer, book.summary.netTransfer);
        assert.equal(report.chartSeries.reduce((sum, p) => sum + p.profit, 0), report.summary.netProfit);
        const staffReport = await (await request(`/api/reports/analytics?preset=custom&${range}&employeeId=${staffId}`)).json();
        assert.equal(staffReport.summary.totalRevenue, 700000); assert.equal(staffReport.summary.totalExpense, 0);
        const staffBook = await (await request(`/api/cashbook?${range}&scope=manual&employeeId=${staffId}`)).json();
        assert.equal(staffBook.items.length, 1); assert.equal(staffBook.summary.transferIn, 700000);
        const searched = await (await request(`/api/cashbook?${range}&q=${encodeURIComponent("Tiền điện")}`)).json();
        assert.equal(searched.items.length, 1); assert.equal(searched.summary.cashOut, 100000);
        const csvResponse = await request(`/api/reports/export?preset=custom&${range}&format=excel`);
        assert.ok(csvResponse.headers.get("content-disposition").endsWith('.csv"'));
        const csv = await csvResponse.text();
        assert.ok(csv.includes('"TỔNG DOANH THU","1700000"')); assert.ok(csv.includes('"LỢI NHUẬN TẠM TÍNH","1600000"'));
        const detail = await (await request(`/api/reports/drilldown?preset=custom&${range}&metric=totalExpense`)).json();
        assert.equal(detail.items[0].href, `/expenses/${expense.expense.id}`);
        const target = `/cashbook?${range}&scope=all`;
        const payment = book.items.find(i => i.invoiceId === receipt.receipt.id);
        for (const url of [`/cashbook/${payment.id}`, `/expenses/${expense.expense.id}`, `/invoices/${receipt.receipt.id}`]) {
            const page = await request(`${url}?returnTo=${encodeURIComponent(target)}`);
            assert.ok((await page.text()).includes(target.replaceAll("&", "&amp;")), "Detail must contain the filtered return link");
        }
        const foreignPage = await fetch(`${base}/expenses/${foreignExpenseId}`, { headers: { Cookie: ownerCookie } });
        const foreignHtml = await foreignPage.text();
        // App Router can stream the not-found boundary after sending HTTP 200.
        assert.ok([200, 404].includes(foreignPage.status));
        assert.ok(!foreignHtml.includes("Cross-tenant fixture"));
        assert.ok(foreignHtml.includes("404") || foreignHtml.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
        const daily = await (await request("/api/reports/daily")).json();
        assert.equal(daily.summary.revenueVnd, report.summary.totalRevenue); assert.equal(daily.summary.netProfitVnd, report.summary.netProfit);
        const close = await (await request("/api/reports/daily/close", ownerCookie, { note: "Kiểm tra đồng bộ thu chi" })).json();
        assert.equal(close.summary.revenueVnd, 1700000); assert.equal(close.summary.netProfitVnd, 1600000);
        const stored = await pool.query('SELECT "createdBy" FROM "AuditEvent" WHERE "lakeId"=$1 AND action=\'RECEIPT_CREATED\' ORDER BY "createdAt" DESC LIMIT 1', [lakeId]);
        assert.equal(stored.rows[0].createdBy, staffId);
        console.log(`Finance flow verified; report response ${reportMs} ms on the configured database.`);
        if (process.env.FINANCE_BROWSER_PREVIEW === "1") {
            fs.writeFileSync(previewPath, JSON.stringify({ email: ownerEmail, password, date }));
            console.log("Temporary browser fixture ready; cleanup follows release or a two-minute timeout.");
            const deadline = Date.now() + 120000;
            while (Date.now() < deadline && !fs.existsSync(releasePath)) await new Promise(resolve => setTimeout(resolve, 250));
        }
    } finally {
        if (seeded) {
            const c = await pool.connect();
            try {
                await c.query("BEGIN");
                const ids = [lakeId, foreignLakeId];
                await c.query('DELETE FROM "Payment" WHERE "lakeId"=ANY($1::text[])', [ids]);
                await c.query('DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "lakeId"=ANY($1::text[]))', [ids]);
                for (const table of ["Invoice", "Expense", "AuditEvent", "IdempotencyKey"]) await c.query(`DELETE FROM "${table}" WHERE "lakeId"=ANY($1::text[])`, [ids]);
                await c.query('DELETE FROM "ShiftClose" WHERE "shiftId" IN (SELECT id FROM "Shift" WHERE "lakeId"=ANY($1::text[]))', [ids]);
                for (const table of ["Shift", "Membership", "Lake"]) await c.query(`DELETE FROM "${table}" WHERE ${table === "Lake" ? 'id' : '"lakeId"'}=ANY($1::text[])`, [ids]);
                await c.query('DELETE FROM "Organization" WHERE id=$1', [orgId]);
                await c.query('DELETE FROM "User" WHERE id=ANY($1::text[])', [[ownerId, staffId]]);
                await c.query("COMMIT");
            } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
        }
        fs.rmSync(previewPath, { force: true }); fs.rmSync(releasePath, { force: true });
        await pool.end();
    }
});
