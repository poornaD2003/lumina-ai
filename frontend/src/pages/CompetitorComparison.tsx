// frontend/src/components/CompetitorComparison.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, ExternalLink, TrendingUp, AlertCircle, Search, SlidersHorizontal } from 'lucide-react';


interface Competitor {
  storeName: string;
  price: number;
  productTitle: string;
  url: string;
  isLive: boolean;
}

interface AISuggestion {
  suggestedPrice: number;
  recommendedMarginPercent: number;
  reasoning: string;
}

interface Props {
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    costPrice: number;
    unitPrice: number;
  };
}

type PricingProduct = Props['product'];

export const CompetitorComparisonPage: React.FC = () => {
  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await axios.get<{ products: PricingProduct[] }>('/api/pricing/products');
        setProducts(response.data.products);
      } catch (err) {
        console.error('Failed to load products for comparison', err);
        setError('Unable to load products for competitor comparison.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading products...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (products.length === 0) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No products found.</div>;

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const filteredProducts = products.filter((product) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = !query || [product.name, product.brand, product.category].some((value) =>
      value.toLowerCase().includes(query),
    );

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl bg-slate-900 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Market intelligence</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Competitor comparison</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">See how your prices sit against live retailer results and make sharper pricing decisions.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {filteredProducts.length} of {products.length} products
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:p-5">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Search size={13} /> Find product</span>
          <div className="relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, brand, or category"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </label>
        <label className="w-full sm:w-52">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><SlidersHorizontal size={13} /> Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filteredProducts.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredProducts.map((product) => (
            <CompetitorComparisonCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No products match the selected filters.
        </p>
      )}
    </div>
  );
};

export const CompetitorComparisonCard: React.FC<Props> = ({ product }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [aiResult, setAiResult] = useState<AISuggestion | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const fetchAnalysis = async () => {
    if (!product.name || product.costPrice <= 0 || product.unitPrice <= 0) {
      return;
    }

    setLoading(true);
    setHasAnalyzed(true);
    try {
        console.log('Sending product data:', product);
      const response = await axios.post('/api/pricing/analyze', {
        productName: product.name,
        brand: product.brand,
        category: product.category,
        costPrice: product.costPrice,
        currentPrice: product.unitPrice,
      });

      if (response.data.success) {
        setCompetitors(response.data.competitors);
        setAiResult(response.data.aiSuggestion);
      }
    } catch (err) {
      console.error('Failed to fetch pricing comparison', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-800">{product.name}</h3>
          <p className="mt-1 text-xs text-slate-500">Cost: LKR {product.costPrice.toLocaleString()} <span className="px-1 text-slate-300">|</span> Current: LKR {product.unitPrice.toLocaleString()}</p>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="inline-flex w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:px-3 sm:py-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {competitors.length > 0 && (
        <>
          {/* Competitor Market Comparison Badge & Table Section */}
          <div className="mt-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                <TrendingUp className="w-3.5 h-3.5" /> Competitor Market Comparison
              </span>
              <span className="text-xs text-slate-400">Live retailer results</span>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-100 sm:block">
              <table className="w-full min-w-130 text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase">
                  <tr>
                    <th className="p-2.5">Store</th>
                    <th className="p-2.5">Scraped Product Title</th>
                    <th className="p-2.5 text-right">Market Price</th>
                    <th className="p-2.5 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {competitors.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900">{comp.storeName}</td>
                      <td className="p-2.5 text-xs text-slate-500 truncate max-w-50">
                        <a href={comp.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {comp.productTitle} <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-800">
                        LKR {comp.price.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="text-xs font-semibold text-emerald-700">Live</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 sm:hidden">
              {competitors.map((comp, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{comp.storeName}</p>
                      <a href={comp.url} target="_blank" rel="noreferrer" className="mt-1 flex items-start gap-1 text-xs text-slate-500 hover:text-emerald-700">
                        <span className="line-clamp-2">{comp.productTitle}</span><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-800">LKR {comp.price.toLocaleString()}</p>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Live source</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommended Price Badge Section */}
          {aiResult && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                  Gemini AI Recommended Selling Price
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-2.5 py-0.5 rounded-md">
                  +{aiResult.recommendedMarginPercent}% Margin
                </span>
              </div>
              <div className="mb-1 text-2xl font-black text-emerald-900">
                LKR {aiResult.suggestedPrice?.toLocaleString()}
              </div>
              <p className="text-xs text-emerald-700 flex items-start gap-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {aiResult.reasoning}
              </p>
            </div>
          )}
        </>
      )}

      {!loading && hasAnalyzed && competitors.length === 0 && (
        <p className="mt-4 border-t pt-4 text-sm text-slate-500">
          No live prices were returned by the retailers for this product. Try the analysis again later.
        </p>
      )}
    </article>
  );
};