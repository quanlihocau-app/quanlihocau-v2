/*
  Warnings:

  - A unique constraint covering the columns `[lakeId,sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_lakeId_sku_key" ON "Product"("lakeId", "sku");
