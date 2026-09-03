import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateDynamicPrice } from '../services/pricingService';

export const getPricingSuggestions = async (req: Request, res: Response) => {
    try {
        // Query params වලින් USD Rate එක සහ target margin එක ලබාගැනීම
        const usdRate = parseFloat(req.query.usdRate as string) || 300;
        const targetMargin = parseFloat(req.query.targetMargin as string) || 15;

        const products = await prisma.product.findMany();

        const suggestions = products.map((product) =>
            calculateDynamicPrice({ id: product.id, name: product.name, unitPrice: product.unitPrice, costPriceLKR: product.costPrice }, usdRate, null, targetMargin)
        );

        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate dynamic pricing' });
    }
};

// Price එක විතරක් Update කිරීම (Existing Column)
export const applyPriceUpdate = async (req: Request, res: Response) => {
    try {
        const { productId, newPrice } = req.body;

        await prisma.product.update({
            where: { id: productId },
            data: { unitPrice: newPrice },
        });

        res.json({ message: 'Price updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update price' });
    }
};