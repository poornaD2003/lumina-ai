CREATE TABLE "SupplierInvoice" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "invoiceTotal" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'REVIEW',
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierInvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    CONSTRAINT "SupplierInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");
CREATE INDEX "SupplierInvoiceItem_invoiceId_idx" ON "SupplierInvoiceItem"("invoiceId");
CREATE INDEX "SupplierInvoiceItem_productId_idx" ON "SupplierInvoiceItem"("productId");
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoiceItem" ADD CONSTRAINT "SupplierInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierInvoiceItem" ADD CONSTRAINT "SupplierInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;