/*
  Warnings:

  - A unique constraint covering the columns `[lakeId,fishingSessionId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `overtimeHourlyVndSnapshot` to the `FishingSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageDurationMinutesSnapshot` to the `FishingSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageNameSnapshot` to the `FishingSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packagePriceVndSnapshot` to the `FishingSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FishingSession" ADD COLUMN     "overtimeHourlyVndSnapshot" INTEGER NOT NULL,
ADD COLUMN     "packageDurationMinutesSnapshot" INTEGER NOT NULL,
ADD COLUMN     "packageNameSnapshot" TEXT NOT NULL,
ADD COLUMN     "packagePriceVndSnapshot" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_lakeId_fishingSessionId_key" ON "Invoice"("lakeId", "fishingSessionId");
