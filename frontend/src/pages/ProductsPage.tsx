import { useEffect, useState } from 'react';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { createProduct, fetchProducts, updateProduct } from '../api/client';
import type { Product } from '../types';

type ProductForm = Omit<Product, 'id'>;
const emptyForm: ProductForm = {
  name: '', sku: '', brand: '', category: '', processor: '', ram: '', storage: '', displaySize: '',
  unitPrice: 0, costPrice: 0, stockQuantity: 0, reorderLevel: 5, warrantyMonths: 12,
};

const fields: Array<{ key: keyof ProductForm; label: string; type?: string }> = [
  { key: 'name', label: 'Product name' }, { key: 'sku', label: 'SKU' }, { key: 'brand', label: 'Brand' }, { key: 'category', label: 'Category' },
  { key: 'processor', label: 'Processor' }, { key: 'ram', label: 'RAM' }, { key: 'storage', label: 'Storage' }, { key: 'displaySize', label: 'Display size' },
  { key: 'costPrice', label: 'Cost price (LKR)', type: 'number' }, { key: 'unitPrice', label: 'Selling price (LKR)', type: 'number' },
  { key: 'stockQuantity', label: 'Stock quantity', type: 'number' }, { key: 'reorderLevel', label: 'Reorder level', type: 'number' }, { key: 'warrantyMonths', label: 'Warranty (months)', type: 'number' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => fetchProducts().then(setProducts).catch(() => setError('Unable to load products.'));
  useEffect(() => { load(); }, []);

  const change = (key: keyof ProductForm, value: string) => setForm((current) => ({ ...current, [key]: typeof current[key] === 'number' ? Number(value) : value }));
  const edit = (product: Product) => { setEditingId(product.id); setForm({ ...product, processor: product.processor ?? '', ram: product.ram ?? '', storage: product.storage ?? '', displaySize: product.displaySize ?? '' }); setMessage(''); };
  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      if (editingId === null) await createProduct(form); else await updateProduct(editingId, form);
      await load(); reset(); setMessage(editingId === null ? 'Product added.' : 'Product updated.');
    } catch (requestError: any) { setError(requestError.response?.data?.error ?? 'Unable to save product.'); }
  };

  return <div className="flex flex-col gap-6">
    <div><h1 className="text-xl font-semibold text-gray-900">Product maintenance</h1><p className="mt-0.5 text-sm text-gray-500">Add products and keep pricing, stock, and specifications current.</p></div>
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-800">{editingId === null ? 'Add new product' : 'Update product'}</h2>{editingId === null ? <Plus className="text-emerald-600" size={20} /> : <Pencil className="text-blue-600" size={20} />}</div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}{message && <p className="mb-4 text-sm text-emerald-600">{message}</p>}
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ key, label, type }) => <label key={key} className="text-xs font-medium text-gray-600">{label}<input required={['name', 'sku', 'brand', 'category'].includes(key)} type={type ?? 'text'} min={type === 'number' ? 0 : undefined} value={String(form[key])} onChange={(event) => change(key, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" /></label>)}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Save size={16} /> {editingId === null ? 'Add product' : 'Save changes'}</button>{editingId !== null && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"><X size={16} /> Cancel</button>}</div>
      </form>
    </section>
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 p-5"><h2 className="text-sm font-semibold text-gray-700">Products <span className="font-normal text-gray-400">({products.length})</span></h2></div><div className="overflow-x-auto"><table className="w-full min-w-190 text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="p-4">Product</th><th className="p-4">SKU</th><th className="p-4">Category</th><th className="p-4">Cost</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4"></th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-gray-100"><td className="p-4 font-medium text-gray-800">{product.name}<span className="block text-xs font-normal text-gray-400">{product.brand}</span></td><td className="p-4 text-gray-500">{product.sku}</td><td className="p-4 text-gray-500">{product.category}</td><td className="p-4">LKR {product.costPrice.toLocaleString()}</td><td className="p-4">LKR {product.unitPrice.toLocaleString()}</td><td className={`p-4 ${product.stockQuantity <= product.reorderLevel ? 'font-semibold text-amber-600' : 'text-gray-600'}`}>{product.stockQuantity}</td><td className="p-4 text-right"><button type="button" onClick={() => edit(product)} aria-label={`Edit ${product.name}`} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button></td></tr>)}</tbody></table></div></section>
  </div>;
}