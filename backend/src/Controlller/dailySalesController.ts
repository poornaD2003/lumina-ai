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

  const doc = new PDFDocument({ margin: 42, size: 'A4' });
  doc.pipe(res);

  // --- HEADER SECTION ---
  doc.fontSize(18).font('Helvetica-Bold').text('Lumina Laptop Store', { align: 'center' });
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151').text('Daily Sold Products Report', { align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(`Date: ${date}`, { align: 'center' });
  doc.moveDown(1.2);

  let totalQuantity = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  // Table Column Positions
  const startX = 42;
  const colWidths = {
    product: 180,
    qty: 40,
    price: 70,
    revenue: 75,
    cost: 70,
    profit: 76,
  };

  const colX = {
    product: startX,
    qty: startX + colWidths.product,
    price: startX + colWidths.product + colWidths.qty,
    revenue: startX + colWidths.product + colWidths.qty + colWidths.price,
    cost: startX + colWidths.product + colWidths.qty + colWidths.price + colWidths.revenue,
    profit: startX + colWidths.product + colWidths.qty + colWidths.price + colWidths.revenue + colWidths.cost,
  };

  const drawTableHeader = () => {
    const y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827');

    doc.text('Product / SKU', colX.product, y, { width: colWidths.product });
    doc.text('Qty', colX.qty, y, { width: colWidths.qty, align: 'right' });
    doc.text('Sell Price', colX.price, y, { width: colWidths.price, align: 'right' });
    doc.text('Revenue', colX.revenue, y, { width: colWidths.revenue, align: 'right' });
    doc.text('Cost', colX.cost, y, { width: colWidths.cost, align: 'right' });
    doc.text('Profit', colX.profit, y, { width: colWidths.profit, align: 'right' });

    doc.moveTo(startX, y + 16).lineTo(553, y + 16).lineWidth(1).strokeColor('#E5E7EB').stroke();
    doc.y = y + 22;
  };

  drawTableHeader();

  // --- TABLE ROWS ---
  for (const record of records) {
    // Check space for page break
    if (doc.y > 730) {
      doc.addPage();
      drawTableHeader();
    }

    const currentY = doc.y;
    const sku = record.productId !== null ? skuByProductId.get(record.productId) ?? 'No SKU' : 'No SKU';
    const productName = record.productName ?? 'Product';

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1F2937');
    doc.text(productName, colX.product, currentY, { width: colWidths.product, lineBreak: true });
    
    doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
    doc.text(`SKU: ${sku}`, colX.product, doc.y, { width: colWidths.product });

    const rowHeight = Math.max(doc.y - currentY, 20);

    // Render other values perfectly aligned to same Y
    doc.font('Helvetica').fontSize(8.5).fillColor('#1F2937');
    doc.text(String(record.quantity), colX.qty, currentY, { width: colWidths.qty, align: 'right' });
    doc.text(record.sellingPrice.toLocaleString(), colX.price, currentY, { width: colWidths.price, align: 'right' });
    doc.text(record.revenue.toLocaleString(), colX.revenue, currentY, { width: colWidths.revenue, align: 'right' });
    doc.text(record.costOfGoods.toLocaleString(), colX.cost, currentY, { width: colWidths.cost, align: 'right' });
    doc.text(record.netProfit.toLocaleString(), colX.profit, currentY, { width: colWidths.profit, align: 'right' });

    // Set next row Y position
    doc.y = currentY + rowHeight + 8;

    // Row Bottom Border
    doc.moveTo(startX, doc.y - 4).lineTo(553, doc.y - 4).lineWidth(0.5).strokeColor('#F3F4F6').stroke();

    totalQuantity += record.quantity;
    totalRevenue += record.revenue;
    totalCost += record.costOfGoods;
    totalProfit += record.netProfit;
  }

  // --- TOTALS / SUMMARY ---
  if (records.length === 0) {
    doc.fontSize(10).fillColor('#6B7280').text('No sold products were recorded for this date.', startX, doc.y + 15);
  } else {
    doc.moveDown(0.5);
    const summaryY = doc.y;

    doc.moveTo(startX, summaryY).lineTo(553, summaryY).lineWidth(1.5).strokeColor('#111827').stroke();
    doc.y = summaryY + 12;

    const summaryX = 330;
    const summaryWidth = 223;

    doc.font('Helvetica').fontSize(9).fillColor('#374151');
    doc.text(`Total Units Sold:`, summaryX, doc.y, { width: 120 });
    doc.font('Helvetica-Bold').text(`${totalQuantity}`, summaryX + 120, doc.y, { width: summaryWidth - 120, align: 'right' });
    
    doc.moveDown(0.4);
    doc.font('Helvetica').text(`Total Revenue:`, summaryX, doc.y, { width: 120 });
    doc.font('Helvetica-Bold').text(`LKR ${Math.round(totalRevenue).toLocaleString()}`, summaryX + 120, doc.y, { width: summaryWidth - 120, align: 'right' });

    doc.moveDown(0.4);
    doc.font('Helvetica').text(`Total Cost:`, summaryX, doc.y, { width: 120 });
    doc.font('Helvetica-Bold').text(`LKR ${Math.round(totalCost).toLocaleString()}`, summaryX + 120, doc.y, { width: summaryWidth - 120, align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(summaryX, doc.y).lineTo(553, doc.y).lineWidth(0.5).strokeColor('#D1D5DB').stroke();
    doc.y += 6;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#059669');
    doc.text(`Net Profit:`, summaryX, doc.y, { width: 120 });
    doc.text(`LKR ${Math.round(totalProfit).toLocaleString()}`, summaryX + 120, doc.y, { width: summaryWidth - 120, align: 'right' });
  }

  doc.end();
}