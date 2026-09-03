import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const DynamicPricingPage: React.FC = () => {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [usdRate, setUsdRate] = useState<number>(300);

    const fetchPricing = async () => {
        try {
            const res = await axios.get(`/api/pricing/suggestions?usdRate=${usdRate}`);
            setSuggestions(res.data.suggestions);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPricing();
    }, [usdRate]);

    const handleUpdatePrice = async (productId: number, newPrice: number) => {
        try {
            await axios.post('/api/pricing/apply', { productId, newPrice });
            alert('Price updated in database!');
            fetchPricing();
        } catch (err) {
            alert('Failed to update');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-xl font-bold text-gray-800">Dynamic Pricing (No DB Change)</h1>

                {/* Input for USD Rate */}
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">USD Rate (LKR):</label>
                    <input
                        type="number"
                        value={usdRate}
                        onChange={(e) => setUsdRate(Number(e.target.value))}
                        className="border p-2 rounded w-28 text-center font-bold"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                            <th className="p-4">Product Name</th>
                            <th className="p-4">Current Price</th>
                            <th className="p-4">Suggested Price</th>
                            <th className="p-4">Suggested Discount</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suggestions.map((item) => (
                            <tr key={item.productId} className="border-t hover:bg-gray-50">
                                <td className="p-4 font-medium">{item.productName}</td>
                                <td className="p-4">LKR {item.currentPrice.toLocaleString()}</td>
                                <td className="p-4 font-bold text-emerald-600">
                                    LKR {item.suggestedPrice.toLocaleString()}
                                </td>
                                <td className="p-4">
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-bold">
                                        {item.suggestedDiscount}% OFF
                                    </span>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleUpdatePrice(item.productId, item.suggestedPrice)}
                                        className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                                    >
                                        Apply Price
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};