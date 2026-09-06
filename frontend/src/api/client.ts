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
