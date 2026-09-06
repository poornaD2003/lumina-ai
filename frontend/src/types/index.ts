export interface KPIData {
  totalRevenue: number;
  activeCustomers: number;
  totalOrders: number;
  avgOrderValue: number;
  topProduct: string;
  topRegion: string;
}

export interface SalesSummary {
  period: string;
  totalRevenue: number;
  totalQuantity: number;
  avgOrderValue: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  totalLTV: number;
  avgLTV: number;
  totalRevenue: number;
}

export interface ProductPerformance {
  productName: string;
  totalSold: number;
  totalRevenue: number;
  margin: number;
}

export interface FinancialOverview {
  period: string;
  revenue: number;
  expenses: number;
  cogs: number;
  netProfit: number;
}

export interface ForecastPoint {
  period: string;
  actual?: number;
  predicted: number;
}

export interface RegionSales {
  region: string;
  totalRevenue: number;
  orderCount: number;
}

export interface InventoryAlert {
  productName: string;
  sku: string;
  stockQuantity: number;
  reorderLevel: number;
}
export interface PricingProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  costPrice: number;
  unitPrice: number;
}

export interface DailyNetProfit {
  date: string;
  revenue: number;
  costOfGoods: number;
  netProfit: number;
}

export interface PricingProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  costPrice: number;
  unitPrice: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'ai' | 'fallback';
}

export interface DailyProductProfit extends DailyNetProfit {
  productId: number;
  productName: string;
  quantity: number;
  sellingPrice: number;
  unitCost: number;
}