/**
 * Seed script for Lumina Laptop Store database.
 *
 * Generates realistic, reproducible sample data for a Sri Lankan laptop shop:
 *   - 40  customers  (Corporate / Education / Gaming / Individual)
 *   - 25  products   (Gaming Laptops / Ultrabooks / Business / Standard / Workstations / Accessories)
 *   - ~500 sales     (Jan 2025 – Jun 2026, with Sri Lankan seasonal peaks)
 *   - ~350 financial records (18 months of monthly P&L lines in LKR)
 *
 * Run from the backend directory:
 *   node node_modules\prisma\build\index.js db seed
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root (same convention as src/index.ts)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// DATABASE_URL is a relative SQLite path ("file:./dev.db") – resolve it against
// this script's directory (prisma/), the same way the Prisma CLI resolves it.
const envUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbFile = envUrl.replace(/^file:/, '');

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, dbFile)}`,
});
const prisma = new PrismaClient({ adapter });

/* ── Deterministic RNG (linear congruential generator) ───────────────────── */

let rngState = 0x2f6e2b1;

/** Deterministic pseudo-random number in [0, 1). */
function rand(): number {
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
  return rngState / 4294967296;
}

const randInt   = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const randFloat = (min: number, max: number): number => min + rand() * (max - min);
const round2    = (n: number): number => Math.round(n * 100) / 100;
const pick      = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let ticket = rand() * total;
  for (const item of items) {
    ticket -= weightOf(item);
    if (ticket <= 0) return item;
  }
  return items[items.length - 1];
}

/* ── Customers ───────────────────────────────────────────────────────────── */

