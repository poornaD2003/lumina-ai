// backend/src/Controlller/purchaseOrderController.ts
import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';

// CJS / ESM interop compatibility fix
const archiver = require('archiver');

export const generatePurchaseOrders = async (req: Request, res: Response) => {
    try {
        const { restockItems } = req.body;

        if (!restockItems || !Array.isArray(restockItems) || restockItems.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // Group items by supplier
        const itemsBySupplier = restockItems.reduce((acc: any, item: any) => {
            const supplier = item.supplierName || 'Unknown Supplier';
            if (!acc[supplier]) acc[supplier] = [];
            acc[supplier].push(item);
            return acc;
        }, {});

        // Response Headers for ZIP Download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Purchase_Orders.zip"');

        // Create Archiver instance
        const archive = archiver('zip', {
            zlib: { level: 9 },
        });

        archive.on('error', (err: any) => {
            console.error('Archiver Error:', err);
            throw err;
        });

        // Pipe ZIP stream directly to Express response
        archive.pipe(res);

        for (const [supplier, items] of Object.entries(itemsBySupplier)) {
            const doc = new PDFDocument({ margin: 50 });
            const filename = `PO_${supplier.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Append PDF stream to zip
            archive.append(doc, { name: filename });

            // PDF Content
            doc.fontSize(20).text('Lumina Laptop Store', { align: 'center' });
            doc.fontSize(12).text('123 Tech Avenue, Colombo 03, Sri Lanka', { align: 'center' });
            doc.moveDown();

            doc.fontSize(18).text('PURCHASE ORDER', { align: 'center', underline: true });
            doc.moveDown(2);

            doc.fontSize(12).text(`Supplier: ${supplier}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);

            const leadTime = (items as any[])[0]?.leadTimeDays || 7;
            const expectedDelivery = new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000);
            doc.text(`Expected Delivery Date: ${expectedDelivery.toLocaleDateString()} (${leadTime} days lead time)`);
            doc.moveDown(2);

            // Table Header
            let y = doc.y;
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('SKU / Product Name', 50, y, { width: 250 });
            doc.text('Category', 300, y, { width: 100 });
            doc.text('Qty', 400, y, { width: 50, align: 'right' });
            doc.text('Unit Cost (LKR)', 460, y, { width: 90, align: 'right' });

            y += 20;
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;

            doc.font('Helvetica');
            let totalAmount = 0;

            // Draw Items
            for (const item of (items as any[])) {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                const qty = item.suggestedRestock || 0;
                const cost = item.costPrice || 0;
                totalAmount += qty * cost;

                doc.text(item.name || 'Product', 50, y, { width: 250 });
                doc.text(item.category || 'General', 300, y, { width: 100 });
                doc.text(qty.toString(), 400, y, { width: 50, align: 'right' });
                doc.text(cost.toLocaleString(), 460, y, { width: 90, align: 'right' });

                y += 20;
            }

            y += 10;
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;

            doc.font('Helvetica-Bold');
            doc.text('Total Estimated Cost:', 300, y, { width: 150, align: 'right' });
            doc.text(totalAmount.toLocaleString(), 460, y, { width: 90, align: 'right' });

            // End PDF stream
            doc.end();
        }

        // Finalize Zip Stream
        await archive.finalize();

    } catch (error) {
        console.error('Error generating PO:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate Purchase Orders' });
        }
    }
};