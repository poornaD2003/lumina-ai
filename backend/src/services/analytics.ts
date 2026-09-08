/**
 * Analytics service - aggregated business metrics for the BI dashboard.
 *
 * All queries run through the shared Prisma client singleton (src/services/prisma.ts).
 * Fully refactored and optimized for PostgreSQL (Supabase).
 */
import { prisma } from './prisma.js';
import type {
  CustomerSegment,
  DailyNetProfit,
  DailyProductProfit,
  FinancialOverview,
  KPIData,
  ProductPerformance,
  RegionSales,
  SalesSummary,
} from '../types/index.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function getDailyNetProfitHistory(days = 365): Promise<DailyNetProfit[]> {
  const rows = await prisma.dailyNetProfit.findMany({
    orderBy: { date: 'asc' },
    select: { date: true, revenue: true, costOfGoods: true, netProfit: true },
  });
  const totals = new Map<string, DailyNetProfit>();
  rows.forEach((row) => {
    const current = totals.get(row.date) ?? { date: row.date, revenue: 0, costOfGoods: 0, netProfit: 0 };
    totals.set(row.date, {
      date: row.date,
      revenue: current.revenue + row.revenue,
      costOfGoods: current.costOfGoods + row.costOfGoods,
      netProfit: current.netProfit + row.netProfit,
    });
  });
  return Array.from(totals.values()).slice(-days).map((row) => ({
    ...row,
    revenue: round2(row.revenue),
    costOfGoods: round2(row.costOfGoods),
    netProfit: round2(row.netProfit),
  }));
}

export async function saveDailyProductProfits(
  inputs: DailyProductProfit[],
): Promise<DailyNetProfit[]> {
  await prisma.$transaction(async (transaction) => {
    for (const input of inputs) {
      const stockUpdate = await transaction.product.updateMany({
        where: {
          id: input.productId,
          stockQuantity: {
            gte: input.quantity,
          },
        },
        data: {
          stockQuantity: {
            decrement: input.quantity,
          },
        },
      });

      if (stockUpdate.count !== 1) {
        throw new Error(
          `Insufficient stock for product ${input.productId}`,
        );
      }

      await transaction.dailyNetProfit.create({
        data: {
          date: input.date,
          productId: input.productId,
          productName: input.productName,
          quantity: input.quantity,
          sellingPrice: input.sellingPrice,
          unitCost: input.unitCost,
          revenue: input.revenue,
          costOfGoods: input.costOfGoods,
          netProfit: input.netProfit,
        },
      });
    }
  });

  return getDailyNetProfitHistory();
}

/* -------------------------------------------------------------------------- */
/*  KPIs                                                                      */
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
      FROM "Sale" s
      JOIN "Product" p ON p.id = s."productId"
      GROUP BY p.id, p.name
      ORDER BY SUM(s."totalAmount") DESC
      LIMIT 1`,
    prisma.$queryRaw<Array<{ region: string }>>`
      SELECT region
      FROM "Sale"
      GROUP BY region
      ORDER BY SUM("totalAmount") DESC
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
/*  Monthly sales summary                                                     */
/* -------------------------------------------------------------------------- */

export async function getSalesSummary(months = 12): Promise<SalesSummary[]> {
  const limitMonths = Number(months) || 12;

  const rows = await prisma.$queryRaw<
    Array<{
      period: string;
      totalRevenue: number;
      totalQuantity: number;
      orderCount: number;
    }>
  >`
    SELECT
      SUBSTRING("date" FROM 1 FOR 7) AS period,
      SUM("revenue")::float AS "totalRevenue",
      SUM("quantity")::int AS "totalQuantity",
      COUNT(*)::int AS "orderCount"
    FROM "DailyNetProfit"
    GROUP BY SUBSTRING("date" FROM 1 FOR 7)
    ORDER BY period DESC
    LIMIT ${limitMonths}`;

  return rows
    .map((row) => ({
      period: row.period,
      totalRevenue: round2(Number(row.totalRevenue ?? 0)),
      totalQuantity: Number(row.totalQuantity ?? 0),
      orderCount: Number(row.orderCount ?? 0),
    }))
    .reverse()
    .map((row) => ({
      ...row,
      avgOrderValue: row.orderCount > 0 ? round2(row.totalRevenue / row.orderCount) : 0,
    }));
}

/* -------------------------------------------------------------------------- */
/*  Customer segments                                                         */
/* -------------------------------------------------------------------------- */

