import { AlertTriangle, DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  fetchKPIs,
  fetchSalesSummary,
  fetchCustomerSegments,
  fetchProductPerformance,
  fetchFinancialOverview,
  fetchSalesForecast,
  fetchDailyNetProfit,
  fetchInventoryAlerts,
} from '../api/client';
import KPICard from '../components/dashboard/KPICard';
import SalesChart from '../components/dashboard/SalesChart';
import ForecastChart from '../components/dashboard/ForecastChart';
import CustomerChart from '../components/dashboard/CustomerChart';
import ProductChart from '../components/dashboard/ProductChart';
import FinancialChart from '../components/dashboard/FinancialChart';
import DailyNetProfitChart from '../components/dashboard/DailyNetProfitChart';

function fmtCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtCount(value: number) {
  return value.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
  );
}

function ChartState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-80 flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <p className="flex flex-1 items-center justify-center text-sm text-gray-400">{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const kpis = useAnalytics('kpis', fetchKPIs);
  const sales = useAnalytics('sales-summary', fetchSalesSummary);
  const forecast = useAnalytics('forecast', fetchSalesForecast);
  const segments = useAnalytics('segments', fetchCustomerSegments);
  const products = useAnalytics('products', fetchProductPerformance);
  const financials = useAnalytics('financials', fetchFinancialOverview);
  const dailyNetProfit = useAnalytics('daily-net-profit', fetchDailyNetProfit);
  const inventoryAlerts = useAnalytics('inventory-alerts', fetchInventoryAlerts);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Lumina Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Illuminating your key business metrics
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : kpis.data ? (
          <>
            <KPICard
              title="Total Revenue"
              value={fmtCurrency(kpis.data.totalRevenue)}
              icon={DollarSign}
              color="blue"
            />
            <KPICard
              title="Active Customers"
              value={fmtCount(kpis.data.activeCustomers)}
              icon={Users}
              color="green"
            />
            <KPICard
              title="Total Orders"
              value={fmtCount(kpis.data.totalOrders)}
              icon={ShoppingCart}
              color="purple"
            />
            <KPICard
              title="Avg Order Value"
              value={fmtCurrency(kpis.data.avgOrderValue)}
              icon={TrendingUp}
              color="amber"
            />
          </>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <AlertTriangle size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-amber-950">Stock notifications</h2>
              <p className="text-xs text-amber-800">Products at or below their reorder level</p>
            </div>
          </div>
          <Link to="/restock-plan" className="text-xs font-semibold text-amber-800 hover:text-amber-950">
            Open restock plan
          </Link>
        </div>
        {inventoryAlerts.isLoading ? (
          <p className="px-5 py-4 text-sm text-amber-800">Checking stock levels...</p>
        ) : inventoryAlerts.isError ? (
          <p className="px-5 py-4 text-sm text-red-700">Unable to load stock notifications.</p>
        ) : inventoryAlerts.data?.length ? (
          <div className="divide-y divide-amber-200">
            {inventoryAlerts.data.map((alert) => (
              <div key={alert.sku} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-amber-950">{alert.productName}</p>
                  <p className="text-xs text-amber-800">SKU {alert.sku} · Reorder at {alert.reorderLevel} units</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${alert.stockQuantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  {alert.stockQuantity === 0 ? 'Out of stock' : `${alert.stockQuantity} left`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-emerald-700">All products are above their reorder levels.</p>
        )}
      </section>

      {/* Core analytics: always keep the four requested dashboard views visible. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sales.isLoading ? (
          <Skeleton className="h-80" />
        ) : sales.isError ? (
          <ChartState title="Sales Trend" message="Unable to load sales trend data." />
        ) : sales.data ? (
          <SalesChart data={sales.data} />
        ) : (
          <ChartState title="Sales Trend" message="No sales trend data yet." />
        )}

        {forecast.isLoading ? (
          <Skeleton className="h-80" />
        ) : forecast.isError ? (
          <ChartState title="Sales Forecast" message="Unable to load sales forecast data." />
        ) : forecast.data ? (
          <ForecastChart data={forecast.data} />
        ) : (
          <ChartState title="Sales Forecast" message="No sales forecast data yet." />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.isLoading ? (
          <Skeleton className="h-80" />
        ) : products.isError ? (
          <ChartState title="Top Products by Revenue" message="Unable to load product revenue data." />
        ) : products.data ? (
          <ProductChart data={products.data} />
        ) : (
          <ChartState title="Top Products by Revenue" message="No product revenue data yet." />
        )}

        {financials.isLoading ? (
          <Skeleton className="h-80" />
        ) : financials.isError ? (
          <ChartState title="Financial Overview" message="Unable to load financial overview data." />
        ) : financials.data ? (
          <FinancialChart data={financials.data} />
        ) : (
          <ChartState title="Financial Overview" message="No financial overview data yet." />
        )}
      </div>

      {/* Supporting analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {segments.isLoading ? (
          <Skeleton className="h-80" />
        ) : segments.data ? (
          <CustomerChart data={segments.data} />
        ) : (
          <ChartState title="Customer Segments" message="No customer segment data yet." />
        )}

        {dailyNetProfit.isLoading ? (
          <Skeleton className="h-80" />
        ) : dailyNetProfit.data ? (
          <DailyNetProfitChart data={dailyNetProfit.data} />
        ) : (
          <ChartState title="Daily Net Profit History" message="No daily profit data yet." />
        )}
      </div>
    </div>
  );
}