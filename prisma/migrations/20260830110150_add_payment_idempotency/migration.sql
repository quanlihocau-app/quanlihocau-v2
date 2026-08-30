/*
  Warnings:

  - A unique constraint covering the columns `[lakeId,idempotencyKey]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_lakeId_idempotencyKey_key" ON "Payment"("lakeId", "idempotencyKey");
