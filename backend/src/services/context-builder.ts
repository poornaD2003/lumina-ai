/**
 * Context builder - selectively fetches relevant business data based on the
 * user's question and formats it as compact text for the AI prompt.
 */
import * as analytics from './analytics.js';
import { getSalesForecast } from './forecast.js';

const TOPIC_KEYWORDS: Record<string, string[]> = {
  sales: ['sales', 'revenue', 'orders', 'sell', 'sold', 'income', 'earnings'],
  forecast: ['forecast', 'predict', 'projection', 'future', 'trend', 'next month', 'next quarter'],
  customer: ['customer', 'client', 'segment', 'churn', 'retention', 'lifetime', 'ltv', 'acquisition'],
  product: ['product', 'inventory', 'stock', 'item', 'sku', 'best seller', 'top selling'],
  financial: ['financial', 'profit', 'loss', 'expense', 'cost', 'margin', 'budget', 'p&l', 'pnl'],
  region: ['region', 'north', 'south', 'east', 'west', 'geographic', 'location', 'area'],
};

const fmtCurrency = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export async function detectTopics(question: string): Promise<string[]> {
  const lower = question.toLowerCase();
  const matched: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(topic);
    }
  }
  return matched;
}

export async function buildContext(question: string): Promise<string> {
  const topics = await detectTopics(question);
  const parts: string[] = [];

  const kpis = await analytics.getKPIs();
  parts.push(
    `=== Key Metrics ===\n` +
    `Total Revenue: ${fmtCurrency(kpis.totalRevenue)} | Active Customers: ${kpis.activeCustomers} | ` +
    `Total Orders: ${kpis.totalOrders.toLocaleString()} | Avg Order: ${fmtCurrency(kpis.avgOrderValue)} | ` +
    `Top Product: ${kpis.topProduct} | Top Region: ${kpis.topRegion}`,
  );

  if (topics.length === 0) {
    const sales = await analytics.getSalesSummary(3);
    if (sales.length > 0) {
      const lines = sales.map((s) => `  ${s.period}: ${fmtCurrency(s.totalRevenue)} (${s.orderCount} orders)`);
      parts.push(`=== Recent Sales ===\n${lines.join('\n')}`);
    }
    return parts.join('\n\n');
  }

  if (topics.includes('sales')) {
    const sales = await analytics.getSalesSummary(6);
    if (sales.length > 0) {
      const lines = sales.map(
        (s) => `  ${s.period}: ${fmtCurrency(s.totalRevenue)} | ${s.orderCount} orders | avg ${fmtCurrency(s.avgOrderValue)}`,
      );
      parts.push(`=== Sales Summary (last 6 months) ===\n${lines.join('\n')}`);
    }
  }

  if (topics.includes('forecast')) {
    const forecast = await getSalesForecast(3);
    if (forecast.length > 0) {
      const future = forecast.filter((f) => !f.actual);
      const recent = forecast.filter((f) => f.actual).slice(-3);
      const lines: string[] = [];
      if (recent.length > 0) {
        lines.push('  Recent (actual vs predicted):');
        recent.forEach((f) => lines.push(`    ${f.period}: actual ${fmtCurrency(f.actual!)} | predicted ${fmtCurrency(f.predicted)}`));
      }
      if (future.length > 0) {
        lines.push('  Forecast:');
        future.forEach((f) => lines.push(`    ${f.period}: ${fmtCurrency(f.predicted)}`));
      }
      parts.push(`=== Sales Forecast ===\n${lines.join('\n')}`);
    }
  }

  if (topics.includes('customer')) {
    const segments = await analytics.getCustomerSegments();
    if (segments.length > 0) {
      const lines = segments.map(
        (s) => `  ${s.segment}: ${s.count} customers | LTV avg ${fmtCurrency(s.avgLTV)} | revenue ${fmtCurrency(s.totalRevenue)}`,
      );
      parts.push(`=== Customer Segments ===\n${lines.join('\n')}`);
    }
  }

  if (topics.includes('product')) {
    const products = await analytics.getProductPerformance(5);
    if (products.length > 0) {
      const lines = products.map(
        (p, i) => `  ${i + 1}. ${p.productName} - ${fmtCurrency(p.totalRevenue)} (${p.totalSold} units, ${p.margin}% margin)`,
      );
      parts.push(`=== Top Products by Revenue ===\n${lines.join('\n')}`);
    }
  }

  if (topics.includes('financial')) {
    const financials = await analytics.getFinancialOverview(6);
    if (financials.length > 0) {
      const lines = financials.map(
        (f) => `  ${f.period}: rev ${fmtCurrency(f.revenue)} | exp ${fmtCurrency(f.expenses)} | COGS ${fmtCurrency(f.cogs)} | net ${fmtCurrency(f.netProfit)}`,
      );
      parts.push(`=== Financial Overview (last 6 months) ===\n${lines.join('\n')}`);
    }
  }

  if (topics.includes('region')) {
    const regions = await analytics.getSalesByRegion();
    if (regions.length > 0) {
      const lines = regions.map(
        (r) => `  ${r.region}: ${fmtCurrency(r.totalRevenue)} (${r.orderCount} orders)`,
      );
      parts.push(`=== Sales by Region ===\n${lines.join('\n')}`);
    }
  }

  return parts.join('\n\n');
}
