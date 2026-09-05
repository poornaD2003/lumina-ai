// frontend/src/components/CompetitorComparison.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';

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

  if (loading) return <div className="p-6 text-slate-600">Loading products...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (products.length === 0) return <div className="p-6 text-slate-600">No products found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Competitor Comparison</h1>
        <p className="text-sm text-slate-500">Compare each product with current market prices.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {products.map((product) => (
          <CompetitorComparisonCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export const CompetitorComparisonCard: React.FC<Props> = ({ product }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [aiResult, setAiResult] = useState<AISuggestion | null>(null);

  const fetchAnalysis = async () => {
    if (!product.name || product.costPrice <= 0 || product.unitPrice <= 0) {
      return;
    }

    setLoading(true);
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
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{product.name}</h3>
          <p className="text-xs text-slate-500">Cost: LKR {product.costPrice.toLocaleString()} | Current: LKR {product.unitPrice.toLocaleString()}</p>
        </div>
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing Market...' : 'Run Live Market Analysis'}
        </button>
      </div>

      {competitors.length > 0 && (
        <>
          {/* Competitor Market Comparison Badge & Table Section */}
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                <TrendingUp className="w-3.5 h-3.5" /> Competitor Market Comparison
              </span>
              <span className="text-xs text-slate-400">Live retailer results</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border border-slate-100 rounded-lg">
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
          </div>

          {/* AI Recommended Price Badge Section */}
          {aiResult && (
            <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                  Gemini AI Recommended Selling Price
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-2.5 py-0.5 rounded-md">
                  +{aiResult.recommendedMarginPercent}% Margin
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 mb-1">
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

      {!loading && competitors.length === 0 && (
        <p className="mt-4 border-t pt-4 text-sm text-slate-500">
          No live prices were returned by the retailers for this product. Try the analysis again later.
        </p>
      )}
    </div>
  );
};