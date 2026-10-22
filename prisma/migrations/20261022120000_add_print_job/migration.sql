-- Additive only. Does not drop the shift cash columns that remain in the database
-- after they were removed from schema.prisma (openingCashVnd, actualCashVnd,
-- cashDifferenceVnd, differenceReason, receivedBy).

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTED', 'FAILED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintJob" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "targetName" TEXT,
    "payloadJson" TEXT NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdByName" TEXT,
    "printedAt" TIMESTAMP(3),
    "printedBy" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintJob_lakeId_status_createdAt_idx" ON "PrintJob"("lakeId", "status", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Catalog prices only. Does not change Lake.subscriptionExpiresAt or any order already issued.
UPDATE "SubscriptionPlan"
SET
    "name" = 'Dùng thử 30 ngày',
    "priceVnd" = 0,
    "durationDays" = 30,
    "maxSpots" = NULL,
    "maxStaff" = NULL,
    "description" = 'Gói dùng thử 30 ngày cho tài khoản mới, mở full tính năng (tương đương Gói Vàng).',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'TRIAL';

UPDATE "SubscriptionPlan"
SET
    "name" = 'Gói Bạc (Silver)',
    "priceVnd" = 129000,
    "durationDays" = 30,
    "maxSpots" = 30,
    "maxStaff" = 2,
    "description" = 'Gói Bạc 129.000đ/tháng: tối đa 30 ô câu, chủ hồ và 2 tài khoản nhân sự.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'SILVER';

UPDATE "SubscriptionPlan"
SET
    "name" = 'Gói Vàng (Gold)',
    "priceVnd" = 199000,
    "durationDays" = 30,
    "maxSpots" = NULL,
    "maxStaff" = NULL,
    "description" = 'Gói Vàng 199.000đ/tháng: không giới hạn ô câu và nhân sự.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'GOLD';
