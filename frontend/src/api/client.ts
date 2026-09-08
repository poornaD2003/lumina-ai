import axios from 'axios';
import type {
  KPIData,
  SalesSummary,
  CustomerSegment,
  ProductPerformance,
  FinancialOverview,
  ForecastPoint,
  RegionSales,
  InventoryAlert,
  ChatMessage,
  PricingProduct,
  DailyNetProfit,
  DailyProductProfit,
  Product,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api` 
  : '/api';

const api = axios.create({ 
  baseURL: BASE_URL 
});
export const fetchKPIs = () =>
  api.get<KPIData>('/dashboard/kpis').then((r) => r.data);

export const fetchSalesSummary = () =>
  api.get<SalesSummary[]>('/dashboard/sales-summary').then((r) => r.data);

export const fetchCustomerSegments = () =>
  api.get<CustomerSegment[]>('/dashboard/customer-segments').then((r) => r.data);

export const fetchProductPerformance = () =>
  api.get<ProductPerformance[]>('/dashboard/product-performance').then((r) => r.data);

export const fetchFinancialOverview = () =>
  api.get<FinancialOverview[]>('/dashboard/financial-overview').then((r) => r.data);

export const fetchSalesForecast = () =>
  api.get<ForecastPoint[]>('/dashboard/sales-forecast').then((r) => r.data);

export const fetchSalesByRegion = () =>
  api.get<RegionSales[]>('/dashboard/sales-by-region').then((r) => r.data);

export const fetchInventoryAlerts = () =>
  api.get<InventoryAlert[]>('/dashboard/inventory-alerts').then((r) => r.data);

export const sendChatMessage = (
  message: string,
  history: Array<{ role: string; content: string }>
) =>
  api
    .post<{ answer: string; source: 'ai' | 'fallback' }>('/agent/chat', {
      message,
      history,
    })
    .then((r) => r.data);

export const fetchChatHistory = () =>
  api.get<ChatMessage[]>('/agent/history').then((r) => r.data);

export const clearChatHistory = () =>
  api.delete<{ success: boolean }>('/agent/history').then((r) => r.data);
export const fetchPricingProducts = () =>
  api.get<{ products: PricingProduct[] }>('/pricing/products').then((r) => r.data.products);

export const fetchDailyNetProfit = () =>
  api.get<DailyNetProfit[]>('/dashboard/daily-net-profit').then((r) => r.data);

export const saveDailyNetProfit = (record: DailyProductProfit) =>
  api.post<DailyProductProfit>('/dashboard/daily-net-profit', record).then((r) => r.data);

export const saveDailyNetProfitBatch = (records: DailyProductProfit[]) =>
  api.post<DailyNetProfit[]>('/dashboard/daily-net-profit/batch', { records }).then((r) => r.data);

export const fetchProducts = () => api.get<Product[]>('/products').then((r) => r.data);
export const createProduct = (product: Omit<Product, 'id'>) => api.post<Product>('/products', product).then((r) => r.data);
export const updateProduct = (id: number, product: Omit<Product, 'id'>) => api.put<Product>(`/products/${id}`, product).then((r) => r.data);

export interface InvoiceItem {
  id: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  confidence: number | null;
  product?: { id: number; name: string; sku: string } | null;
}

export interface SupplierInvoice {
  id: number;
  supplierId: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  fileName: string;
  status: string;
  invoiceTotal: number | null;
  ocrConfidence: number | null;
  supplier?: { id: number; name: string } | null;
  items: InvoiceItem[];
}

export interface InvoiceOptions {
  suppliers: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string; sku: string }>;
}

export const uploadSupplierInvoice = (payload: { fileName: string; fileType: string; data: string }) =>
  api.post<SupplierInvoice>('/invoices/upload', payload).then((r) => r.data);

export const fetchInvoiceOptions = () => api.get<InvoiceOptions>('/invoices/options').then((r) => r.data);

export const approveSupplierInvoice = (id: number, payload: { supplierId: number; items: Array<Pick<InvoiceItem, 'id' | 'productId' | 'quantity' | 'unitPrice' | 'totalAmount'> & { productId: number }> }) =>
  api.post(`/invoices/${id}/approve`, payload).then((r) => r.data);

export const downloadDailySalesPdf = async (date: string) => {
  const response = await api.get<Blob>('/daily-sales/pdf', {
    params: { date },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daily-sales-${date}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