export async function getCustomerSegments(): Promise<CustomerSegment[]> {
  // Clean Subquery Aggregation logic
  const rows = await prisma.$queryRaw<
    Array<{
      segment: string;
      count: number;
      totalLTV: number;
      avgLTV: number;
      totalRevenue: number;
    }>
  >`
    SELECT
      c.segment AS segment,
      COUNT(*)::int AS count,
      SUM(c."lifetimeValue")::float AS "totalLTV",
      AVG(c."lifetimeValue")::float AS "avgLTV",
      COALESCE(MAX(seg."totalRevenue"), 0)::float AS "totalRevenue"
    FROM "Customer" c
    LEFT JOIN (
      SELECT cu.segment AS seg, SUM(s."totalAmount") AS "totalRevenue"
      FROM "Sale" s
      JOIN "Customer" cu ON cu.id = s."customerId"
      GROUP BY cu.segment
    ) seg ON seg.seg = c.segment
    GROUP BY c.segment
    ORDER BY "totalRevenue" DESC`;

  return rows.map((row) => ({
    segment: row.segment,
    count: Number(row.count ?? 0),
    totalLTV: round2(Number(row.totalLTV ?? 0)),
    avgLTV: round2(Number(row.avgLTV ?? 0)),
    totalRevenue: round2(Number(row.totalRevenue ?? 0)),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Product performance                                                       */
/* -------------------------------------------------------------------------- */

export async function getProductPerformance(limit = 10): Promise<ProductPerformance[]> {
  const limitNum = Number(limit) || 10;

  const rows = await prisma.$queryRaw<
    Array<{
      productName: string;
      totalSold: number;
      totalRevenue: number;
      margin: number;
    }>
  >`
    SELECT
      p.name AS "productName",
      SUM(s.quantity)::int AS "totalSold",
      SUM(s."revenue")::float AS "totalRevenue",
      CASE WHEN p."unitPrice" > 0
        THEN ROUND((((p."unitPrice" - p."costPrice") / p."unitPrice") * 100)::numeric, 2)::float
        ELSE 0
      END AS margin
    FROM "Product" p
    JOIN "DailyNetProfit" s ON s."productId" = p.id
    GROUP BY p.id, p.name, p."unitPrice", p."costPrice"
    ORDER BY "totalRevenue" DESC
    LIMIT ${limitNum}`;

  return rows.map((row) => ({
    productName: row.productName,
    totalSold: Number(row.totalSold ?? 0),
    totalRevenue: round2(Number(row.totalRevenue ?? 0)),
    margin: Number(row.margin ?? 0),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Financial overview (monthly P&L)                                          */
/* -------------------------------------------------------------------------- */

export async function getFinancialOverview(months = 12): Promise<FinancialOverview[]> {
  const limitMonths = Number(months) || 12;

  const rows = await prisma.$queryRaw<
    Array<{
      period: string;
      revenue: number;
      expenses: number;
      cogs: number;
    }>
  >`
    SELECT
      TO_CHAR("recordDate", 'YYYY-MM') AS period,
      SUM(CASE WHEN "recordType" = 'Revenue' THEN amount ELSE 0 END)::float AS revenue,
      SUM(CASE WHEN "recordType" = 'Expense' THEN amount ELSE 0 END)::float AS expenses,
      SUM(CASE WHEN "recordType" = 'COGS' THEN amount ELSE 0 END)::float AS cogs
    FROM "FinancialRecord"
    GROUP BY TO_CHAR("recordDate", 'YYYY-MM')
    ORDER BY period DESC
    LIMIT ${limitMonths}`;

  return rows
    .map((row) => ({
      period: row.period,
      revenue: round2(Number(row.revenue ?? 0)),
      expenses: round2(Number(row.expenses ?? 0)),
      cogs: round2(Number(row.cogs ?? 0)),
    }))
    .reverse()
    .map((row) => ({
      ...row,
      netProfit: round2(row.revenue - row.expenses - row.cogs),
    }));
}

/* -------------------------------------------------------------------------- */
/*  Sales by region                                                           */
/* -------------------------------------------------------------------------- */

export async function getSalesByRegion(): Promise<RegionSales[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      region: string;
      totalRevenue: number;
      orderCount: number;
    }>
  >`
    SELECT
      region,
      SUM("totalAmount")::float AS "totalRevenue",
      COUNT(*)::int AS "orderCount"
    FROM "Sale"
    GROUP BY region
    ORDER BY "totalRevenue" DESC`;

  return rows.map((row) => ({
    region: row.region,
    totalRevenue: round2(Number(row.totalRevenue ?? 0)),
    orderCount: Number(row.orderCount ?? 0),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Inventory alerts                                                          */
/* -------------------------------------------------------------------------- */

export async function getInventoryAlerts() {
  // Raw SQL query for comparing two columns in the same database table
  const products = await prisma.$queryRaw<
    Array<{
      productName: string;
      sku: string;
      stockQuantity: number;
      reorderLevel: number;
    }>
  >`
    SELECT 
      name AS "productName",
      sku,
      "stockQuantity",
      "reorderLevel"
    FROM "Product"
    WHERE "stockQuantity" <= "reorderLevel"
    ORDER BY "stockQuantity" ASC`;

  return products.map((product) => ({
    productName: product.productName,
    sku: product.sku,
    stockQuantity: Number(product.stockQuantity ?? 0),
    reorderLevel: Number(product.reorderLevel ?? 0),
  }));
}