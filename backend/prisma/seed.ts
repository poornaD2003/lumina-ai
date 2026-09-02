/**
 * Seed script for the Business Intelligence AI Agent database.
 *
 * Generates realistic, reproducible sample data:
 *   - 50 customers  (Enterprise / SMB / Startup / Consumer across 4 regions)
 *   - 30 products   (Electronics / Software / Services / Hardware)
 *   - ~2,000 sales  (Jan 2025 - Jun 2026, seasonal Q4 peak + growth trend)
 *   - ~500 financial records (18 months of monthly P&L lines)
 *
 * Run from the backend directory:  npx tsx prisma/seed.ts
 *
 * Notes on the Prisma 7 setup:
 *   - The connection URL is configured in prisma.config.ts (for the CLI) and
 *     passed to PrismaClient as a driver adapter at runtime.
 *   - A deterministic LCG random generator is used, so repeated runs produce
 *     identical data.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root (same convention as src/index.ts)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// DATABASE_URL is a relative SQLite path ("file:./dev.db") — resolve it against
// this script's directory (prisma/), the same way the Prisma CLI resolves it.
const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbFile = envUrl.replace(/^file:/, '');

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, dbFile)}`,
});
const prisma = new PrismaClient({ adapter });

/* -------------------------------------------------------------------------- */
/*  Deterministic random generator (linear congruential generator)            */
/* -------------------------------------------------------------------------- */

let rngState = 0x2f6e2b1;

/** Deterministic pseudo-random number in [0, 1). */
function rand(): number {
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
  return rngState / 4294967296;
}

const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const randFloat = (min: number, max: number): number => min + rand() * (max - min);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  const totalWeight = items.reduce((sum, item) => sum + weightOf(item), 0);
  let ticket = rand() * totalWeight;
  for (const item of items) {
    ticket -= weightOf(item);
    if (ticket <= 0) return item;
  }
  return items[items.length - 1];
}

/* -------------------------------------------------------------------------- */
/*  Customers                                                                 */
/* -------------------------------------------------------------------------- */

const CUSTOMER_NAMES = [
  'Acme Corp', 'TechVision Inc', 'Global Solutions Ltd', 'Nimbus Analytics',
  'Blue Harbor Trading', 'Vertex Systems', 'Quantum Leap Labs', 'Silverline Media',
  'Ironclad Security', 'Pinnacle Foods Group', 'BrightPath Consulting', 'Cascade Logistics',
  'Redwood Capital', 'Stellar Dynamics', 'Maple Ridge Retail', 'Falcon Freight Co',
  'Horizon Health Systems', 'Coral Bay Resorts', 'Zenith Robotics', 'Amber Wave Energy',
  'Northstar Insurance', 'Crescent Tech Partners', 'Oakbridge Construction', 'Lunar Software Works',
  'Vista Marketing Group', 'Trident Marine Supply', 'Copper Canyon Mining', 'Aurora Biotech',
  'Summit Peak Outdoors', 'Harbor Light Shipping', 'Ember Glow Cosmetics', 'Titan Steel Works',
  'Willow Creek Farms', 'Prism Optics Lab', 'Granite Peak Finance', 'Echo Valley Audio',
  'Cobalt Interactive', 'Meadowbrook Education', 'Saffron Spice Traders', 'Ivory Tower Publishing',
  'Storm Chasers Weather', 'Blazing Trail Sports', 'Crystal Lake Beverages', 'Onyx Mobile Networks',
  'Velvet Touch Textiles', 'Frontier Drone Ops', 'Golden Gate Grocers', 'Sapphire Data Centers',
  'Wildflower Botanicals', 'Atlas Rail Transport',
];

const SEGMENTS: Record<string, { count: number; ltvRange: [number, number] }> = {
  Enterprise: { count: 10, ltvRange: [50_000, 500_000] },
  SMB: { count: 15, ltvRange: [10_000, 100_000] },
  Startup: { count: 15, ltvRange: [5_000, 50_000] },
  Consumer: { count: 10, ltvRange: [1_000, 10_000] },
};

const REGION_COUNTS: Record<string, number> = { North: 12, South: 13, East: 12, West: 13 };

const LEGAL_SUFFIXES = new Set(['corp', 'inc', 'ltd', 'co', 'llc', 'plc']);
const EMAIL_PREFIXES = ['contact', 'info', 'hello', 'sales', 'support'];

interface CustomerDraft {
  name: string;
  email: string;
  segment: string;
  region: string;
  lifetimeValue: number;
  acquisitionDate: Date;
  isActive: boolean;
}

