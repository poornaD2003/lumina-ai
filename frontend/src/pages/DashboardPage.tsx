import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  fetchKPIs,
  fetchSalesSummary,
  fetchCustomerSegments,
  fetchProductPerformance,
  fetchFinancialOverview,
  fetchSalesForecast,
  fetchDailyNetProfit,
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

export default function DashboardPage() {
  const kpis = useAnalytics('kpis', fetchKPIs);
  const sales = useAnalytics('sales-summary', fetchSalesSummary);
  const forecast = useAnalytics('forecast', fetchSalesForecast);
  const segments = useAnalytics('segments', fetchCustomerSegments);
  const products = useAnalytics('products', fetchProductPerformance);
  const financials = useAnalytics('financials', fetchFinancialOverview);
  const dailyNetProfit = useAnalytics('daily-net-profit', fetchDailyNetProfit);

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

      {/* Row 2: Sales + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sales.isLoading ? (
          <Skeleton className="h-80" />
        ) : sales.data ? (
          <SalesChart data={sales.data} />
        ) : null}

        {forecast.isLoading ? (
          <Skeleton className="h-80" />
        ) : forecast.data ? (
          <ForecastChart data={forecast.data} />
        ) : null}
      </div>

      {/* Row 3: Customers + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {segments.isLoading ? (
          <Skeleton className="h-80" />
        ) : segments.data ? (
          <CustomerChart data={segments.data} />
        ) : null}

        {products.isLoading ? (
          <Skeleton className="h-80" />
        ) : products.data ? (
          <ProductChart data={products.data} />
        ) : null}
      </div>

      {/* Row 4: Financial */}
      {financials.isLoading ? (
        <Skeleton className="h-80" />
      ) : financials.data ? (
        <FinancialChart data={financials.data} />
      ) : null}

      {dailyNetProfit.isLoading ? (
        <Skeleton className="h-80" />
      ) : dailyNetProfit.data ? (
        <DailyNetProfitChart data={dailyNetProfit.data} />
      ) : null}
    </div>
  );
}