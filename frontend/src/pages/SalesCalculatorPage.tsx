import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import { fetchDailyNetProfit, fetchPricingProducts, saveDailyNetProfit } from '../api/client';
import type { DailyNetProfit, DailyProductProfit, PricingProduct } from '../types';

interface SaleEntry {
  id: number;
  date: string;
  productId: number;
  quantity: number;
  sellingPrice: number;
}

const today = new Date().toISOString().slice(0, 10);

function formatCurrency(value: number) {
  return `LKR ${Math.round(value).toLocaleString()}`;
}

export default function SalesCalculatorPage() {
  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [history, setHistory] = useState<DailyNetProfit[]>([]);
  const [unsavedDates, setUnsavedDates] = useState<string[]>([]);
  const [date, setDate] = useState(today);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPricingProducts(), fetchDailyNetProfit()])
      .then(([loadedProducts, loadedHistory]) => {
        setProducts(loadedProducts);
        setHistory(loadedHistory);
        if (loadedProducts[0]) {
          setProductId(String(loadedProducts[0].id));
          setSellingPrice(String(loadedProducts[0].unitPrice));
        }
      })
      .catch(() => setError('Unable to load products for the calculator.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedProduct = products.find((product) => product.id === Number(productId));

  const sessionDailyProfit = useMemo(() => {
    const totals = new Map<string, { revenue: number; cost: number; netProfit: number }>();

    entries.forEach((entry) => {
      const product = products.find((item) => item.id === entry.productId);
      if (!product) return;
      const revenue = entry.quantity * entry.sellingPrice;
      const cost = entry.quantity * product.costPrice;
      const current = totals.get(entry.date) ?? { revenue: 0, cost: 0, netProfit: 0 };
      totals.set(entry.date, {
        revenue: current.revenue + revenue,
        cost: current.cost + cost,
        netProfit: current.netProfit + revenue - cost,
      });
    });

    return Array.from(totals.entries())
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([entryDate, totalsForDay]) => ({
        date: entryDate,
        ...totalsForDay,
      }));
  }, [entries, products]);

  const dailyProfit = useMemo(() => {
    const merged = new Map(history.map((item) => [item.date, item]));
    sessionDailyProfit.forEach((item) => {
      if (!unsavedDates.includes(item.date)) return;
      const existing = merged.get(item.date);
      merged.set(item.date, {
        date: item.date,
        revenue: (existing?.revenue ?? 0) + item.revenue,
        costOfGoods: (existing?.costOfGoods ?? 0) + item.cost,
        netProfit: (existing?.netProfit ?? 0) + item.netProfit,
      });
    });
    return Array.from(merged.values()).sort((first, second) => first.date.localeCompare(second.date));
  }, [history, sessionDailyProfit, unsavedDates]);

  const totals = useMemo(
    () => entries.reduce(
      (summary, entry) => {
        const product = products.find((item) => item.id === entry.productId);
        if (!product) return summary;
        const revenue = entry.quantity * entry.sellingPrice;
        const cost = entry.quantity * product.costPrice;
        return {
          quantity: summary.quantity + entry.quantity,
          revenue: summary.revenue + revenue,
          cost: summary.cost + cost,
          netProfit: summary.netProfit + revenue - cost,
        };
      },
      { quantity: 0, revenue: 0, cost: 0, netProfit: 0 },
    ),
    [entries, products],
  );

  const handleProductChange = (value: string) => {
    setProductId(value);
    const product = products.find((item) => item.id === Number(value));
    if (product) setSellingPrice(String(product.unitPrice));
  };

  const persistProductSale = async (
    entryDate: string,
    product: PricingProduct,
    quantityDelta: number,
    revenueDelta: number,
    costDelta: number,
  ) => {
    await saveDailyNetProfit({
      date: entryDate,
      productId: product.id,
      productName: product.name,
      quantity: quantityDelta,
      sellingPrice: product.unitPrice,
      unitCost: product.costPrice,
      revenue: revenueDelta,
      costOfGoods: costDelta,
      netProfit: revenueDelta - costDelta,
    } as DailyProductProfit);
    setHistory((currentHistory) => {
      const existing = currentHistory.find((item) => item.date === entryDate);
      const updated = {
        date: entryDate,
        revenue: (existing?.revenue ?? 0) + revenueDelta,
        costOfGoods: (existing?.costOfGoods ?? 0) + costDelta,
        netProfit: (existing?.netProfit ?? 0) + revenueDelta - costDelta,
      };
      return [
        ...currentHistory.filter((item) => item.date !== entryDate),
        updated,
      ].sort((first, second) => first.date.localeCompare(second.date));
    });
    setUnsavedDates((dates) => dates.filter((savedDate) => savedDate !== entryDate));
  };

  const addEntry = async () => {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(sellingPrice);
    if (!date || !selectedProduct || parsedQuantity <= 0 || parsedPrice <= 0) return;

    const nextEntries = [
      ...entries,
      {
        id: Date.now(),
        date,
        productId: selectedProduct.id,
        quantity: parsedQuantity,
        sellingPrice: parsedPrice,
      },
    ];
    setEntries(nextEntries);
    const revenue = parsedQuantity * parsedPrice;
    const costOfGoods = parsedQuantity * selectedProduct.costPrice;
    try {
      await persistProductSale(date, selectedProduct, parsedQuantity, revenue, costOfGoods);
      setError(null);
    } catch {
      setUnsavedDates((dates) => dates.includes(date) ? dates : [...dates, date]);
      setError('Sale calculated locally, but the daily profit could not be saved.');
    }
    setQuantity('1');
  };

  const removeEntry = async (entryId: number, entryDate: string) => {
    const removedEntry = entries.find((entry) => entry.id === entryId);
    if (!removedEntry) return;
    const nextEntries = entries.filter((entry) => entry.id !== entryId);
    setEntries(nextEntries);
    const product = products.find((item) => item.id === removedEntry.productId);
    if (!product) return;
    try {
      await persistProductSale(
        entryDate,
        product,
        -removedEntry.quantity,
        -(removedEntry.quantity * removedEntry.sellingPrice),
        -(removedEntry.quantity * (product?.costPrice ?? 0)),
      );
    } catch {
      setUnsavedDates((dates) => dates.includes(entryDate) ? dates : [...dates, entryDate]);
      setError('Sale removed locally, but the daily profit history could not be updated.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sales &amp; Profit Calculator</h1>
        <p className="mt-0.5 text-sm text-gray-500">Add daily sales manually and track net profit from your selling price.</p>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Add a sale</h2>
            <p className="text-xs text-gray-500">Select a product, enter quantity, and set the actual selling price.</p>
          </div>
          <Plus className="text-emerald-600" size={20} />
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:items-end">
          <label className="text-xs font-medium text-gray-600">
            Sale date
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" />
          </label>
          <label className="text-xs font-medium text-gray-600 md:col-span-2">
            Product
            <select value={productId} onChange={(event) => handleProductChange(event.target.value)} disabled={loading} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Quantity
            <input min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Selling price (LKR)
            <input min="0" step="100" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} type="number" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Product cost: {selectedProduct ? formatCurrency(selectedProduct.costPrice) : 'Select a product'}</p>
          <button type="button" onClick={addEntry} disabled={loading || !selectedProduct} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={16} /> Add sale
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Units sold', totals.quantity.toLocaleString(), 'text-gray-900'],
          ['Total revenue', formatCurrency(totals.revenue), 'text-blue-600'],
          ['Total cost', formatCurrency(totals.cost), 'text-amber-600'],
          ['Net profit', formatCurrency(totals.netProfit), totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Net profit by day</h2>
          {dailyProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyProfit} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}K`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name === 'netProfit' ? 'Net profit' : String(name)]} />
                <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="flex h-70 items-center justify-center text-sm text-gray-400">Add sales to see the daily profit chart.</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700">Manual sales</h2>
            <span className="text-xs text-gray-400">{entries.length} entries</span>
          </div>
          <div className="max-h-70 overflow-auto">
            {entries.length === 0 ? <p className="p-5 text-sm text-gray-400">No sales added yet.</p> : entries.map((entry) => {
              const product = products.find((item) => item.id === entry.productId);
              const profit = entry.quantity * (entry.sellingPrice - (product?.costPrice ?? 0));
              return <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-gray-50 p-4 last:border-0">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{product?.name}</p><p className="text-xs text-gray-500">{entry.date} · {entry.quantity} × {formatCurrency(entry.sellingPrice)}</p></div>
                <div className="flex items-center gap-3"><span className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(profit)}</span><button type="button" aria-label={`Remove ${product?.name}`} onClick={() => removeEntry(entry.id, entry.date)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></div>
              </div>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}