// frontend/src/pages/RestockPlanPage.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, Download, PackageCheck, Printer, XCircle } from 'lucide-react';

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
    pendingOrderedQty: number;
    turnoverRank: string;
    supplierName: string;
    leadTimeDays: number;
    orderDeadlineDays: number;
    dailySalesVelocity: number;
}

interface PurchaseOrderItem {
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitCost: number;
}

interface PurchaseOrder {
    id: number;
    poNumber: string;
    supplierName: string;
    status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
    expectedDate: string;
    totalAmount: number;
    createdAt: string;
    receivedAt: string | null;
    items: PurchaseOrderItem[];
}

export const RestockPlanPage = () => {
    const [restockData, setRestockData] = useState<RestockItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingPO, setGeneratingPO] = useState(false);
    const [actionId, setActionId] = useState<number | null>(null);

    const loadData = async () => {
        const [restockResponse, ordersResponse] = await Promise.all([
            axios.get<RestockItem[]>('/api/restock-plan'),
            axios.get<PurchaseOrder[]>('/api/restock-plan/orders'),
        ]);
        setRestockData(restockResponse.data);
        setPurchaseOrders(ordersResponse.data);
        setSelectedIds((current) => current.filter((id) => restockResponse.data.some((item) => item.id === id)));
    };

    useEffect(() => {
        loadData()
            .catch((err) => console.error('Failed to load restock data:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleGeneratePO = async () => {
        const selectedItems = restockData.filter((item) => selectedIds.includes(item.id));
        if (selectedItems.length === 0) return;
        setGeneratingPO(true);
        try {
            const response = await axios.post(
                '/api/restock-plan/generate-po',
                { restockItems: selectedItems },
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
            await loadData();
        } catch (error) {
            console.error('Failed to generate POs:', error);
            alert('Failed to generate Purchase Orders. Please try again.');
        } finally {
            setGeneratingPO(false);
        }
    };

    const toggleSelection = (productId: number) => {
        setSelectedIds((current) => current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId]);
    };

    const toggleAll = () => {
        setSelectedIds((current) => current.length === restockData.length ? [] : restockData.map((item) => item.id));
    };

    const updatePurchaseOrder = async (id: number, action: 'receive' | 'cancel') => {
        setActionId(id);
        try {
            await axios.post(`/api/restock-plan/orders/${id}/${action}`);
            await loadData();
        } catch (error) {
            console.error(`Failed to ${action} purchase order:`, error);
            alert(`Failed to ${action} purchase order. Please try again.`);
        } finally {
            setActionId(null);
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
                        disabled={generatingPO || selectedIds.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all text-white ${generatingPO ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        <Download size={18} />
                        {generatingPO ? 'Generating ZIP...' : `Generate POs (${selectedIds.length})`}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="p-4">Rank</th>
                                <th className="p-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={restockData.length > 0 && selectedIds.length === restockData.length}
                                        onChange={toggleAll}
                                        aria-label="Select all restock items"
                                    />
                                </th>
                                <th className="p-4">Product Details</th>
                                <th className="p-4">Supplier</th>
                                <th className="p-4 text-center">Stock Level</th>
                                <th className="p-4 text-center">Suggest Qty</th>
                                <th className="p-4 text-center">Order Deadline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {restockData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center">
                                        <PackageCheck className="mx-auto mb-3 text-emerald-500" size={32} />
                                        <p className="font-semibold text-gray-700">Stock levels are healthy</p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            No new purchase orders are needed. Existing purchase orders have already covered the restock requirements.
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {restockData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggleSelection(item.id)}
                                            aria-label={`Select ${item.name}`}
                                        />
                                    </td>
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
                                            {item.pendingOrderedQty > 0 && (
                                                <span className="text-[10px] text-indigo-600 mt-1">On order: {item.pendingOrderedQty}</span>
                                            )}
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

            <section className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Purchase Orders</h2>
                        <p className="text-sm text-gray-500">Track pending orders and update stock when deliveries arrive.</p>
                    </div>
                    <span className="text-sm text-gray-500">{purchaseOrders.length} total</span>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">PO Number</th>
                                    <th className="p-4">Supplier</th>
                                    <th className="p-4">Items</th>
                                    <th className="p-4">Expected</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {purchaseOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="p-4 font-semibold text-gray-800">{order.poNumber}</td>
                                        <td className="p-4 text-gray-700">{order.supplierName}</td>
                                        <td className="p-4 text-gray-600">{order.items.reduce((total, item) => total + item.quantity, 0)} units</td>
                                        <td className="p-4 text-gray-600">{new Date(order.expectedDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-right font-medium">LKR {order.totalAmount.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : order.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {order.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => updatePurchaseOrder(order.id, 'receive')}
                                                        disabled={actionId === order.id}
                                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <PackageCheck size={14} /> Receive
                                                    </button>
                                                    <button
                                                        onClick={() => updatePurchaseOrder(order.id, 'cancel')}
                                                        disabled={actionId === order.id}
                                                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        <XCircle size={14} /> Cancel
                                                    </button>
                                                </div>
                                            )}
                                            {order.status === 'RECEIVED' && <CheckCircle className="ml-auto text-emerald-600" size={18} />}
                                        </td>
                                    </tr>
                                ))}
                                {purchaseOrders.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No purchase orders yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};
