ALTER TABLE "DailyNetProfit"
ADD CONSTRAINT "DailyNetProfit_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
