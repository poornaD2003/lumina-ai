/**
 * Analytics service — aggregated business metrics for the BI dashboard.
 *
 * All queries run through the shared Prisma client singleton
 * (src/services/prisma.ts). Date-based grouping uses SQLite's strftime() on
 * the ISO-8601 text that Prisma stores for DateTime columns, so month
 * buckets are computed by the database itself.
 *
 * NOTE: the better-sqlite3 driver returns integer aggregates (COUNT, SUM of
 * integer columns) as BigInt. Every raw-query result is normalized with
 * Number() so JSON responses contain plain numbers.
 */
import { prisma } from './prisma.js';
import type {
  CustomerSegment,
  FinancialOverview,
  InventoryAlert,
  KPIData,
  ProductPerformance,
  RegionSales,
  SalesSummary,
} from '../types/index.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/* -------------------------------------------------------------------------- */
/*  KPIs                                                                       */
/* -------------------------------------------------------------------------- */

export async function getKPIs(): Promise<KPIData> {
  const [salesAgg, activeCustomers, topProductRows, topRegionRows] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.$queryRaw<Array<{ name: string }>>`
      SELECT p.name AS name
      FROM Sale s
      JOIN Product p ON p.id = s.productId
      GROUP BY p.id, p.name
      ORDER BY SUM(s.totalAmount) DESC
      LIMIT 1`,
    prisma.$queryRaw<Array<{ region: string }>>`
      SELECT region
      FROM Sale
      GROUP BY region
      ORDER BY SUM(totalAmount) DESC
      LIMIT 1`,
  ]);

  const totalRevenue = salesAgg._sum.totalAmount ?? 0;
  const totalOrders = salesAgg._count;

  return {
    totalRevenue: round2(totalRevenue),
    activeCustomers,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? round2(totalRevenue / totalOrders) : 0,
    topProduct: topProductRows[0]?.name ?? 'N/A',
    topRegion: topRegionRows[0]?.region ?? 'N/A',
  };
}

/* -------------------------------------------------------------------------- */
/*  Monthly sales summary                                                      */
/* -------------------------------------------------------------------------- */

export async function getSalesSummary(months = 12): Promise<SalesSummary[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      period: string;
      totalRevenue: number;
      totalQuantity: number | bigint;
      orderCount: number | bigint;
    }>
  >`
    SELECT
      strftime('%Y-%m', saleDate) AS period,
      SUM(totalAmount) AS totalRevenue,
      SUM(quantity) AS totalQuantity,
      COUNT(*) AS orderCount
    FROM Sale
    GROUP BY period
    ORDER BY period DESC
    LIMIT ${months}`;

  // Query pulls newest-first for LIMIT; reverse into chronological order.
  return rows
    .map((row) => ({
      period: row.period,
      totalRevenue: round2(Number(row.totalRevenue)),
      totalQuantity: Number(row.totalQuantity),
      orderCount: Number(row.orderCount),
    }))
    .reverse()
    .map((row) => ({
      period: row.period,
      totalRevenue: row.totalRevenue,
      totalQuantity: row.totalQuantity,
      orderCount: row.orderCount,
      avgOrderValue: row.orderCount > 0 ? round2(row.totalRevenue / row.orderCount) : 0,
    }));
}

/* -------------------------------------------------------------------------- */
/*  Customer segments                                                          */
/* -------------------------------------------------------------------------- */