const CUSTOMER_DATA = [
  // Corporate (10)
  { name: 'Apex Technologies Pvt Ltd',    email: 'procurement@apextech.lk',    phone: '0112345678', segment: 'Corporate',  region: 'West'    },
  { name: 'Ceylon Bank Ltd',              email: 'it@ceylonbank.lk',           phone: '0112789456', segment: 'Corporate',  region: 'West'    },
  { name: 'SriLankan Airlines',           email: 'tech@srilankanair.lk',       phone: '0119733333', segment: 'Corporate',  region: 'West'    },
  { name: 'Hayleys Management Solutions', email: 'systems@hayleys.lk',         phone: '0114744400', segment: 'Corporate',  region: 'West'    },
  { name: 'Dialog Axiata PLC',            email: 'ict@dialog.lk',              phone: '0777678678', segment: 'Corporate',  region: 'West'    },
  { name: 'MAS Holdings Ltd',             email: 'it@masholdings.com',         phone: '0114803000', segment: 'Corporate',  region: 'South'   },
  { name: 'Brandix Lanka Ltd',            email: 'admin@brandixlanka.lk',      phone: '0112369900', segment: 'Corporate',  region: 'North'   },
  { name: 'John Keells Holdings',         email: 'procurement@jkh.lk',         phone: '0112306000', segment: 'Corporate',  region: 'West'    },
  { name: 'Softlogic Group',              email: 'it@softlogicgroup.lk',       phone: '0112001000', segment: 'Corporate',  region: 'East'    },
  { name: 'Virtusa Lanka Ltd',            email: 'assets@virtusalanka.com',    phone: '0112305000', segment: 'Corporate',  region: 'West'    },
  // Education (6)
  { name: 'University of Moratuwa',       email: 'ict@uom.lk',                 phone: '0112650301', segment: 'Education',  region: 'West'    },
  { name: 'SLIIT',                        email: 'ict@sliit.lk',               phone: '0112413901', segment: 'Education',  region: 'West'    },
  { name: 'University of Peradeniya',     email: 'it@pdn.ac.lk',               phone: '0812388001', segment: 'Education',  region: 'Central' },
  { name: 'NSBM Green University',        email: 'ict@nsbm.ac.lk',             phone: '0112741663', segment: 'Education',  region: 'West'    },
  { name: 'Colombo International School', email: 'admin@cis.lk',               phone: '0112368000', segment: 'Education',  region: 'West'    },
  { name: 'Kandy National College',       email: 'principal@knc.lk',           phone: '0812223456', segment: 'Education',  region: 'Central' },
  // Gaming (10)
  { name: 'Ashan Perera',                 email: 'ashan.perera@gmail.com',     phone: '0771234567', segment: 'Gaming',     region: 'West'    },
  { name: 'Damith Rajapaksa',             email: 'damith.raj@gmail.com',       phone: '0752345678', segment: 'Gaming',     region: 'South'   },
  { name: 'Lahiru Jayawardena',           email: 'lahiru.gamer@gmail.com',     phone: '0763456789', segment: 'Gaming',     region: 'West'    },
  { name: 'Kasun Madushan',               email: 'kasun.mad@gmail.com',        phone: '0784567890', segment: 'Gaming',     region: 'Central' },
  { name: 'Nithurshan Selvaraj',          email: 'nithu.gaming@gmail.com',     phone: '0765678901', segment: 'Gaming',     region: 'North'   },
  { name: 'Ruwan Bandara',                email: 'ruwan.bandara@gmail.com',    phone: '0776789012', segment: 'Gaming',     region: 'West'    },
  { name: 'Sachith Fernando',             email: 'sachith.fdo@gmail.com',      phone: '0757890123', segment: 'Gaming',     region: 'West'    },
  { name: 'Tharaka Hettiarachchi',        email: 'tharaka.het@gmail.com',      phone: '0768901234', segment: 'Gaming',     region: 'South'   },
  { name: 'Vihanga Senanayake',           email: 'vihanga.sen@gmail.com',      phone: '0779012345', segment: 'Gaming',     region: 'East'    },
  { name: 'Yohan Croos',                  email: 'yohan.croos@gmail.com',      phone: '0760123456', segment: 'Gaming',     region: 'West'    },
  // Individual (14)
  { name: 'Nimal Perera',                 email: 'nimal.perera@gmail.com',     phone: '0771111111', segment: 'Individual', region: 'West'    },
  { name: 'Dilani Silva',                 email: 'dilani.silva@outlook.com',   phone: '0762222222', segment: 'Individual', region: 'South'   },
  { name: 'Amara Wickramasinghe',         email: 'amara.w@gmail.com',          phone: '0773333333', segment: 'Individual', region: 'West'    },
  { name: 'Buddhika Rathnayake',          email: 'buddhika.r@gmail.com',       phone: '0754444444', segment: 'Individual', region: 'Central' },
  { name: 'Chamara Kumara',               email: 'chamara.k@gmail.com',        phone: '0765555555', segment: 'Individual', region: 'North'   },
  { name: 'Eshani Karunaratne',           email: 'eshani.k@gmail.com',         phone: '0776666666', segment: 'Individual', region: 'West'    },
  { name: 'Fathima Nishara',              email: 'fathima.n@gmail.com',        phone: '0757777777', segment: 'Individual', region: 'East'    },
  { name: 'Gihan Samarawickrama',         email: 'gihan.s@gmail.com',          phone: '0768888888', segment: 'Individual', region: 'West'    },
  { name: 'Hasini Jayasinghe',            email: 'hasini.j@gmail.com',         phone: '0779999999', segment: 'Individual', region: 'South'   },
  { name: 'Irfan Farook',                 email: 'irfan.f@gmail.com',          phone: '0760000001', segment: 'Individual', region: 'East'    },
  { name: 'Janaka Dissanayake',           email: 'janaka.d@gmail.com',         phone: '0771000002', segment: 'Individual', region: 'West'    },
  { name: 'Kavya Subasinghe',             email: 'kavya.s@gmail.com',          phone: '0752000003', segment: 'Individual', region: 'West'    },
  { name: 'Laksiri Wijesekara',           email: 'laksiri.w@gmail.com',        phone: '0763000004', segment: 'Individual', region: 'Central' },
  { name: 'Manel Wijeratne',              email: 'manel.w@gmail.com',          phone: '0784000005', segment: 'Individual', region: 'South'   },
];