function buildCustomers(): CustomerDraft[] {
  // Exact segment/region distributions, shuffled deterministically
  const segmentPool = shuffle(
    Object.entries(SEGMENTS).flatMap(([segment, cfg]) =>
      Array.from({ length: cfg.count }, () => segment),
    ),
  );
  const regionPool = shuffle(
    Object.entries(REGION_COUNTS).flatMap(([region, count]) =>
      Array.from({ length: count }, () => region),
    ),
  );
  const acquisitionStart = new Date(2023, 0, 1).getTime();
  const acquisitionEnd = new Date(2026, 5, 1).getTime();

  return CUSTOMER_NAMES.map((name, i) => {
    const segment = segmentPool[i];
    const [ltvMin, ltvMax] = SEGMENTS[segment].ltvRange;
    const domain = name
      .toLowerCase()
      .split(' ')
      .filter((word) => !LEGAL_SUFFIXES.has(word))
      .join('');
    return {
      name,
      email: `${EMAIL_PREFIXES[i % EMAIL_PREFIXES.length]}@${domain}.com`,
      segment,
      region: regionPool[i],
      lifetimeValue: round2(randFloat(ltvMin, ltvMax)),
      acquisitionDate: new Date(acquisitionStart + rand() * (acquisitionEnd - acquisitionStart)),
      isActive: rand() < 0.85, // ~85% active
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Products                                                                  */
/* -------------------------------------------------------------------------- */

interface ProductDraft {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  reorderLevel: number;
}

const PRODUCT_CATALOG: Array<{
  name: string;
  category: string;
  unitPrice: number;
  costRatio: [number, number];
}> = [
  // Electronics (8) — physical goods, thinner margins
  { name: 'Smart Display Pro', category: 'Electronics', unitPrice: 1299, costRatio: [0.55, 0.7] },
  { name: 'IoT Sensor Kit', category: 'Electronics', unitPrice: 249, costRatio: [0.55, 0.7] },
  { name: 'Wireless Hub X1', category: 'Electronics', unitPrice: 399, costRatio: [0.55, 0.7] },
  { name: '4K Action Camera', category: 'Electronics', unitPrice: 599, costRatio: [0.55, 0.7] },
  { name: 'Noise-Cancel Headset Elite', category: 'Electronics', unitPrice: 349, costRatio: [0.55, 0.7] },
  { name: 'Smart Thermostat Z', category: 'Electronics', unitPrice: 199, costRatio: [0.55, 0.7] },
  { name: 'Portable Projector Mini', category: 'Electronics', unitPrice: 899, costRatio: [0.55, 0.7] },
  { name: 'Fitness Tracker Pulse', category: 'Electronics', unitPrice: 149, costRatio: [0.55, 0.7] },
  // Software (8) — monthly subscription licenses, high margins
  { name: 'CloudSync Enterprise', category: 'Software', unitPrice: 499, costRatio: [0.4, 0.55] },
  { name: 'DataVault Pro', category: 'Software', unitPrice: 299, costRatio: [0.4, 0.55] },
  { name: 'SecureAuth Suite', category: 'Software', unitPrice: 399, costRatio: [0.4, 0.55] },
  { name: 'InsightIQ Analytics', category: 'Software', unitPrice: 449, costRatio: [0.4, 0.55] },
  { name: 'MailFlow Manager', category: 'Software', unitPrice: 99, costRatio: [0.4, 0.55] },
  { name: 'CodeCraft Studio', category: 'Software', unitPrice: 149, costRatio: [0.4, 0.55] },
  { name: 'PixelPerfect Editor', category: 'Software', unitPrice: 129, costRatio: [0.4, 0.55] },
  { name: 'TaskFlow Organizer', category: 'Software', unitPrice: 79, costRatio: [0.4, 0.55] },
  // Services (7) — professional services, high margins
  { name: 'Premium Support Plan', category: 'Services', unitPrice: 1499, costRatio: [0.4, 0.55] },
  { name: 'Managed Cloud Service', category: 'Services', unitPrice: 3500, costRatio: [0.4, 0.55] },
  { name: 'Security Audit Package', category: 'Services', unitPrice: 2500, costRatio: [0.4, 0.55] },
  { name: 'Data Migration Service', category: 'Services', unitPrice: 1800, costRatio: [0.4, 0.55] },
  { name: 'Training Workshop Series', category: 'Services', unitPrice: 899, costRatio: [0.4, 0.55] },
  { name: 'Consulting Retainer', category: 'Services', unitPrice: 4200, costRatio: [0.4, 0.55] },
  { name: 'Hardware Installation Service', category: 'Services', unitPrice: 450, costRatio: [0.4, 0.55] },
  // Hardware (7) — infrastructure equipment, thinner margins
  { name: 'Server Rack Unit', category: 'Hardware', unitPrice: 2200, costRatio: [0.55, 0.7] },
  { name: 'Network Switch Pro', category: 'Hardware', unitPrice: 3400, costRatio: [0.55, 0.7] },
  { name: 'Storage Array S500', category: 'Hardware', unitPrice: 7500, costRatio: [0.55, 0.7] },
  { name: 'Industrial Router R9', category: 'Hardware', unitPrice: 1250, costRatio: [0.55, 0.7] },
  { name: 'Power Backup UPS 3000', category: 'Hardware', unitPrice: 980, costRatio: [0.55, 0.7] },
  { name: 'Cable Management Kit Pro', category: 'Hardware', unitPrice: 520, costRatio: [0.55, 0.7] },
  { name: 'Workstation Dock Deluxe', category: 'Hardware', unitPrice: 899, costRatio: [0.55, 0.7] },
];

const SKU_PREFIX: Record<string, string> = {
  Electronics: 'EL',
  Software: 'SW',
  Services: 'SV',
  Hardware: 'HW',
};
const SKU_BASE: Record<string, number> = { Electronics: 1000, Software: 2000, Services: 3000, Hardware: 4000 };

// Products intentionally running below their reorder level (inventory alerts)
const LOW_STOCK_INDICES = new Set([2, 6, 12, 17, 22, 27]);

function buildProducts(): { drafts: ProductDraft[]; popularity: number[] } {
  const skuCounters: Record<string, number> = {};
  const drafts: ProductDraft[] = [];
  const popularity: number[] = [];

  PRODUCT_CATALOG.forEach((entry, i) => {
    skuCounters[entry.category] = (skuCounters[entry.category] ?? 0) + 1;
    const isLowStock = LOW_STOCK_INDICES.has(i);
    const reorderLevel = isLowStock ? randInt(25, 50) : randInt(10, 50);
    const stockQuantity = isLowStock ? randInt(3, 20) : randInt(60, 500);

    drafts.push({
      name: entry.name,
      sku: `${SKU_PREFIX[entry.category]}-${SKU_BASE[entry.category] + skuCounters[entry.category]}`,
      category: entry.category,
      unitPrice: entry.unitPrice,
      costPrice: round2(entry.unitPrice * randFloat(entry.costRatio[0], entry.costRatio[1])),
      stockQuantity,
      reorderLevel,
    });
    popularity.push(randFloat(0.6, 1.8));
  });

  return { drafts, popularity };
}

/* -------------------------------------------------------------------------- */
/*  Sales (Jan 2025 - Jun 2026, ~2,000 records)                               */
/* -------------------------------------------------------------------------- */

const SALE_MONTHS = 18; // Jan 2025 -> Jun 2026
const BASE_MONTHLY_SALES = 94; // tuned so the total lands around 2,000

interface SaleRow {
  customerId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: Date;
  region: string;
}

/**
 * Seasonal pattern built from sine waves: a strong Q4 peak (holiday season)
 * and a soft Q1 dip. Peaks in November at ~1.4x, bottoms out around ~0.8x.
 */
function seasonalFactor(monthOfYear: number): number {
  return (
    1 +
    0.28 * Math.sin((2 * Math.PI * (monthOfYear - 7)) / 12) + // annual wave, peaking in November
    0.12 * Math.sin((4 * Math.PI * (monthOfYear - 8.5)) / 12) // sharpens the Q4 peak / Q1 dip
  );
}

function buildSales(
  customers: Array<{ id: number; region: string; acquisitionDate: Date }>,
  products: Array<{ id: number; unitPrice: number; popularity: number }>,
): SaleRow[] {
  const sales: SaleRow[] = [];

  for (let monthIndex = 0; monthIndex < SALE_MONTHS; monthIndex++) {
    const year = 2025 + Math.floor(monthIndex / 12);
    const monthOfYear = monthIndex % 12;
    const growth = Math.pow(1.025, monthIndex); // ~2.5% month-over-month growth
    const jitter = 1 + (rand() - 0.5) * 0.1; // +/- 5% noise
    const salesThisMonth = Math.max(
      8,
      Math.round(BASE_MONTHLY_SALES * growth * seasonalFactor(monthOfYear) * jitter),
    );
    const daysInMonth = new Date(year, monthOfYear + 1, 0).getDate();

    for (let i = 0; i < salesThisMonth; i++) {
      // Random day + business hours. Keeping the hour within 9-15 makes the
      // UTC date equal the local date for common timezones, so sales stay
      // inside their intended month no matter how dates are grouped later.
      const saleDate = new Date(
        year,
        monthOfYear,
        randInt(1, daysInMonth),
        randInt(9, 15),
        randInt(0, 59),
        randInt(0, 59),
      );

      // Only customers acquired before the sale date can buy
      const eligible = customers.filter(
        (c) => c.acquisitionDate.getTime() <= saleDate.getTime(),
      );
      const customer = pick(eligible.length > 0 ? eligible : customers);
      const product = weightedPick(products, (p) => p.popularity);

      // Occasional promotional discount of 5-15%
      const discountFactor = rand() < 0.25 ? 1 - randFloat(0.05, 0.15) : 1;
      const unitPrice = round2(product.unitPrice * discountFactor);
      const quantity = randInt(1, 20);

      sales.push({
        customerId: customer.id,
        productId: product.id,
        quantity,
        unitPrice,
        totalAmount: round2(quantity * unitPrice),
        saleDate,
        region: customer.region, // region always matches the customer
      });
    }
  }

  return sales;
}

/* -------------------------------------------------------------------------- */
/*  Financial records (18 months of monthly P&L lines)                        */
/* -------------------------------------------------------------------------- */

interface FinancialRow {
  recordDate: Date;
  recordType: string;
  category: string;
  amount: number;
  description: string;
}

const SALARY_DEPARTMENTS: Array<[string, number]> = [
  ['Engineering', 0.38],
  ['Sales', 0.22],
  ['Customer Support', 0.13],
  ['Operations', 0.1],
  ['General & Administrative', 0.09],
  ['Executive', 0.08],
];

const MARKETING_CHANNELS: Array<[string, number]> = [
  ['Digital Advertising', 0.32],
  ['Events & Conferences', 0.22],
  ['Content & SEO', 0.15],
  ['PR & Brand', 0.13],
  ['Partner Programs', 0.18],
];

const UTILITY_LINES: Array<[string, number]> = [
  ['Electricity', 0.55],
  ['Water & Sewage', 0.15],
  ['Internet & Telecom', 0.3],
];

const RND_LINES: Array<[string, number]> = [
  ['Product Development', 0.5],
  ['Research', 0.3],
  ['Tools & Licenses', 0.2],
];

const RENT_TOTAL = 25_000; // fixed, split between HQ and warehouse
const TAX_RATE = 0.15;

function buildFinancialRecords(
  sales: SaleRow[],
  productCategoryById: Map<number, string>,
): FinancialRow[] {
  // Aggregate actual sales revenue per month and per product category
  const monthlyRevenue = new Map<string, Map<string, number>>();
  for (const sale of sales) {
    const key = `${sale.saleDate.getFullYear()}-${sale.saleDate.getMonth()}`;
    const category = productCategoryById.get(sale.productId) ?? 'Other';
    let byCategory = monthlyRevenue.get(key);
    if (!byCategory) {
      byCategory = new Map<string, number>();
      monthlyRevenue.set(key, byCategory);
    }
    byCategory.set(category, (byCategory.get(category) ?? 0) + sale.totalAmount);
  }

  const records: FinancialRow[] = [];
  let salaryBase = randFloat(85_000, 95_000); // grows to ~$97K-$109K over 18 months

  for (let monthIndex = 0; monthIndex < SALE_MONTHS; monthIndex++) {
    const year = 2025 + Math.floor(monthIndex / 12);
    const monthOfYear = monthIndex % 12;
    const key = `${year}-${monthOfYear}`;
    const revenueByCategory = monthlyRevenue.get(key) ?? new Map<string, number>();
    const totalRevenue = [...revenueByCategory.values()].reduce((sum, v) => sum + v, 0);
    const monthLabel = new Date(year, monthOfYear, 1).toLocaleString('en-US', { month: 'short' });
    const daysInMonth = new Date(year, monthOfYear + 1, 0).getDate();
    // Random day + business hours (see note in buildSales about UTC alignment)
    const recordDate = () =>
      new Date(year, monthOfYear, randInt(1, daysInMonth), randInt(9, 15), randInt(0, 59), randInt(0, 59));

    // Revenue — one line per product category, summing to the month's actual sales
    for (const [category, amount] of revenueByCategory) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Revenue',
        category,
        amount: round2(amount),
        description: `Sales revenue - ${category} product line (${monthLabel} ${year})`,
      });
    }

    // COGS — 40-50% of revenue, one line per product category
    const cogsRatio = randFloat(0.4, 0.5);
    let totalCogs = 0;
    for (const [category, amount] of revenueByCategory) {
      const cogs = round2(amount * cogsRatio);
      totalCogs += cogs;
      records.push({
        recordDate: recordDate(),
        recordType: 'COGS',
        category: 'COGS',
        amount: cogs,
        description: `Cost of goods sold - ${category} (${monthLabel} ${year})`,
      });
    }

    // Salaries — $80K-$120K/month with slight growth, split by department
    const totalSalaries = round2(salaryBase);
    salaryBase *= 1.008;
    for (const [department, share] of SALARY_DEPARTMENTS) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Expense',
        category: 'Salaries',
        amount: round2(totalSalaries * share),
        description: `Salaries - ${department} (${monthLabel} ${year})`,
      });
    }

    // Marketing — $15K-$40K/month, boosted during Q4
    const isQ4 = monthOfYear >= 9;
    const marketingTotal = Math.min(40_000, randFloat(16_000, 26_000) * (isQ4 ? 1.4 : 1));
    for (const [channel, share] of MARKETING_CHANNELS) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Expense',
        category: 'Marketing',
        amount: round2(marketingTotal * share),
        description: `Marketing - ${channel} (${monthLabel} ${year})`,
      });
    }

    // Rent — fixed $25K/month
    records.push({
      recordDate: recordDate(),
      recordType: 'Expense',
      category: 'Rent',
      amount: 18_000,
      description: `Rent - Headquarters office (${monthLabel} ${year})`,
    });
    records.push({
      recordDate: recordDate(),
      recordType: 'Expense',
      category: 'Rent',
      amount: 7_000,
      description: `Rent - Warehouse & facilities (${monthLabel} ${year})`,
    });

    // Utilities — $5K-$8K/month
    const utilitiesTotal = randFloat(5_000, 8_000);
    for (const [line, share] of UTILITY_LINES) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Expense',
        category: 'Utilities',
        amount: round2(utilitiesTotal * share),
        description: `Utilities - ${line} (${monthLabel} ${year})`,
      });
    }

    // R&D — $8K-$15K/month
    const rndTotal = randFloat(8_000, 15_000);
    for (const [line, share] of RND_LINES) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Expense',
        category: 'R&D',
        amount: round2(rndTotal * share),
        description: `R&D - ${line} (${monthLabel} ${year})`,
      });
    }

    // Tax — 15% of the month's profit, when positive
    const totalExpenses = totalCogs + totalSalaries + marketingTotal + RENT_TOTAL + utilitiesTotal + rndTotal;
    const profit = totalRevenue - totalExpenses;
    if (profit > 0) {
      records.push({
        recordDate: recordDate(),
        recordType: 'Tax',
        category: 'Tax',
        amount: round2(profit * TAX_RATE),
        description: `Corporate income tax - 15% of net profit (${monthLabel} ${year})`,
      });
    }
  }

  return records;
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                      */
/* -------------------------------------------------------------------------- */

