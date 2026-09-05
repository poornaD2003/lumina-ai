// backend/src/Controlller/purchaseOrderController.ts
import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';


const { ZipArchive } = require('archiver') as typeof import('archiver');

// Sequential PO numbers like PO-2026-0001. Cancelled orders keep their
// number, so counting all rows guarantees uniqueness.
const nextPoNumber = async (): Promise<string> => {
    const count = await prisma.purchaseOrder.count();
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
};

interface RestockItemInput {
    id?: number;
    name?: string;
    category?: string;
    supplierName?: string;
    leadTimeDays?: number;
    costPrice?: number;
    suggestedRestock?: number;
}

export const generatePurchaseOrders = async (req: Request, res: Response) => {
    try {
        const { restockItems } = req.body as { restockItems?: RestockItemInput[] };

        if (!restockItems || !Array.isArray(restockItems) || restockItems.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // Only orderable lines: a known product with a positive quantity.
        const orderLines = restockItems.filter(
            (item) => Number.isInteger(item.id) && (item.suggestedRestock ?? 0) > 0
        );
        if (orderLines.length === 0) {
            return res.status(400).json({ error: 'No items with a suggested restock quantity' });
        }

        const productIds = orderLines.map((item) => item.id as number);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { supplier: true },
        });
        const productById = new Map(products.map((product) => [product.id, product]));

        const lines = orderLines
            .map((item) => {
                const product = productById.get(item.id as number);
                if (!product) return null;
                return {
                    product,
                    quantity: item.suggestedRestock as number,
                    unitCost: item.costPrice ?? product.costPrice,
                    leadTimeDays: item.leadTimeDays ?? product.supplier?.leadTimeDays ?? 7,
                };
            })
            .filter((line): line is NonNullable<typeof line> => line !== null);

        if (lines.length === 0) {
            return res.status(400).json({ error: 'No valid products found for the provided items' });
        }

        // Group lines by supplier
        const linesBySupplier = new Map<string, typeof lines>();
        for (const line of lines) {
            const supplier = line.product.supplier?.name ?? 'Unknown Supplier';
            const group = linesBySupplier.get(supplier) ?? [];
            group.push(line);
            linesBySupplier.set(supplier, group);
        }

        // Persist the purchase orders first, so the store keeps a live record
        // of what is on order even if the ZIP download fails afterwards.
        const createdOrders = [];
        for (const [supplier, group] of linesBySupplier.entries()) {
            const totalAmount = group.reduce((acc, line) => acc + line.quantity * line.unitCost, 0);
            const maxLeadTime = Math.max(...group.map((line) => line.leadTimeDays));
            const poNumber = await nextPoNumber();

            const order = await prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    supplierName: supplier,
                    status: 'PENDING',
                    expectedDate: new Date(Date.now() + maxLeadTime * 24 * 60 * 60 * 1000),
                    totalAmount,
                    items: {
                        create: group.map((line) => ({
                            productId: line.product.id,
                            productName: line.product.name,
                            quantity: line.quantity,
                            unitCost: line.unitCost,
                        })),
                    },
                },
                include: { items: true },
            });
            createdOrders.push(order);
        }

        // Response Headers for ZIP Download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="Purchase_Orders.zip"');

        // Create Archiver instance
        const archive = new ZipArchive({
            zlib: { level: 9 },
        });

        archive.on('error', (err: any) => {
            console.error('Archiver Error:', err);
            // Throwing inside an event handler bypasses the surrounding
            // try/catch and would crash the process; fail the response instead.
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to generate Purchase Orders' });
            } else {
                res.destroy();
            }
        });

        // Pipe ZIP stream directly to Express response
        archive.pipe(res);

        // Build the PDFs from the persisted records (source of truth)
        for (const order of createdOrders) {
            const doc = new PDFDocument({ margin: 50 });
            const filename = `${order.poNumber}_${order.supplierName.replace(/\s+/g, '_')}.pdf`;

            // Append PDF stream to zip
            archive.append(doc, { name: filename });

            // PDF Content
            doc.fontSize(20).text('Lumina Laptop Store', { align: 'center' });
            doc.fontSize(12).text('123 Tech Avenue, Colombo 03, Sri Lanka', { align: 'center' });
            doc.moveDown();

            doc.fontSize(18).text('PURCHASE ORDER', { align: 'center', underline: true });
            doc.moveDown(2);

            doc.fontSize(12).text(`PO Number: ${order.poNumber}`);
            doc.text(`Supplier: ${order.supplierName}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);

            const leadTime = Math.ceil(
                (order.expectedDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            );
            const expectedDelivery = order.expectedDate;
            doc.text(`Expected Delivery Date: ${expectedDelivery.toLocaleDateString()} (${leadTime} days lead time)`);
            doc.text(`Status: PENDING`);
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
            for (const item of order.items) {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                const product = productById.get(item.productId);
                const qty = item.quantity;
                const cost = item.unitCost;
                totalAmount += qty * cost;

                doc.text(item.productName || 'Product', 50, y, { width: 250 });
                doc.text(product?.category ?? 'General', 300, y, { width: 100 });
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

export const listPurchaseOrders = async (_req: Request, res: Response) => {
    try {
        const orders = await prisma.purchaseOrder.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (error) {
        console.error('Error listing purchase orders:', error);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
};

export const receivePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'Invalid purchase order id' });
        }

        const order = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (order.status !== 'PENDING') {
            return res
                .status(409)
                .json({ error: `Purchase order is already ${order.status.toLowerCase()}` });
        }

        // Receiving closes the restock loop: every line item increases the
        // matching product's stock, and the order is marked RECEIVED.
        await prisma.$transaction([
            ...order.items.map((item) =>
                prisma.product.update({
                    where: { id: item.productId },
                    data: { stockQuantity: { increment: item.quantity } },
                })
            ),
            prisma.purchaseOrder.update({
                where: { id },
                data: { status: 'RECEIVED', receivedAt: new Date() },
            }),
        ]);

        res.json({ message: `Purchase order ${order.poNumber} received; stock updated` });
    } catch (error) {
        console.error('Error receiving purchase order:', error);
        res.status(500).json({ error: 'Failed to receive purchase order' });
    }
};

export const cancelPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'Invalid purchase order id' });
        }

        const order = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }
        if (order.status !== 'PENDING') {
            return res
                .status(409)
                .json({ error: `Purchase order is already ${order.status.toLowerCase()}` });
        }

        await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        res.json({ message: `Purchase order ${order.poNumber} cancelled` });
    } catch (error) {
        console.error('Error cancelling purchase order:', error);
        res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
};
