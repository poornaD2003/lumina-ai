// backend/src/services/pricingService.ts

export const calculateDynamicPrice = (
    product: {
        id: number;
        name: string;
        unitPrice: number;     // Current Selling Price
        costPriceLKR: number;  // Current Cost
    },
    usdRate: number = 300,
    competitorPrice: number | null = null,
    targetMarginPercentage: number = 15
) => {
    // 1. New Cost (If USD changes, estimate new cost based on dollar fluctuation)
    const updatedCostLKR = product.costPriceLKR;

    // 2. Base Target Price with Profit Margin
    let baseSuggestedPrice = updatedCostLKR * (1 + targetMarginPercentage / 100);
    let suggestedDiscount = 0;
    let reason = 'Standard Margin Calculation';

    // 3. Competitor Price Comparison Logic
    if (competitorPrice && competitorPrice > 0) {
        if (competitorPrice < baseSuggestedPrice) {
            baseSuggestedPrice = competitorPrice - 1000; // Rs. 1000 lower than competitor
            reason = 'Matched Competitor Market Price';
        } else if (competitorPrice > baseSuggestedPrice) {
            const difference = competitorPrice - baseSuggestedPrice;
            suggestedDiscount = Math.round((difference / competitorPrice) * 100);
            baseSuggestedPrice = competitorPrice; // Set base to competitor price and offer discount
            reason = 'Market competitor price is higher. Added discount campaign.';
        }
    }

    // Round to nearest 500 LKR
    const finalSuggestedPrice = Math.round(baseSuggestedPrice / 500) * 500;
    const profitMargin = ((finalSuggestedPrice * (1 - suggestedDiscount / 100) - updatedCostLKR) / finalSuggestedPrice) * 100;

    return {
        productId: product.id,
        productName: product.name,
        currentPrice: product.unitPrice,
        suggestedPrice: finalSuggestedPrice,
        costPriceLKR: updatedCostLKR,
        competitorPrice,
        suggestedDiscount,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        reason,
    };
};