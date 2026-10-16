-- Reconcile schema changes that were present in the Prisma schema but missing
-- from the historical migrations. All additions are idempotent for safe deploys.
DO $$ BEGIN
    CREATE TYPE "PaymentTiming" AS ENUM ('PREPAID', 'POSTPAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "FishingSession"
    ADD COLUMN IF NOT EXISTS "paymentTiming" "PaymentTiming" NOT NULL DEFAULT 'POSTPAID';

ALTER TABLE "Invoice"
    ADD COLUMN IF NOT EXISTS "balanceDueVnd" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "discountAmountVnd" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "paidAmountVnd" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "refundedAmountVnd" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "subtotalVnd" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "OtpDeliveryLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "maskedPhone" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceHash" TEXT,
    "costVnd" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "OtpDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OtpDeliveryLog_phone_idx" ON "OtpDeliveryLog"("phone");
CREATE INDEX IF NOT EXISTS "OtpDeliveryLog_createdAt_idx" ON "OtpDeliveryLog"("createdAt");
CREATE INDEX IF NOT EXISTS "OtpDeliveryLog_status_idx" ON "OtpDeliveryLog"("status");
CREATE INDEX IF NOT EXISTS "AuditEvent_createdBy_idx" ON "AuditEvent"("createdBy");
CREATE INDEX IF NOT EXISTS "Lake_subscriptionStatus_idx" ON "Lake"("subscriptionStatus");
CREATE INDEX IF NOT EXISTS "Lake_subscriptionExpiresAt_idx" ON "Lake"("subscriptionExpiresAt");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_isLocked_idx" ON "User"("isLocked");
CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx" ON "User"("lastLoginAt");

ALTER TABLE "AuditEvent" ALTER COLUMN "lakeId" DROP NOT NULL;
ALTER TABLE "AuditEvent" DROP CONSTRAINT IF EXISTS "AuditEvent_lakeId_fkey";
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_lakeId_fkey"
    FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
