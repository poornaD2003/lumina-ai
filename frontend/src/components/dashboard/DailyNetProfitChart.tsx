import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyNetProfit } from '../../types';

interface Props {
  data: DailyNetProfit[];
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `LKR ${(value / 1_000).toFixed(0)}K`;
  return `LKR ${value.toLocaleString()}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function DailyNetProfitChart({ data }: Props) {
  const chartData = data.map((item) => ({ ...item, label: formatDate(item.date) }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Daily Net Profit History</h3>
          <p className="mt-0.5 text-xs text-gray-400">Persisted daily sales profit records</p>
        </div>
        <span className="text-xs font-medium text-emerald-600">{data.length} days</span>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={68} />
            <Tooltip
              labelFormatter={(_, payload) => payload[0]?.payload.date ?? ''}
              formatter={(value) => [formatCurrency(Number(value)), 'Net profit']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex h-70 items-center justify-center text-sm text-gray-400">No daily profit records yet.</p>
      )}
    </div>
  );
}