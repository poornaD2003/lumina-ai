// frontend/src/pages/RestockPlanPage.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Clock, Download, Printer } from 'lucide-react';

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
    supplierName: string;
    leadTimeDays: number;
    orderDeadlineDays: number;
    dailySalesVelocity: number;
}

export const RestockPlanPage = () => {
    const [restockData, setRestockData] = useState<RestockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingPO, setGeneratingPO] = useState(false);

    useEffect(() => {
        axios
            .get('/api/restock-plan')
            .then((res) => {
                setRestockData(res.data);
                setLoading(false);
            })
            .catch((err) => console.error(err));
    }, []);

    const handleGeneratePO = async () => {
        setGeneratingPO(true);
        try {
            const response = await axios.post(
                'http://localhost:3001/api/restock-plan/generate-po',
                { restockItems: restockData },
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Purchase_Orders.zip');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate POs:', error);
            alert('Failed to generate Purchase Orders. Please try again.');
        } finally {
            setGeneratingPO(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-500 font-medium">Loading Restock Plan...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Smart Stock Restock Plan</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        AI-driven restock recommendations based on 90-day sales velocity and supplier lead times.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Printer size={18} />
                        Print
                    </button>
                    <button
                        onClick={handleGeneratePO}
                        disabled={generatingPO || restockData.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-white ${generatingPO ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        <Download size={18} />
                        {generatingPO ? 'Generating ZIP...' : 'Confirm & Generate POs'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="p-4">Rank</th>
                                <th className="p-4">Product Details</th>
                                <th className="p-4">Supplier</th>
                                <th className="p-4 text-center">Stock Level</th>
                                <th className="p-4 text-center">Suggest Qty</th>
                                <th className="p-4 text-center">Order Deadline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {restockData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    {/* Turnover Rank Badge */}
                                    <td className="p-4 font-bold text-emerald-600">
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                                            {item.turnoverRank}
                                        </span>
                                    </td>

                                    {/* Product Name & Brand */}
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-800">{item.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {item.brand} • {item.category} • Margin: <span className="font-semibold text-emerald-600">{item.profitMargin}%</span>
                                        </div>
                                    </td>

                                    {/* Supplier Details */}
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{item.supplierName}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Lead Time: {item.leadTimeDays} days</div>
                                    </td>

                                    {/* Current Stock */}
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span
                                                className={`font-semibold px-2.5 py-1 rounded-full text-xs ${item.currentStock <= item.reorderLevel
                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}
                                            >
                                                {item.currentStock} / {item.reorderLevel}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1">Vel: {item.dailySalesVelocity}/day</span>
                                        </div>
                                    </td>

                                    {/* Suggested Restock Quantity */}
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg border border-blue-200">
                                            +{item.suggestedRestock}
                                        </span>
                                    </td>

                                    {/* Order Deadline */}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center">
                                            {item.orderDeadlineDays <= 0 ? (
                                                <span className="flex items-center gap-1.5 text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-md border border-red-200 shadow-sm">
                                                    <AlertCircle size={15} /> ASAP
                                                </span>
                                            ) : item.orderDeadlineDays <= 7 ? (
                                                <span className="flex items-center gap-1.5 text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                                                    <Clock size={15} /> {item.orderDeadlineDays} Days
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                                    {item.orderDeadlineDays} Days
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
