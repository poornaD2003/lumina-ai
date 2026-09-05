import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { GoogleGenAI } from '@google/genai';
import { fetchRealCompetitorPrices } from '../services/scraperService';



const getAI = (): GoogleGenAI | null => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    if (!apiKey.startsWith('AQ') && !apiKey.startsWith('AIza')) return null;
    return new GoogleGenAI({ apiKey });
};

type AISuggestion = {
    suggestedPrice: number;
    recommendedMarginPercent: number;
    reasoning: string;
};

export const getCompetitorAndAISuggestion = async (req: Request, res: Response) => {
    
  try {
    console.log('Incoming Analyze Payload:', req.body); 
    const { productName, costPrice, currentPrice, brand, category } = req.body;

        if (!productName || !Number.isFinite(Number(costPrice)) || !Number.isFinite(Number(currentPrice))) {
            return res.status(400).json({ success: false, message: 'Product name, cost price, and current price are required' });
        }

        if (!productName || costPrice === undefined || currentPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product name, cost price, and current price are required.',
      });
    }

   
    const scrapedCompetitors = await fetchRealCompetitorPrices(productName);

 
    const competitorData = scrapedCompetitors.filter((c) => c.price >= Number(costPrice) * 0.25);

    const competitorSummary = competitorData
      .map((c) => `${c.storeName}: LKR ${c.price.toLocaleString()}`)
      .join(', ');

    const prompt = `
      You are an expert Sri Lankan Tech Market Pricing Strategist for a computer store.
      
      Product Details:
      - Item: ${productName} (${brand} - ${category})
      - Our Cost Price: LKR ${costPrice}
      - Current Selling Price: LKR ${currentPrice}
      - Scraped Competitor Prices: ${competitorSummary}

      Tasks:
      1. Analyze competitor pricing and cost price.
      2. Provide a competitive, profitable selling price for Sri Lankan market in LKR.
      3. Give a concise 2-sentence rationale.

      Respond STRICTLY in JSON:
      {
        "suggestedPrice": number,
        "recommendedMarginPercent": number,
        "reasoning": "string"
      }
    `;

        let aiOutput: AISuggestion;
        try {
            const ai = getAI();
            if (!ai) throw new Error('GEMINI_API_KEY is not configured');
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' },
            });
            aiOutput = JSON.parse(response.text || '{}') as AISuggestion;
            if (!aiOutput.suggestedPrice) throw new Error('AI returned no suggested price');
        } catch (error) {
            if (getAI()) {
                console.warn('AI competitor analysis unavailable, using market benchmark:', error);
            } else {
                console.warn('GEMINI_API_KEY is not configured; using market benchmark.');
            }
            const averageMarketPrice = competitorData.length > 0
                ? competitorData.reduce((total, competitor) => total + competitor.price, 0) / competitorData.length
                : Number(costPrice) * 1.15;
            const suggestedPrice = Math.round(Math.max(Number(costPrice) * 1.15, averageMarketPrice) / 500) * 500;
            aiOutput = {
                suggestedPrice,
                recommendedMarginPercent: Math.round(((suggestedPrice - Number(costPrice)) / suggestedPrice) * 100),
                reasoning: 'Gemini is temporarily unavailable. Price is based on the current competitor benchmark and a minimum 15% margin over cost.',
            };
        }

    return res.status(200).json({
      success: true,
      competitors: competitorData,
      aiSuggestion: aiOutput,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPricingProducts = async (_req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                brand: true,
                category: true,
                costPrice: true,
                unitPrice: true,
            },
            orderBy: { name: 'asc' },
        });

        return res.json({ products });
    } catch (error) {
        console.error('Failed to load pricing products:', error);
        return res.status(500).json({ error: 'Failed to load products' });
    }
};

type PricingProduct = {
    id: number;
    name: string;
    brand: string;
    category: string;
    costPrice: number;
    unitPrice: number;
    aiSuggestedPrice?: number | null;
    aiPricingReason?: string | null;
};

const createFallbackSuggestion = (product: PricingProduct) => {
    const suggestedPrice = Math.round((product.costPrice * 1.15) / 500) * 500;
    return {
        suggestedPrice,
        recommendedMarginPercent: 15,
        reasoning: 'AI pricing is temporarily unavailable. Suggested using a standard 15% margin over cost price.',
    };
};

// backend/src/Controlller/pricingController.ts