const LTV_RANGES: Record<string, [number, number]> = {
  Corporate:  [500_000,  5_000_000],
  Education:  [200_000,  2_000_000],
  Gaming:     [150_000,    800_000],
  Individual: [50_000,     500_000],
};

const ACQ_START = new Date(2022, 0, 1).getTime();
const ACQ_END   = new Date(2025, 0, 1).getTime();

function buildCustomers() {
  return CUSTOMER_DATA.map(({ name, email, phone, segment, region }) => {
    const [ltvMin, ltvMax] = LTV_RANGES[segment];
    return {
      name,
      email,
      phone,
      segment,
      region,
      lifetimeValue: round2(randFloat(ltvMin, ltvMax)),
      acquisitionDate: new Date(ACQ_START + rand() * (ACQ_END - ACQ_START)),
      isActive: rand() < 0.92,
    };
  });
}

/* ── Products ────────────────────────────────────────────────────────────── */

interface ProductDraft {
  name: string;
  sku: string;
  brand: string;
  category: string;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  displaySize: string | null;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  warrantyMonths: number;
}

// All prices in LKR
const PRODUCT_CATALOG = [
  // ── Gaming Laptops ────────────────────────────────────────────────────────
  { name: 'ASUS ROG Strix G16',        brand: 'ASUS',    category: 'Gaming Laptop',   processor: 'Intel Core i7-13650HX',   ram: '16GB DDR5',    storage: '512GB NVMe SSD', displaySize: '16"',   unitPrice: 185_000, costRatio: 0.88, stock: 12, reorder: 3, warranty: 24 },
  { name: 'Lenovo Legion Pro 5',        brand: 'Lenovo',  category: 'Gaming Laptop',   processor: 'AMD Ryzen 7 7745HX',      ram: '32GB DDR5',    storage: '1TB NVMe SSD',   displaySize: '16"',   unitPrice: 210_000, costRatio: 0.88, stock: 8,  reorder: 3, warranty: 24 },
  { name: 'MSI Raider GE76',            brand: 'MSI',     category: 'Gaming Laptop',   processor: 'Intel Core i9-12900HX',   ram: '32GB DDR5',    storage: '2TB NVMe SSD',   displaySize: '17.3"', unitPrice: 295_000, costRatio: 0.87, stock: 4,  reorder: 2, warranty: 24 },
  { name: 'Acer Predator Helios 300',   brand: 'Acer',    category: 'Gaming Laptop',   processor: 'Intel Core i7-12700H',    ram: '16GB DDR4',    storage: '512GB NVMe SSD', displaySize: '15.6"', unitPrice: 162_000, costRatio: 0.87, stock: 6,  reorder: 3, warranty: 12 },
  { name: 'HP Omen 16',                 brand: 'HP',      category: 'Gaming Laptop',   processor: 'AMD Ryzen 7 6800H',       ram: '16GB DDR5',    storage: '1TB NVMe SSD',   displaySize: '16.1"', unitPrice: 178_000, costRatio: 0.87, stock: 7,  reorder: 3, warranty: 12 },
  // ── Ultrabooks ────────────────────────────────────────────────────────────
  { name: 'MacBook Air M2',             brand: 'Apple',   category: 'Ultrabook',       processor: 'Apple M2 (8-core CPU)',   ram: '8GB Unified',  storage: '256GB SSD',       displaySize: '13.6"', unitPrice: 142_000, costRatio: 0.84, stock: 18, reorder: 5, warranty: 12 },
  { name: 'MacBook Air M3 15"',         brand: 'Apple',   category: 'Ultrabook',       processor: 'Apple M3 (8-core CPU)',   ram: '16GB Unified', storage: '512GB SSD',       displaySize: '15.3"', unitPrice: 198_000, costRatio: 0.85, stock: 10, reorder: 4, warranty: 12 },
  { name: 'Dell XPS 13',                brand: 'Dell',    category: 'Ultrabook',       processor: 'Intel Core i7-1360P',    ram: '16GB LPDDR5',  storage: '512GB NVMe SSD', displaySize: '13.4"', unitPrice: 158_000, costRatio: 0.86, stock: 9,  reorder: 4, warranty: 12 },
  { name: 'LG Gram 14',                 brand: 'LG',      category: 'Ultrabook',       processor: 'Intel Core i7-1360P',    ram: '16GB LPDDR5',  storage: '512GB NVMe SSD', displaySize: '14"',   unitPrice: 145_000, costRatio: 0.85, stock: 7,  reorder: 3, warranty: 12 },
  { name: 'Lenovo ThinkPad X1 Carbon',  brand: 'Lenovo',  category: 'Ultrabook',       processor: 'Intel Core i7-1365U',    ram: '16GB LPDDR5',  storage: '512GB NVMe SSD', displaySize: '14"',   unitPrice: 172_000, costRatio: 0.86, stock: 8,  reorder: 3, warranty: 36 },
  // ── Business Laptops ──────────────────────────────────────────────────────
  { name: 'Dell Latitude 5540',         brand: 'Dell',    category: 'Business Laptop', processor: 'Intel Core i5-1345U',    ram: '8GB DDR4',     storage: '256GB SSD',       displaySize: '15.6"', unitPrice: 88_000,  costRatio: 0.84, stock: 15, reorder: 5, warranty: 36 },
  { name: 'HP EliteBook 840 G10',       brand: 'HP',      category: 'Business Laptop', processor: 'Intel Core i7-1355U',    ram: '16GB DDR5',    storage: '512GB NVMe SSD', displaySize: '14"',   unitPrice: 125_000, costRatio: 0.85, stock: 11, reorder: 4, warranty: 36 },
  { name: 'Lenovo ThinkPad E15',        brand: 'Lenovo',  category: 'Business Laptop', processor: 'Intel Core i5-1235U',    ram: '8GB DDR4',     storage: '512GB NVMe SSD', displaySize: '15.6"', unitPrice: 82_000,  costRatio: 0.84, stock: 14, reorder: 5, warranty: 12 },
  { name: 'ASUS ExpertBook B7',         brand: 'ASUS',    category: 'Business Laptop', processor: 'Intel Core i7-1165G7',   ram: '16GB DDR4',    storage: '512GB NVMe SSD', displaySize: '14"',   unitPrice: 118_000, costRatio: 0.83, stock: 9,  reorder: 4, warranty: 24 },
  // ── Standard Laptops ──────────────────────────────────────────────────────
  { name: 'HP Pavilion 15',             brand: 'HP',      category: 'Standard Laptop', processor: 'Intel Core i5-1235U',    ram: '8GB DDR4',     storage: '512GB SSD',       displaySize: '15.6"', unitPrice: 68_000,  costRatio: 0.81, stock: 22, reorder: 8, warranty: 12 },
  { name: 'Dell Inspiron 3520',         brand: 'Dell',    category: 'Standard Laptop', processor: 'Intel Core i3-1215U',    ram: '8GB DDR4',     storage: '256GB SSD',       displaySize: '15.6"', unitPrice: 52_000,  costRatio: 0.81, stock: 18, reorder: 8, warranty: 12 },
  { name: 'Lenovo IdeaPad Slim 3',      brand: 'Lenovo',  category: 'Standard Laptop', processor: 'AMD Ryzen 5 7520U',      ram: '8GB DDR5',     storage: '512GB NVMe SSD', displaySize: '15.6"', unitPrice: 58_000,  costRatio: 0.81, stock: 20, reorder: 8, warranty: 12 },
  { name: 'Acer Aspire 5',              brand: 'Acer',    category: 'Standard Laptop', processor: 'Intel Core i5-1235U',    ram: '8GB DDR4',     storage: '512GB NVMe SSD', displaySize: '15.6"', unitPrice: 62_000,  costRatio: 0.81, stock: 16, reorder: 8, warranty: 12 },
  // ── Workstations ──────────────────────────────────────────────────────────
  { name: 'Dell Precision 5680',        brand: 'Dell',    category: 'Workstation',     processor: 'Intel Core i9-13900H',   ram: '32GB DDR5',    storage: '1TB NVMe SSD',   displaySize: '16"',   unitPrice: 385_000, costRatio: 0.88, stock: 4,  reorder: 2, warranty: 36 },
  { name: 'HP ZBook Fury G10',          brand: 'HP',      category: 'Workstation',     processor: 'Intel Core i9-13950HX',  ram: '64GB DDR5',    storage: '2TB NVMe SSD',   displaySize: '16"',   unitPrice: 450_000, costRatio: 0.88, stock: 3,  reorder: 2, warranty: 36 },
  { name: 'MacBook Pro 16" M3 Max',     brand: 'Apple',   category: 'Workstation',     processor: 'Apple M3 Max (14-core)', ram: '36GB Unified', storage: '1TB SSD',         displaySize: '16.2"', unitPrice: 420_000, costRatio: 0.88, stock: 3,  reorder: 2, warranty: 12 },
  // ── Accessories ───────────────────────────────────────────────────────────
  { name: 'Logitech MX Master 3S',      brand: 'Logitech', category: 'Accessories', processor: null, ram: null, storage: null, displaySize: null, unitPrice: 12_500, costRatio: 0.74, stock: 35, reorder: 10, warranty: 12 },
  { name: 'Kingston 16GB DDR4 3200MHz', brand: 'Kingston', category: 'Accessories', processor: null, ram: null, storage: null, displaySize: null, unitPrice: 8_500,  costRatio: 0.73, stock: 40, reorder: 10, warranty: 36 },
  { name: 'Crucial 1TB NVMe SSD',       brand: 'Crucial',  category: 'Accessories', processor: null, ram: null, storage: null, displaySize: null, unitPrice: 14_000, costRatio: 0.75, stock: 30, reorder: 10, warranty: 60 },
  { name: 'Targus 15.6" Laptop Bag',    brand: 'Targus',   category: 'Accessories', processor: null, ram: null, storage: null, displaySize: null, unitPrice: 4_200,  costRatio: 0.67, stock: 45, reorder: 15, warranty: 12 },
] as const;

