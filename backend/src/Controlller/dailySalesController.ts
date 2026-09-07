import PDFDocument from 'pdfkit';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function downloadDailySalesPdf(req: Request, res: Response) {
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'A valid date is required' });
  }

  const records = await prisma.dailyNetProfit.findMany({
    where: { date },
    orderBy: { id: 'asc' },
  });
  const productIds = records.flatMap((record) => record.productId === null ? [] : [record.productId]);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true },
  });
  const skuByProductId = new Map(products.map((product) => [product.id, product.sku]));

  const filename = `daily-sales-${date}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const document = new PDFDocument({ margin: 42, size: 'A4' });
  document.pipe(res);

  document.fontSize(20).font('Helvetica-Bold').text('Lumina Laptop Store', { align: 'center' });
  document.fontSize(14).text('Daily Sold Products Report', { align: 'center' });
  document.fontSize(10).font('Helvetica').text(`Date: ${date}`, { align: 'center' });
  document.moveDown(1.5);

  let totalQuantity = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const drawHeader = () => {
    const y = document.y;
    document.fontSize(9).font('Helvetica-Bold');
    document.text('Product / SKU', 42, y, { width: 190 });
    document.text('Qty', 240, y, { width: 35, align: 'right' });
    document.text('Sell Price', 280, y, { width: 75, align: 'right' });
    document.text('Revenue', 360, y, { width: 75, align: 'right' });
    document.text('Cost', 440, y, { width: 55, align: 'right' });
    document.text('Profit', 500, y, { width: 53, align: 'right' });
    document.moveTo(42, y + 16).lineTo(553, y + 16).stroke();
    document.y = y + 24;
  };

  drawHeader();
  document.font('Helvetica').fontSize(8.5);

  for (const record of records) {
    if (document.y > 735) {
      document.addPage();
      drawHeader();
      document.font('Helvetica').fontSize(8.5);
    }

    const productLabel = `${record.productName ?? 'Product'}\n${record.productId === null ? 'No SKU' : skuByProductId.get(record.productId) ?? 'No SKU'}`;
    document.text(productLabel, 42, document.y, { width: 190 });
    document.text(String(record.quantity), 240, document.y, { width: 35, align: 'right' });
    document.text(record.sellingPrice.toLocaleString(), 280, document.y, { width: 75, align: 'right' });
    document.text(record.revenue.toLocaleString(), 360, document.y, { width: 75, align: 'right' });
    document.text(record.costOfGoods.toLocaleString(), 440, document.y, { width: 55, align: 'right' });
    document.text(record.netProfit.toLocaleString(), 500, document.y, { width: 53, align: 'right' });
    document.moveDown(1.5);

    totalQuantity += record.quantity;
    totalRevenue += record.revenue;
    totalCost += record.costOfGoods;
    totalProfit += record.netProfit;
  }

  if (records.length === 0) {
    document.fontSize(11).text('No sold products were recorded for this date.', 42, document.y + 10);
  } else {
    document.moveDown(0.5);
    document.moveTo(42, document.y).lineTo(553, document.y).stroke();
    document.moveDown(0.7);
    document.font('Helvetica-Bold').fontSize(10);
    document.text(`Total units: ${totalQuantity}`);
    document.text(`Total revenue: LKR ${Math.round(totalRevenue).toLocaleString()}`);
    document.text(`Total cost: LKR ${Math.round(totalCost).toLocaleString()}`);
    document.text(`Net profit: LKR ${Math.round(totalProfit).toLocaleString()}`);
  }

  document.end();
}