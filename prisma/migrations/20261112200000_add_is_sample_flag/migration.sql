-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FishingSession" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "isSample" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_lakeId_isSample_idx" ON "Customer"("lakeId", "isSample");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FishingSession_lakeId_isSample_idx" ON "FishingSession"("lakeId", "isSample");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_lakeId_isSample_idx" ON "Invoice"("lakeId", "isSample");
