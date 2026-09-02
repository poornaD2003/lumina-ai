/**
 * Forecast service - linear-regression extrapolation of monthly revenue.
 *
 * Fits a least-squares line (simple-statistics) over the historical monthly
 * revenue series and projects it `monthsAhead` months into the future. The
 * returned series contains every historical month (with both actual and
 * predicted values, so the fitted trend is visible) followed by the future
 * months (predicted only).
 */
import { linearRegression, linearRegressionLine } from 'simple-statistics';
import { prisma } from './prisma.js';
import type { ForecastPoint } from '../types/index.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Monthly revenue for every month that has sales, oldest first. */
async function getMonthlyRevenue(): Promise<Array<{ period: string; revenue: number }>> {
  const rows = await prisma.$queryRaw<Array<{ period: string; revenue: number }>>`
    SELECT
      strftime('%Y-%m', saleDate) AS period,
      SUM(totalAmount) AS revenue
    FROM Sale
    GROUP BY period
    ORDER BY period ASC`;

  return rows.map((row) => ({ period: row.period, revenue: Number(row.revenue) }));
}

/** Adds `add` months to a "YYYY-MM" period string, keeping zero-padding. */
function addMonths(period: string, add: number): string {
  const [year, month] = period.split('-').map(Number);
  const total = year * 12 + (month - 1) + add;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export async function getSalesForecast(monthsAhead = 3): Promise<ForecastPoint[]> {
  const history = await getMonthlyRevenue();
  if (history.length === 0) {
    return [];
  }

  // Fit y = m*x + b where x is the month index (0 = oldest month).
  const regression = linearRegression(history.map((point, index) => [index, point.revenue]));
  const predict = linearRegressionLine(regression);
  const clampAtZero = (value: number): number => round2(Math.max(0, value));

  const points: ForecastPoint[] = history.map((point, index) => ({
    period: point.period,
    actual: round2(point.revenue),
    predicted: clampAtZero(predict(index)),
  }));

  // Extrapolate past the last historical month.
  const lastPeriod = history[history.length - 1].period;
  for (let i = 1; i <= monthsAhead; i++) {
    points.push({
      period: addMonths(lastPeriod, i),
      predicted: clampAtZero(predict(history.length - 1 + i)),
    });
  }

  return points;
}