const SKU_PREFIX: Record<string, string> = {
  'Gaming Laptop':   'GL',
  'Ultrabook':       'UB',
  'Business Laptop': 'BL',
  'Standard Laptop': 'SL',
  'Workstation':     'WS',
  'Accessories':     'AC',
};

// How often each category sells relative to others (accessories sell most units)
const CATEGORY_POPULARITY: Record<string, number> = {
  'Gaming Laptop':   1.3,
  'Ultrabook':       1.5,
  'Business Laptop': 1.0,
  'Standard Laptop': 1.8,
  'Workstation':     0.4,
  'Accessories':     2.2,
};

function buildProducts(): { drafts: ProductDraft[]; popularity: number[] } {
  const counters: Record<string, number> = {};
  const drafts: ProductDraft[] = [];
  const popularity: number[] = [];

  for (const entry of PRODUCT_CATALOG) {
    counters[entry.category] = (counters[entry.category] ?? 0) + 1;
    const sku = `${SKU_PREFIX[entry.category]}-${String(counters[entry.category]).padStart(3, '0')}`;
    drafts.push({
      name: entry.name,
      sku,
      brand: entry.brand,
      category: entry.category,
      processor: entry.processor ?? null,
      ram: entry.ram ?? null,
      storage: entry.storage ?? null,
      displaySize: entry.displaySize ?? null,
      unitPrice: entry.unitPrice,
      costPrice: round2(entry.unitPrice * entry.costRatio),
      stockQuantity: entry.stock,
      reorderLevel: entry.reorder,
      warrantyMonths: entry.warranty,
    });
    // Per-product popularity = category weight × small random jitter
    popularity.push(CATEGORY_POPULARITY[entry.category] * randFloat(0.75, 1.25));
  }

  return { drafts, popularity };
}

