import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getRestockPlan = async (req: Request, res: Response) => {
    try {
        // Find the latest sale date to establish our "current" date relative to seed data
        const latestSale = await prisma.sale.findFirst({
            orderBy: { saleDate: 'desc' },
        });
        const latestDate = latestSale ? latestSale.saleDate : new Date();
        const ninetyDaysAgo = new Date(latestDate.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Quantities already covered by pending purchase orders, so the plan
        // never recommends ordering the same stock twice.
        const pendingItems = await prisma.purchaseOrderItem.findMany({
            where: { purchaseOrder: { status: 'PENDING' } },
            select: { productId: true, quantity: true },
        });
        const pendingByProduct = new Map<number, number>();
        for (const item of pendingItems) {
            pendingByProduct.set(
                item.productId,
                (pendingByProduct.get(item.productId) ?? 0) + item.quantity
            );
        }

        const products = await prisma.product.findMany({
            include: {
                sales: true,
                supplier: true,
            },
        });

        const restockPlan = products
            .map((product) => {
                const totalSold = product.sales.reduce(
                    (acc, item) => acc + item.quantity,
                    0
                );

                // Calculate 90-day sales velocity
                const recentSales = product.sales.filter(s => s.saleDate >= ninetyDaysAgo);
                const recentSoldUnits = recentSales.reduce((acc, item) => acc + item.quantity, 0);
                const dailySalesVelocity = recentSoldUnits / 90;

                // Lead time logic
                const leadTimeDays = product.supplier?.leadTimeDays ?? 7;
                const daysUntilStockout = dailySalesVelocity > 0 
                    ? product.stockQuantity / dailySalesVelocity 
                    : 999;
                
                const orderDeadlineDays = Math.ceil(daysUntilStockout - leadTimeDays);

                const profitMargin =
                    product.unitPrice > 0
                        ? ((product.unitPrice - product.costPrice) / product.unitPrice) * 100
                        : 0;

                const targetStock = product.reorderLevel * 2;
                const pendingOrderedQty = pendingByProduct.get(product.id) ?? 0;
                // Additional units still needed after subtracting what is
                // already on a pending purchase order.
                const suggestedRestock = Math.max(
                    0,
                    targetStock - product.stockQuantity - pendingOrderedQty
                );

                return {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    currentStock: product.stockQuantity,
                    reorderLevel: product.reorderLevel,
                    costPrice: product.costPrice,
                    unitPrice: product.unitPrice,
                    totalSold,
                    profitMargin: parseFloat(profitMargin.toFixed(1)),
                    suggestedRestock,
                    pendingOrderedQty,
                    supplierName: product.supplier?.name ?? 'Unknown Supplier',
                    leadTimeDays,
                    orderDeadlineDays,
                    dailySalesVelocity: parseFloat(dailySalesVelocity.toFixed(2)),
                };
            })
            .filter(
                (p) =>
                    p.suggestedRestock > 0 ||
                    (p.currentStock <= p.reorderLevel && p.pendingOrderedQty > 0)
            )
            .sort((a, b) => b.totalSold - a.totalSold)
            .map((item, index) => ({
                ...item,
                turnoverRank: `#${index + 1}`,
            }));

        res.json(restockPlan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch restock plan' });
    }
};