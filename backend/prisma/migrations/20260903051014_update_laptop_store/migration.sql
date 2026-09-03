/*
  Warnings:

  - Added the required column `brand` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMode` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "segment" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "lifetimeValue" REAL NOT NULL DEFAULT 0,
    "acquisitionDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Customer" ("acquisitionDate", "email", "id", "isActive", "lifetimeValue", "name", "region", "segment") SELECT "acquisitionDate", "email", "id", "isActive", "lifetimeValue", "name", "region", "segment" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "processor" TEXT,
    "ram" TEXT,
    "storage" TEXT,
    "displaySize" TEXT,
    "unitPrice" REAL NOT NULL,
    "costPrice" REAL NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "reorderLevel" INTEGER NOT NULL DEFAULT 5,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 12
);
INSERT INTO "new_Product" ("category", "costPrice", "id", "name", "reorderLevel", "sku", "stockQuantity", "unitPrice") SELECT "category", "costPrice", "id", "name", "reorderLevel", "sku", "stockQuantity", "unitPrice" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "region" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("customerId", "id", "productId", "quantity", "region", "saleDate", "totalAmount", "unitPrice") SELECT "customerId", "id", "productId", "quantity", "region", "saleDate", "totalAmount", "unitPrice" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
