-- Allow multiple product rows for the same day.
DROP INDEX "DailyNetProfit_date_key";

ALTER TABLE "DailyNetProfit" ADD COLUMN "productId" INTEGER;
ALTER TABLE "DailyNetProfit" ADD COLUMN "productName" TEXT;
ALTER TABLE "DailyNetProfit" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DailyNetProfit" ADD COLUMN "sellingPrice" REAL NOT NULL DEFAULT 0;
ALTER TABLE "DailyNetProfit" ADD COLUMN "unitCost" REAL NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "DailyNetProfit_date_productId_key" ON "DailyNetProfit"("date", "productId");