const INSERT_CHUNK = 500; // keep each bulk insert within SQLite parameter limits

async function main(): Promise<void> {
  console.log('Clearing existing data ...');
  await prisma.sale.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  console.log('Seeding customers ...');
  await prisma.customer.createMany({ data: buildCustomers() });
  const customers = await prisma.customer.findMany({ orderBy: { id: 'asc' } });

  console.log('Seeding products ...');
  const { drafts: productDrafts, popularity } = buildProducts();
  await prisma.product.createMany({ data: productDrafts });
  const productRows = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  const productPool = productRows.map((row, i) => ({ ...row, popularity: popularity[i] }));

  console.log('Seeding sales (Jan 2025 - Jun 2026) ...');
  const sales = buildSales(customers, productPool);
  for (let i = 0; i < sales.length; i += INSERT_CHUNK) {
    await prisma.sale.createMany({ data: sales.slice(i, i + INSERT_CHUNK) });
  }

  console.log('Seeding financial records ...');
  const productCategoryById = new Map(productRows.map((p) => [p.id, p.category]));
  const financialRecords = buildFinancialRecords(sales, productCategoryById);
  for (let i = 0; i < financialRecords.length; i += INSERT_CHUNK) {
    await prisma.financialRecord.createMany({ data: financialRecords.slice(i, i + INSERT_CHUNK) });
  }

  console.log('Seed complete.');
  console.log(`  Customers:         ${customers.length}`);
  console.log(`  Products:          ${productRows.length}`);
  console.log(`  Sales:             ${sales.length}`);
  console.log(`  Financial records: ${financialRecords.length}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
