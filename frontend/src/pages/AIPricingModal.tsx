// frontend/src/components/AIPricingModal.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface AIPricingModalProps {
    productId: number;
    productName: string;
    currentPrice: number;
    costPrice: number;
    onClose: () => void;
    onPriceUpdated: () => void;
}

export const AIPricingModal: React.FC<AIPricingModalProps> = ({
    productId,
    productName,
    currentPrice,
    costPrice,
    onClose,
    onPriceUpdated,
}) => {
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<{
        aiSuggestedPrice: number;
        recommendedMarginPercent: number;
        reasoning: string;
    } | null>(null);

    const handleFetchAISuggestion = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/pricing/suggest-price', {
                productId: Number(productId), // Number එකක් ලෙස යැවීම තහවුරු කරන්න
                marketCompetitorPrices: [
                    `Competitor A: LKR ${costPrice * 1.12}`,
                    `Competitor B: LKR ${costPrice * 1.15}`,
                ],
            });
            setSuggestion(response.data);
        } catch (error) {
            console.error('Error fetching AI pricing:', error);
            alert('Failed to get AI price suggestion');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPrice = async () => {
        if (!suggestion) return;
        try {
            await axios.post('/api/pricing/apply-price', {
                productId,
                newPrice: suggestion.aiSuggestedPrice,
            });
            alert('New price applied successfully!');
            onPriceUpdated();
            onClose();
        } catch (error) {
            alert('Failed to update price');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    AI Smart Pricing: {productName}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Cost Price: <span className="font-semibold">LKR {costPrice.toLocaleString()}</span> |
                    Current Price: <span className="font-semibold">LKR {currentPrice.toLocaleString()}</span>
                </p>

                {!suggestion ? (
                    <button
                        onClick={handleFetchAISuggestion}
                        disabled={loading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
                    >
                        {loading ? 'Analyzing Market & Calculating...' : 'Generate AI Price Suggestion'}
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="text-sm text-emerald-800 font-semibold">Suggested Selling Price:</div>
                            <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                                LKR {suggestion.aiSuggestedPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-emerald-700 mt-1">
                                Estimated Margin: {suggestion.recommendedMarginPercent}%
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">
                            <span className="font-bold">AI Analysis: </span>
                            {suggestion.reasoning}
                        </div>

                        <div className="flex justify-end space-x-3 pt-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyPrice}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
                            >
                                Apply AI Price
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};