/* ── Sales (Jan 2025 – Jun 2026) ─────────────────────────────────────────── */

const SALE_MONTHS = 18;
const BASE_MONTHLY_SALES = 22;

const PAYMENT_MODES   = ['Cash', 'Card', 'Bank Transfer', 'Lease Financing'] as const;
const PAYMENT_WEIGHTS = [0.25, 0.45, 0.20, 0.10]; // Card most common in modern Sri Lanka

interface SaleRow {
  customerId:  number;
  productId:   number;
  quantity:    number;
  unitPrice:   number;
  totalAmount: number;
  saleDate:    Date;
  region:      string;
  paymentMode: string;
}

/**
 * Sri Lankan seasonal factor for tech retail:
 *  - April  (month 3):  Sinhala/Tamil New Year — big gift & upgrade season
 *  - Aug/Sep (month 7-8): Back-to-school & corporate refresh
 *  - Nov/Dec (month 10-11): Year-end corporate budgets + festive shopping
 *  - Jan/Feb (month 0-1): Post-holiday dip
 */
function seasonalFactor(m: number): number {
  const annual = 0.35 * Math.sin((2 * Math.PI * (m - 7)) / 12);  // broad Nov peak
  const newYear = 0.25 * Math.exp(-0.5 * ((m - 3) / 1.0) ** 2); // sharp April spike
  return 1.0 + annual + newYear;
}

