/*
  Warnings:

  - A unique constraint covering the columns `[lakeId,reversalOfId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Payment_lakeId_reversalOfId_key" ON "Payment"("lakeId", "reversalOfId");
