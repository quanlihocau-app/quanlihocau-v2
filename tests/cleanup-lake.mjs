/** Xóa hồ test theo thứ tự khóa ngoại. Gọi sau khi gỡ currentSessionId của chòi. */
export async function deleteLakeForTests(db, lakeId) {
    if (!lakeId) return;
    const q = (text, params) => db.query(text, params);
    await q(`UPDATE "Hut" SET "currentSessionId" = NULL WHERE "lakeId" = $1`, [lakeId]);
    await q(`UPDATE "Payment" SET "reversalOfId" = NULL WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "DebtPayment" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Debt" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FinancialTransaction" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "InvoiceLine" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "lakeId" = $1)`, [lakeId]);
    await q(`DELETE FROM "Payment" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FishBuyback" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Invoice" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FishingSessionHut" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FishingSession" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Notification" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "ApprovalRequest" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "InventoryMovement" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Product" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FishType" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Expense" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "ShiftClose" WHERE "shiftId" IN (SELECT id FROM "Shift" WHERE "lakeId" = $1)`, [lakeId]);
    await q(`DELETE FROM "Shift" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "PrintJob" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "AuditEvent" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "IdempotencyKey" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Customer" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Area" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Package" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "SubscriptionOrder" WHERE "lakeId" = $1`, [lakeId]);
    await q(`UPDATE "FinancialCategory" SET "parentId" = NULL WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FinancialCategory" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "ReconciliationRecord" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FundTransfer" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FinancialAccount" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "FinancialPeriod" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Membership" WHERE "lakeId" = $1`, [lakeId]);
    await q(`DELETE FROM "Lake" WHERE "id" = $1`, [lakeId]);
}

/** Gỡ chòi mà không xóa hồ. Phiên mẫu đang trỏ vào chòi phải được thả trước. */
export async function clearLakeHuts(db, lakeId) {
    await db.query(`UPDATE "Hut" SET "currentSessionId" = NULL WHERE "lakeId" = $1`, [lakeId]);
    await db.query(`DELETE FROM "FishingSessionHut" WHERE "lakeId" = $1`, [lakeId]);
    await db.query(`DELETE FROM "Hut" WHERE "lakeId" = $1`, [lakeId]);
}