function buildSales(
  customers: Array<{ id: number; region: string; segment: string; acquisitionDate: Date }>,
  products:  Array<{ id: number; unitPrice: number; category: string; popularity: number }>,
): SaleRow[] {
  const rows: SaleRow[] = [];

  for (let monthIndex = 0; monthIndex < SALE_MONTHS; monthIndex++) {
    const year        = 2025 + Math.floor(monthIndex / 12);
    const monthOfYear = monthIndex % 12;
    const growth      = Math.pow(1.02, monthIndex);           // ~2% MoM growth
    const jitter      = 1 + (rand() - 0.5) * 0.12;
    const salesCount  = Math.max(5, Math.round(BASE_MONTHLY_SALES * growth * seasonalFactor(monthOfYear) * jitter));
    const daysInMonth = new Date(year, monthOfYear + 1, 0).getDate();

    for (let i = 0; i < salesCount; i++) {
      const saleDate = new Date(year, monthOfYear, randInt(1, daysInMonth), randInt(9, 18), randInt(0, 59));

      // Only customers acquired before the sale can buy
      const eligible = customers.filter(c => c.acquisitionDate <= saleDate);
      const customer = pick(eligible.length > 0 ? eligible : customers);
      const product  = weightedPick(products, p => p.popularity);

      // Corporate & Education bulk-buy; Gaming & Individual buy 1-2 units
      const isAccessory = product.category === 'Accessories';
      const maxQty = isAccessory ? 5
        : customer.segment === 'Corporate'  ? 20
        : customer.segment === 'Education'  ? 15
        : 2;
      const quantity = randInt(1, maxQty);

      // ~22% chance of a promotional discount (5–15%)
      const unitPrice = rand() < 0.22
        ? round2(product.unitPrice * (1 - randFloat(0.05, 0.15)))
        : product.unitPrice;

      // Weighted payment mode pick
      let ticket = rand();
      let paymentMode = 'Cash';
      for (let p = 0; p < PAYMENT_MODES.length; p++) {
        ticket -= PAYMENT_WEIGHTS[p];
        if (ticket <= 0) { paymentMode = PAYMENT_MODES[p]; break; }
      }

      rows.push({
        customerId:  customer.id,
        productId:   product.id,
        quantity,
        unitPrice,
        totalAmount: round2(quantity * unitPrice),
        saleDate,
        region:      customer.region,
        paymentMode,
      });
    }
  }

  return rows;
}

