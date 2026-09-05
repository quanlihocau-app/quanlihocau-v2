-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('TRIAL', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "SubscriptionOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "subscriptionPlan" "PlanTier" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lake" ADD COLUMN "subscriptionPlan" "PlanTier" NOT NULL DEFAULT 'TRIAL';

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceVnd" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "maxSpots" INTEGER,
    "maxStaff" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionOrder" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lakeId" TEXT NOT NULL,
    "planCode" "PlanTier" NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "status" "SubscriptionOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'VIETQR',
    "paidAt" TIMESTAMP(3),
    "bankRef" TEXT,
    "rawWebhookPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionOrder_orderCode_key" ON "SubscriptionOrder"("orderCode");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_lakeId_status_idx" ON "SubscriptionOrder"("lakeId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_orderCode_idx" ON "SubscriptionOrder"("orderCode");

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "SubscriptionPlan"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
