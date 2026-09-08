import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, ScanLine, UploadCloud } from 'lucide-react';
import { approveSupplierInvoice, fetchInvoiceOptions, type InvoiceOptions, type SupplierInvoice, uploadSupplierInvoice } from '../api/client';

type EditableItem = SupplierInvoice['items'][number] & { productId: number | null };

const money = (value: number) => `LKR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function InvoiceUploadPage() {
  const [options, setOptions] = useState<InvoiceOptions>({ suppliers: [], products: [] });
  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [fileName, setFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    fetchInvoiceOptions().then(setOptions).catch(() => setMessage({ type: 'error', text: 'Could not load products and suppliers.' }));
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0), [items]);
  const needsReview = items.some((item) => !item.productId || (item.confidence ?? 0) < 0.85 || Math.abs(item.quantity * item.unitPrice - item.totalAmount) > 0.01);
  const canApprove = Boolean(invoice && supplierId && items.length && items.every((item) => item.productId && item.quantity > 0 && item.unitPrice >= 0 && item.totalAmount >= 0 && Math.abs(item.quantity * item.unitPrice - item.totalAmount) <= 0.01));

  const handleFile = async (file: File) => {
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Choose a PDF, JPG, PNG, or WEBP invoice.' });
      return;
    }
    setProcessing(true);
    setMessage(null);
    setFileName(file.name);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const result = await uploadSupplierInvoice({ fileName: file.name, fileType: file.type, data });
      setInvoice(result);
      setItems(result.items);
      setSupplierId(result.supplierId ?? '');
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.error ?? 'Unable to extract this invoice.' });
    } finally {
      setProcessing(false);
    }
  };

  const updateItem = (id: number, field: keyof EditableItem, value: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: field === 'productId' ? (value ? Number(value) : null) : field === 'productName' ? value : Number(value) } : item));
  };

  const approve = async () => {
    if (!invoice || !supplierId || !canApprove) return;
    setApproving(true);
    setMessage(null);
    try {
      await approveSupplierInvoice(invoice.id, { supplierId: Number(supplierId), items: items.map(({ id, productId, quantity, unitPrice, totalAmount }) => ({ id, productId: Number(productId), quantity, unitPrice, totalAmount })) });
      setInvoice({ ...invoice, status: 'APPROVED' });
      setMessage({ type: 'success', text: 'Invoice approved and a pending purchase order was created.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.error ?? 'Unable to approve invoice.' });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl bg-slate-900 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Purchasing workflow</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload supplier invoice</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Extract supplier, products, quantities, unit prices, and totals from PDFs or handwritten photos. Review every line before creating a purchase order.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40">
          <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
          {processing ? <LoaderCircle className="mb-3 animate-spin text-emerald-600" size={30} /> : <UploadCloud className="mb-3 text-emerald-600" size={30} />}
          <span className="text-sm font-semibold text-slate-800">{processing ? 'Reading invoice...' : fileName || 'Choose an invoice file'}</span>
          <span className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, or WEBP up to 12 MB</span>
        </label>
      </section>

      {message && <div className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><AlertTriangle size={18} className="mt-0.5 shrink-0" />{message.text}</div>}

      {invoice && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
            <div>
              <div className="flex items-center gap-2"><ScanLine size={18} className="text-emerald-600" /><h2 className="text-lg font-bold text-slate-900">Review extracted details</h2></div>
              <p className="mt-1 text-xs text-slate-500">Invoice {invoice.invoiceNumber || 'number not detected'} · OCR confidence {Math.round((invoice.ocrConfidence ?? 0) * 100)}%</p>
            </div>
            {invoice.status === 'APPROVED' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Approved</span>}
          </div>
          <div className="grid gap-4 border-b border-slate-100 px-5 py-5 sm:grid-cols-2 sm:px-7">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value ? Number(event.target.value) : '')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                <option value="">Select supplier</option>{options.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detected invoice total</p><p className="mt-1 text-lg font-bold text-slate-900">{money(total)}</p></div>
          </div>
          {needsReview && <div className="mx-5 mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:mx-7"><AlertTriangle size={16} className="mt-0.5 shrink-0" />Low-confidence matches or arithmetic differences need correction before approval.</div>}
          <div className="space-y-3 p-5 sm:p-7">
            {items.map((item) => <div key={item.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1.6fr)_100px_130px_130px] sm:items-end">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product
                <select value={item.productId ?? ''} onChange={(event) => updateItem(item.id, 'productId', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"><option value="">Unmatched: {item.productName}</option>{options.products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}</select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity<input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-normal tracking-normal text-slate-800" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit price<input type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-normal tracking-normal text-slate-800" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total amount<input type="number" min="0" value={item.totalAmount} onChange={(event) => updateItem(item.id, 'totalAmount', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-normal tracking-normal text-slate-800" /></label>
            </div>)}
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-sm text-slate-500">Total to purchase: <strong className="text-slate-900">{money(total)}</strong></p><button disabled={!canApprove || approving || invoice.status !== 'REVIEW'} onClick={approve} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto">{approving ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} {invoice.status === 'APPROVED' ? 'Approved' : 'Approve and create PO'}</button></div>
        </section>
      )}
    </div>
  );
}