/* ── Financial Records (18 months of monthly P&L in LKR) ────────────────── */

interface FinancialRow {
  recordDate: Date;
  recordType: string;
  category:   string;
  amount:     number;
  description: string;
}

// Store staff list – roles and base monthly salaries in LKR
const STAFF = [
  { role: 'Store Manager',       salary: 150_000 },
  { role: 'Senior Sales Executive', salary: 95_000 },
  { role: 'Sales Executive',     salary: 75_000 },
  { role: 'Sales Executive',     salary: 75_000 },
  { role: 'Sales Executive',     salary: 75_000 },
  { role: 'Service Technician',  salary: 85_000 },
  { role: 'Service Technician',  salary: 85_000 },
  { role: 'Admin & Accounts',    salary: 65_000 },
];
const SALARY_BASE = STAFF.reduce((s, e) => s + e.salary, 0); // 705,000 LKR

const MARKETING_CHANNELS: Array<[string, number]> = [
  ['Social Media Advertising', 0.35],
  ['Print & Newspaper',        0.20],
  ['Tech Exhibitions',         0.25],
  ['Promotions & Discounts',   0.20],
];

const UTILITY_LINES: Array<[string, number]> = [
  ['Electricity & Air Conditioning', 0.60],
  ['Internet & Telecom',             0.25],
  ['Water & Sanitation',             0.15],
];

