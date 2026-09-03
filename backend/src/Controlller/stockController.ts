// backend/src/Controlller/stockController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // සාදාගත් prisma instance එක import කරන්න

export const getRestockPlan = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                sales: true,
            },
        });

        const restockPlan = products
            .map((product) => {
                const totalSold = product.sales.reduce(
                    (acc, item) => acc + item.quantity,
                    0
                );

                const profitMargin =
                    product.unitPrice > 0
                        ? ((product.unitPrice - product.costPrice) / product.unitPrice) * 100
                        : 0;

                const targetStock = product.reorderLevel * 2;
                const suggestedRestock = Math.max(0, targetStock - product.stockQuantity);

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
                };
            })
            .filter((p) => p.suggestedRestock > 0 || p.currentStock <= p.reorderLevel)
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