-- CreateTable
CREATE TABLE "DailyNetProfit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "revenue" REAL NOT NULL,
    "costOfGoods" REAL NOT NULL,
    "netProfit" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyNetProfit_date_key" ON "DailyNetProfit"("date");