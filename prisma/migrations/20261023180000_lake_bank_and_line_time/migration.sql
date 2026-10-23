-- Additive only. Pond contact and bank details for VietQR, plus indexes
-- so revenue can be counted by the time each invoice line was added.

ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "bankCode" TEXT;
ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;

CREATE INDEX IF NOT EXISTS "InvoiceLine_createdAt_idx" ON "InvoiceLine"("createdAt");
CREATE INDEX IF NOT EXISTS "InvoiceLine_invoiceId_createdAt_idx" ON "InvoiceLine"("invoiceId", "createdAt");