export async function getCustomerSegments(): Promise<CustomerSegment[]> {
  // LTV is aggregated per Customer row; sales revenue comes from a subquery
  // so it does not multiply lifetimeValue across a customer's sales.
  const rows = await prisma.$queryRaw<
    Array<{
      segment: string;
      count: number | bigint;
      totalLTV: number;
      avgLTV: number;
      totalRevenue: number;
    }>
  >`
    SELECT
      c.segment AS segment,
      COUNT(*) AS count,
      SUM(c.lifetimeValue) AS totalLTV,
      AVG(c.lifetimeValue) AS avgLTV,
      COALESCE(seg.totalRevenue, 0) AS totalRevenue
    FROM Customer c
    LEFT JOIN (
      SELECT cu.segment AS seg, SUM(s.totalAmount) AS totalRevenue
      FROM Sale s
      JOIN Customer cu ON cu.id = s.customerId
      GROUP BY cu.segment
    ) seg ON seg.seg = c.segment
    GROUP BY c.segment
    ORDER BY totalRevenue DESC`;

  return rows.map((row) => ({
    segment: row.segment,
    count: Number(row.count),
    totalLTV: round2(Number(row.totalLTV)),
    avgLTV: round2(Number(row.avgLTV)),
    totalRevenue: round2(Number(row.totalRevenue)),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Product performance                                                        */
/* -------------------------------------------------------------------------- */

export async function getProductPerformance(limit = 10): Promise<ProductPerformance[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      productName: string;
      totalSold: number | bigint;
      totalRevenue: number;
      margin: number;
    }>
  >`
    SELECT
      p.name AS productName,
      SUM(s.quantity) AS totalSold,
      SUM(s.totalAmount) AS totalRevenue,
      CASE WHEN p.unitPrice > 0
        THEN ROUND(((p.unitPrice - p.costPrice) / p.unitPrice) * 100, 2)
        ELSE 0
      END AS margin
    FROM Product p
    JOIN Sale s ON s.productId = p.id
    GROUP BY p.id, p.name, p.unitPrice, p.costPrice
    ORDER BY totalRevenue DESC
    LIMIT ${limit}`;

  return rows.map((row) => ({
    productName: row.productName,
    totalSold: Number(row.totalSold),
    totalRevenue: round2(Number(row.totalRevenue)),
    margin: Number(row.margin),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Financial overview (monthly P&L)                                           */
/* -------------------------------------------------------------------------- */

export async function getFinancialOverview(months = 12): Promise<FinancialOverview[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      period: string;
      revenue: number;
      expenses: number;
      cogs: number;
    }>
  >`
    SELECT
      strftime('%Y-%m', recordDate) AS period,
      SUM(CASE WHEN recordType = 'Revenue' THEN amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN recordType = 'Expense' THEN amount ELSE 0 END) AS expenses,
      SUM(CASE WHEN recordType = 'COGS' THEN amount ELSE 0 END) AS cogs
    FROM FinancialRecord
    GROUP BY period
    ORDER BY period DESC
    LIMIT ${months}`;

  // Newest-first for LIMIT; reverse into chronological order.
  return rows
    .map((row) => ({
      period: row.period,
      revenue: round2(Number(row.revenue)),
      expenses: round2(Number(row.expenses)),
      cogs: round2(Number(row.cogs)),
    }))
    .reverse()
    .map((row) => ({
      ...row,
      netProfit: round2(row.revenue - row.expenses - row.cogs),
    }));
}

/* -------------------------------------------------------------------------- */
/*  Sales by region                                                            */
/* -------------------------------------------------------------------------- */

export async function getSalesByRegion(): Promise<RegionSales[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      region: string;
      totalRevenue: number;
      orderCount: number | bigint;
    }>
  >`
    SELECT
      region,
      SUM(totalAmount) AS totalRevenue,
      COUNT(*) AS orderCount
    FROM Sale
    GROUP BY region
    ORDER BY totalRevenue DESC`;

  return rows.map((row) => ({
    region: row.region,
    totalRevenue: round2(Number(row.totalRevenue)),
    orderCount: Number(row.orderCount),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Inventory alerts                                                           */
/* -------------------------------------------------------------------------- */

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  // Column-to-column comparison: stockQuantity <= reorderLevel
  const products = await prisma.product.findMany({
    where: { stockQuantity: { lte: prisma.product.fields.reorderLevel } },
    orderBy: { stockQuantity: 'asc' },
    select: {
      name: true,
      sku: true,
      stockQuantity: true,
      reorderLevel: true,
    },
  });

  return products.map((product) => ({
    productName: product.name,
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    reorderLevel: product.reorderLevel,
  }));
}
