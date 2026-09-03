// frontend/src/pages/RestockPlanPage.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

interface RestockItem {
    id: number;
    name: string;
    brand: string;
    category: string;
    currentStock: number;
    reorderLevel: number;
    costPrice: number;
    unitPrice: number;
    totalSold: number;
    profitMargin: number;
    suggestedRestock: number;
    turnoverRank: string;
}

export const RestockPlanPage = () => {
    const [restockData, setRestockData] = useState<RestockItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get('/api/restock-plan')
            .then((res) => {
                setRestockData(res.data);
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    if (loading) return <div className="p-6">Loading Restock Plan...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Smart Stock Restock Plan</h1>
                    <p className="text-sm text-gray-500">ඊළඟ මාසය සඳහා නිර්දේශිත Restock ලැයිස්තුව</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
                >
                    Export / Print Plan
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Rank</th>
                            <th className="p-4">Product Details</th>
                            <th className="p-4">Category</th>
                            <th className="p-4 text-center">Current Stock</th>
                            <th className="p-4 text-center">Total Sold</th>
                            <th className="p-4 text-right">Profit Margin</th>
                            <th className="p-4 text-center">Suggested Restock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {restockData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                {/* Turnover Rank Badge */}
                                <td className="p-4 font-bold text-emerald-600">
                                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                                        {item.turnoverRank}
                                    </span>
                                </td>

                                {/* Product Name & Brand */}
                                <td className="p-4">
                                    <div className="font-semibold text-gray-800">{item.name}</div>
                                    <div className="text-xs text-gray-400">{item.brand}</div>
                                </td>

                                {/* Category */}
                                <td className="p-4 text-gray-600">{item.category}</td>

                                {/* Current Stock */}
                                <td className="p-4 text-center">
                                    <span
                                        className={`font-semibold px-2 py-1 rounded-full text-xs ${item.currentStock <= item.reorderLevel
                                            ? 'bg-red-100 text-red-600'
                                            : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {item.currentStock} Units
                                    </span>
                                </td>

                                {/* Total Sold */}
                                <td className="p-4 text-center font-medium text-gray-700">
                                    {item.totalSold}
                                </td>

                                {/* Profit Margin */}
                                <td className="p-4 text-right">
                                    <span className="font-bold text-gray-800">{item.profitMargin}%</span>
                                    <div className="text-xs text-gray-400">
                                        LKR {(item.unitPrice - item.costPrice).toLocaleString()}
                                    </div>
                                </td>

                                {/* Suggested Restock Quantity */}
                                <td className="p-4 text-center">
                                    <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg border border-blue-200">
                                        +{item.suggestedRestock} Units
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
