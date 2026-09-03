/**
 * Forecast service - Time Series Forecasting using Double Exponential Smoothing (Holt's Linear Trend).
 *
 * This method captures both the level and the trend of the historical monthly
 * revenue series to project it `monthsAhead` months into the future.
 */
import { prisma } from '../lib/prisma';
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

  // Double Exponential Smoothing (Holt's Linear Trend) parameters
  const alpha = 0.4; // Smoothing factor for level
  const beta = 0.3;  // Smoothing factor for trend

  // Initialize Level (L) and Trend (T)
  let L = history[0].revenue;
  let T = history.length > 1 ? history[1].revenue - history[0].revenue : 0;

  const points: ForecastPoint[] = [];

  // Calculate fitted values over historical data
  for (let i = 0; i < history.length; i++) {
    const actual = history[i].revenue;
    // For the first period, we assume prediction equals actual for visualization
    const predicted = i === 0 ? actual : L + T;

    if (i > 0) {
      const prevL = L;
      L = alpha * actual + (1 - alpha) * (L + T);
      T = beta * (L - prevL) + (1 - beta) * T;
    }

    points.push({
      period: history[i].period,
      actual: round2(actual),
      predicted: round2(Math.max(0, predicted)),
    });
  }

  // Extrapolate future values using the last computed Level and Trend
  const lastPeriod = history[history.length - 1].period;
  for (let k = 1; k <= monthsAhead; k++) {
    const forecastVal = L + k * T;
    points.push({
      period: addMonths(lastPeriod, k),
      predicted: round2(Math.max(0, forecastVal)),
    });
  }

  return points;
}