const generateAISuggestion = async (product: PricingProduct, marketCompetitorPrices: string[]) => {
    const ai = getAI();
    if (!ai) throw new Error('GEMINI_API_KEY is not configured');
    const competitorInfo = marketCompetitorPrices.length > 0
        ? marketCompetitorPrices.join(', ')
        : 'Market Average is strictly based on current Sri Lankan tech store retail rates.';

    const prompt = `
      You are an expert Sri Lankan Tech Market Pricing Strategist for a computer store ("Lumina").
      
      Product Context:
      - Name: ${product.name}
      - Brand: ${product.brand}
      - Category: ${product.category}
      - Cost Price (Wholesale/Imported): LKR ${product.costPrice}
      - Current Selling Price: LKR ${product.unitPrice}
      - Market Competitor Data: ${competitorInfo}

      CRITICAL PRICING RULES FOR SRI LANKAN COMPUTER MARKET:
      1. REAL-WORLD BENCHMARKS (Sri Lanka Retail Market Context):
         - Entry/Mid Laptops (e.g., Acer Aspire 5, Dell Inspiron i5): Retail price MUST range around LKR 150,000 - LKR 240,000 depending on specs.
         - Gaming Laptops (e.g., ASUS ROG, Helios 300): Retail price MUST range around LKR 300,000 - LKR 600,000+.
         - Business Laptops (e.g., Latitude, ExpertBook): Retail price ranges from LKR 200,000 to LKR 400,000+.
      
      2. MARGIN & PROFITABILITY CALCULATION:
         - If the stored Wholesale Cost Price (${product.costPrice}) is unrealistically low for a laptop category (e.g., < LKR 100,000), prioritize market retail standards and adjust suggested price while providing minimum 10%-15% profit margin over actual wholesale cost.
         - Round off the final suggested price in LKR to clean thousands (e.g., 185,000 or 189,900).

      Respond ONLY with a valid JSON object strictly adhering to this structure:
      {"suggestedPrice": number, "recommendedMarginPercent": number, "reasoning": "A concise 2-sentence explanation comparing the specs and real Sri Lankan retail market trends."}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
    });

    const responseText = response.text;
    if (!responseText) throw new Error('No response from Gemini API');

    const aiResult = JSON.parse(responseText) as {
        suggestedPrice: number;
        recommendedMarginPercent: number;
        reasoning: string;
    };

    if (!aiResult.suggestedPrice) throw new Error('Failed to generate AI price suggestion');
    return aiResult;
};

export const suggestProductPrice = async (req: Request, res: Response) => {
    try {
        console.log('Incoming Payload:', req.body);
        const { productId, marketCompetitorPrices } = req.body;

        if (productId === undefined || productId === null || isNaN(Number(productId))) {
            return res.status(400).json({ error: 'Valid Product ID is required' });
        }


        const numericId = Number(productId);

        // 1. Fetch Product details from Database
        const product = await prisma.product.findUnique({
            where: { id: numericId },
        });

        if (!product) {
            return res.status(404).json({ error: `Product with ID ${productId} not found` });
        }

        const aiResult = await generateAISuggestion(
            product,
            marketCompetitorPrices && Array.isArray(marketCompetitorPrices) ? marketCompetitorPrices : [],
        );

        // 5. Update Database with Gemini Suggestions
        const updatedProduct = await prisma.product.update({
            where: { id: product.id },
            data: {
                aiSuggestedPrice: aiResult.suggestedPrice,
                aiPricingReason: aiResult.reasoning,
            },
        });

        return res.json({
            productId: updatedProduct.id,
            productName: updatedProduct.name,
            costPrice: updatedProduct.costPrice,
            currentUnitPrice: updatedProduct.unitPrice,
            aiSuggestedPrice: aiResult.suggestedPrice,
            recommendedMarginPercent: aiResult.recommendedMarginPercent,
            reasoning: aiResult.reasoning,
        });

    } catch (error) {
        console.error('Error in Gemini Price Suggestion:', error);
        return res.status(500).json({ error: 'Internal server error while evaluating price' });
    }
};

// Route to Accept & Apply Suggested Price
export const applySuggestedPrice = async (req: Request, res: Response) => {
    try {
        const { productId, newPrice } = req.body;

        const updated = await prisma.product.update({
            where: { id: Number(productId) },
            data: {
                unitPrice: Number(newPrice),
            },
        });

        return res.json({ message: 'Price updated successfully', product: updated });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update price' });
    }
};

export const suggestAllProductPrices = async (_req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
        const suggestions: Array<{
            productId: number;
            productName: string;
            currentPrice: number;
            aiSuggestedPrice: number;
            recommendedMarginPercent: number;
            reasoning: string;
        }> = [];
        for (const product of products) {
            const liveCompetitors = await fetchRealCompetitorPrices(product.name);
            const competitorPrices = liveCompetitors.map(
                (competitor) => `${competitor.storeName}: LKR ${competitor.price.toLocaleString()}`,
            );
            let aiResult;
            try {
                aiResult = await generateAISuggestion(product, competitorPrices);
            } catch (error) {
                console.error(`AI pricing failed for product ${product.id}:`, error);
                aiResult = product.aiSuggestedPrice
                    ? {
                        suggestedPrice: product.aiSuggestedPrice,
                        recommendedMarginPercent: 15,
                        reasoning: product.aiPricingReason ?? 'Previously generated AI price suggestion.',
                    }
                    : createFallbackSuggestion(product);
            }
            const updatedProduct = await prisma.product.update({
                where: { id: product.id },
                data: { aiSuggestedPrice: aiResult.suggestedPrice, aiPricingReason: aiResult.reasoning },
            });
            suggestions.push({
                productId: updatedProduct.id,
                productName: updatedProduct.name,
                currentPrice: updatedProduct.unitPrice,
                aiSuggestedPrice: aiResult.suggestedPrice,
                recommendedMarginPercent: aiResult.recommendedMarginPercent,
                reasoning: aiResult.reasoning,
            });
        }
        return res.json({ suggestions });
    } catch (error) {
        console.error('Error generating AI prices for all products:', error);
        return res.status(500).json({ error: 'Failed to generate AI price suggestions' });
    }
};