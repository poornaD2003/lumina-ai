import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { FinancialOverview } from '../../types';

interface Props {
  data: FinancialOverview[];
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = parseInt(month, 10) - 1;
  return `${months[m] ?? month} ${year.slice(2)}`;
}

function formatValue(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function FinancialChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatPeriod(d.period),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Overview</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                revenue: 'Revenue',
                expenses: 'Expenses',
                cogs: 'COGS',
                netProfit: 'Net Profit',
              };
              return [formatValue(Number(value)), labels[String(name)] ?? String(name)];
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              fontSize: 12,
            }}
          />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                revenue: 'Revenue',
                expenses: 'Expenses',
                cogs: 'COGS',
                netProfit: 'Net Profit',
              };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={14} />
          <Bar dataKey="cogs" fill="#94a3b8" radius={[3, 3, 0, 0]} barSize={14} />
          <Line
            type="monotone"
            dataKey="netProfit"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