function buildFinancialRecords(
  sales:      SaleRow[],
  productById: Map<number, { category: string; costPrice: number; unitPrice: number }>,
): FinancialRow[] {
  // Aggregate revenue & COGS per month per product category from actual sales
  const monthRevenue = new Map<string, Map<string, number>>();
  const monthCogs    = new Map<string, Map<string, number>>();

  for (const sale of sales) {
    const key     = `${sale.saleDate.getFullYear()}-${sale.saleDate.getMonth()}`;
    const product = productById.get(sale.productId)!;
    // Scale COGS proportionally if a discount was applied
    const cogsUnit  = product.costPrice * (sale.unitPrice / product.unitPrice);
    const cogsTotal = round2(cogsUnit * sale.quantity);

    if (!monthRevenue.has(key)) monthRevenue.set(key, new Map());
    if (!monthCogs.has(key))    monthCogs.set(key,    new Map());

    const rev  = monthRevenue.get(key)!;
    const cogs = monthCogs.get(key)!;
    rev.set(product.category,  (rev.get(product.category)  ?? 0) + sale.totalAmount);
    cogs.set(product.category, (cogs.get(product.category) ?? 0) + cogsTotal);
  }

  const records: FinancialRow[] = [];
  let salaryMultiplier = 1.0; // salaries grow 0.5%/month

  for (let monthIndex = 0; monthIndex < SALE_MONTHS; monthIndex++) {
    const year        = 2025 + Math.floor(monthIndex / 12);
    const month       = monthIndex % 12;
    const key         = `${year}-${month}`;
    const monthLabel  = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rd = () => new Date(year, month, randInt(1, daysInMonth), randInt(9, 17), randInt(0, 59));

    const revByCategory  = monthRevenue.get(key) ?? new Map<string, number>();
    const cogsByCategory = monthCogs.get(key)    ?? new Map<string, number>();
    const totalRevenue   = [...revByCategory.values()].reduce((s, v) => s + v, 0);

    // Revenue – one line per laptop category
    for (const [category, amount] of revByCategory) {
      records.push({ recordDate: rd(), recordType: 'Revenue', category, amount: round2(amount), description: `Sales revenue – ${category} (${monthLabel} ${year})` });
    }

    // COGS – one line per laptop category
    let totalCogs = 0;
    for (const [category, amount] of cogsByCategory) {
      const cogsAmt = round2(amount);
      totalCogs += cogsAmt;
      records.push({ recordDate: rd(), recordType: 'COGS', category: 'COGS', amount: cogsAmt, description: `Cost of goods sold – ${category} (${monthLabel} ${year})` });
    }

    // Salaries – slight growth each month
    let totalSalaries = 0;
    for (const staff of STAFF) {
      const amount = round2(staff.salary * salaryMultiplier);
      totalSalaries += amount;
      records.push({ recordDate: rd(), recordType: 'Expense', category: 'Salaries', amount, description: `Salary – ${staff.role} (${monthLabel} ${year})` });
    }
    salaryMultiplier *= 1.005;

    // Rent – showroom (Colombo 03) + warehouse (Peliyagoda)
    const rentShowroom  = 180_000;
    const rentWarehouse = 45_000;
    records.push({ recordDate: rd(), recordType: 'Expense', category: 'Rent', amount: rentShowroom,  description: `Showroom rent – Colombo 03 (${monthLabel} ${year})` });
    records.push({ recordDate: rd(), recordType: 'Expense', category: 'Rent', amount: rentWarehouse, description: `Warehouse rent – Peliyagoda (${monthLabel} ${year})` });

    // Marketing – boosted in April (New Year) and Nov–Dec (year-end)
    const isNewYear = month === 3;
    const isFestive = month >= 10;
    const mktBase   = randFloat(40_000, 80_000);
    const mktTotal  = mktBase * (isNewYear ? 1.6 : isFestive ? 1.35 : 1.0);
    for (const [channel, share] of MARKETING_CHANNELS) {
      records.push({ recordDate: rd(), recordType: 'Expense', category: 'Marketing', amount: round2(mktTotal * share), description: `Marketing – ${channel} (${monthLabel} ${year})` });
    }

    // Utilities – higher in Q4 (A/C running more)
    const utilTotal = randFloat(25_000, 45_000) * (isFestive ? 1.15 : 1.0);
    for (const [line, share] of UTILITY_LINES) {
      records.push({ recordDate: rd(), recordType: 'Expense', category: 'Utilities', amount: round2(utilTotal * share), description: `Utilities – ${line} (${monthLabel} ${year})` });
    }

    // Tax – 18% of positive monthly profit (Sri Lanka corporate tax)
    const totalExpenses = totalCogs + totalSalaries + mktTotal + rentShowroom + rentWarehouse + utilTotal;
    const profit = totalRevenue - totalExpenses;
    if (profit > 0) {
      records.push({ recordDate: rd(), recordType: 'Tax', category: 'Tax', amount: round2(profit * 0.18), description: `Corporate income tax – 18% of net profit (${monthLabel} ${year})` });
    }
  }

  return records;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

const INSERT_CHUNK = 250; // keep each insert well within SQLite's parameter limit

async function main(): Promise<void> {
  console.log('Clearing existing data ...');
  await prisma.sale.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  console.log('Seeding 40 customers ...');
  await prisma.customer.createMany({ data: buildCustomers() });
  const customers = await prisma.customer.findMany({ orderBy: { id: 'asc' } });

  console.log('Seeding 25 products ...');
  const { drafts: productDrafts, popularity } = buildProducts();
  await prisma.product.createMany({ data: productDrafts });
  const productRows = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  const productPool = productRows.map((row, i) => ({ ...row, popularity: popularity[i] }));

  console.log('Seeding sales (Jan 2025 – Jun 2026) ...');
  const sales = buildSales(customers, productPool);
  for (let i = 0; i < sales.length; i += INSERT_CHUNK) {
    await prisma.sale.createMany({ data: sales.slice(i, i + INSERT_CHUNK) });
  }

  console.log('Seeding financial records ...');
  const productById = new Map(productRows.map(p => [p.id, { category: p.category, costPrice: p.costPrice, unitPrice: p.unitPrice }]));
  const financialRecords = buildFinancialRecords(sales, productById);
  for (let i = 0; i < financialRecords.length; i += INSERT_CHUNK) {
    await prisma.financialRecord.createMany({ data: financialRecords.slice(i, i + INSERT_CHUNK) });
  }

  console.log('\n✅  Lumina Laptop Store seed complete!');
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
