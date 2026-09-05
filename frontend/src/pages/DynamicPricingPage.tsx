import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PricingSuggestion {
    productId: number;
    productName: string;
    currentPrice: number;
    aiSuggestedPrice: number;
    recommendedMarginPercent: number;
    reasoning: string;
}

export const DynamicPricingPage: React.FC = () => {
    const [suggestions, setSuggestions] = useState<PricingSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPricing = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get<{ suggestions: PricingSuggestion[] }>('/api/pricing/suggestions');
            setSuggestions(res.data.suggestions);
        } catch (err) {
            console.error(err);
            setError('Unable to generate AI price suggestions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPricing();
    }, []);

    const handleUpdatePrice = async (productId: number, newPrice: number) => {
        try {
            await axios.post('/api/pricing/apply-price', { productId, newPrice });
            alert('Price updated in database!');
            fetchPricing();
        } catch (err) {
            alert('Failed to update');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">AI Pricing Suggestions</h1>
                    <p className="text-sm text-gray-500">Fresh AI recommendations for every product</p>
                </div>
                <button onClick={fetchPricing} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    {loading ? 'Generating...' : 'Refresh AI Prices'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                            <th className="p-4">Product Name</th>
                            <th className="p-4">Current Price</th>
                            <th className="p-4">AI Suggested Price</th>
                            <th className="p-4">Recommended Margin</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suggestions.map((item) => (
                            <tr key={item.productId} className="border-t hover:bg-gray-50">
                                <td className="p-4 font-medium">{item.productName}</td>
                                <td className="p-4">LKR {item.currentPrice.toLocaleString()}</td>
                                <td className="p-4 font-bold text-emerald-600">
                                    LKR {item.aiSuggestedPrice.toLocaleString()}
                                </td>
                                <td className="p-4">
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-bold">
                                        {item.recommendedMarginPercent}% margin
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleUpdatePrice(item.productId, item.aiSuggestedPrice)}
                                        className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                                    >
                                        Apply Price
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && !error && suggestions.length === 0 && <p className="p-6 text-center text-gray-500">No products found.</p>}
            </div>
        </div>
    );
};