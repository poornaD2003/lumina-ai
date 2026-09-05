// backend/src/services/scraperService.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CompetitorPrice {
  storeName: string;
  price: number;
  productTitle: string;
  url: string;
  isLive: boolean;
}

/** A raw product candidate extracted from a retailer's search response. */
type Candidate = {
  title: string;
  price: number;
  url: string;
};

type Retailer = {
  name: string;
  /** Skip retailers whose sites cannot be scraped server-side. */
  enabled?: boolean;
  /** Build the search URL; `query` is already URL-encoded by the caller. */
  searchUrl: (query: string) => string;
  /** Extract product candidates from the response body (HTML string or parsed JSON). */
  extract: (body: any, searchUrl: string) => Candidate[];
};

const retailers: Retailer[] = [
  {
    name: 'TechZone',
    searchUrl: (query) => `https://www.techzone.lk/?s=${query}&post_type=product`,
    extract: () => [],
    // techzone.lk sits behind a Cloudflare JS challenge ("Just a moment...")
    // that rejects every non-browser HTTP client with 403. Skip it until a
    // headless-browser scraper is available.
    enabled: false,
  },
  {
    name: 'Nanotek',
    searchUrl: (query) => `https://www.nanotek.lk/?s=${query}`,
    extract: () => [],
    // Nanotek is a JS-only storefront: URL search params render the homepage
    // and product prices load client-side, so it cannot be scraped with
    // plain HTTP requests.
    enabled: false,
  },
  {
    // Barclays serves plain server-rendered HTML search results.
    name: 'Barclays',
    searchUrl: (query) => `https://barclays.lk/?s=${query}&post_type=product`,
    extract: (html, searchUrl) => {
      const $ = cheerio.load(html);
      const candidates: Candidate[] = [];

      for (const element of $('li.product, .product-item, .product-grid-item').toArray()) {
        const item = $(element);
        const title = item
          .find('[class*="title"], .product-title, .name, h2, h3')
          .first()
          .text()
          .trim();
        const priceText =
          item.find('[class*="price"], .amount, .price').first().text() ||
          item.find('[data-price]').attr('data-price') ||
          '';
        const price = parsePrice(priceText);
        if (title && price) {
          candidates.push({
            title,
            price,
            url: item.find('a').first().attr('href') || searchUrl,
          });
        }
      }

      // Some stores also expose products as schema.org JSON-LD blocks.
      for (const element of $('script[type="application/ld+json"]').toArray()) {
        const parsed = safeJsonParse($(element).html() ?? '');
        for (const value of Array.isArray(parsed) ? parsed : [parsed]) {
          if (value?.['@type'] !== 'Product') continue;
          const price = parsePrice(String(value?.offers?.price ?? ''));
          if (!price) continue;
          candidates.push({
            title: String(value?.name ?? ''),
            price,
            url: String(value?.url ?? searchUrl),
          });
        }
      }

      return candidates;
    },
  },
  {
    // Daraz renders search results as JSON when ajax=true (the plain catalog
    // page is a client-side React app with no product data in the HTML).
    name: 'Daraz',
    searchUrl: (query) => `https://www.daraz.lk/catalog/?ajax=true&q=${query}`,
    extract: (body, searchUrl) => {
      const data = typeof body === 'string' ? safeJsonParse(body) : body;
      const items = data?.mods?.listItems;
      if (!Array.isArray(items)) return [];

      const candidates: Candidate[] = [];
      for (const item of items) {
        const price = parsePrice(String(item?.price ?? item?.priceShow ?? ''));
        if (!price) continue;
        const url = String(item?.itemUrl ?? '');
        candidates.push({
          title: String(item?.name ?? ''),
          price,
          url: url.startsWith('//') ? `https:${url}` : url || searchUrl,
        });
      }
      return candidates;
    },
  },
  {
    // ikman's search results are server-rendered, with the ad list embedded
    // as JSON in window.initialData.
    name: 'ikman',
    searchUrl: (query) => `https://ikman.lk/en/ads/sri-lanka?query=${query}`,
    extract: (body, searchUrl) => {
      const html = String(body);
      const match = html.match(/window\.initialData\s*=\s*([\s\S]*?)<\/script>/);
      if (!match) return [];

      const data = safeJsonParse(match[1].trim().replace(/;$/, ''));
      const ads = data?.serp?.ads?.data?.ads;
      if (!Array.isArray(ads)) return [];

      const candidates: Candidate[] = [];
      for (const ad of ads) {
        const price = parsePrice(String(ad?.price ?? ''));
        if (!price) continue;
        const slug = String(ad?.slug ?? '');
        candidates.push({
          title: String(ad?.title ?? ''),
          price,
          url: slug ? `https://ikman.lk/en/ads/${slug}` : searchUrl,
        });
      }
      return candidates;
    },
  },
];

const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
};

const safeJsonParse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const parsePrice = (value: string): number | null => {
  const match = value.replace(/,/g, '').match(/(?:LKR|Rs\.?|රු\.?)?\s*([0-9]{4,})/i);
  const price = match ? Number(match[1]) : NaN;
  return Number.isFinite(price) && price > 0 ? price : null;
};

// ---------------------------------------------------------------------------
// Relevance matching
// ---------------------------------------------------------------------------

const tokenize = (name: string): string[] =>
  name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2);

/** Fraction of query tokens present in the candidate title (0..1). */
const relevanceScore = (queryTokens: string[], title: string): number => {
  if (queryTokens.length === 0) return 0;
  const lower = title.toLowerCase();
  const matched = queryTokens.filter((token) => lower.includes(token)).length;
  return matched / queryTokens.length;
};

/** Minimum fraction of query tokens a candidate title must contain. */
const MIN_RELEVANCE = 0.6;

/** Accessory words that indicate a listing is NOT the queried product itself. */
const ACCESSORY_KEYWORDS = [
  'case', 'cover', 'skin', 'sleeve', 'sticker', 'keycap', 'keyboard', 'dock',
  'docking', 'mount', 'stand', 'cable', 'adapter', 'fan', 'filter', 'bag',
  'pouch', 'holder', 'motherboard', 'protector', 'bracket', 'rail',
];

const ACCESSORY_PATTERN = new RegExp(`\\b(?:${ACCESSORY_KEYWORDS.join('|')})\\b`, 'i');

/**
 * Accessory listings ("Keycap For Asus ROG Strix G16", "Case for ASUS ROG
 * Ally", ...) frequently contain every query token while costing a fraction
 * of the product's price. Reject them unless the query itself asks for an
 * accessory.
 */
const looksLikeAccessory = (queryTokens: string[], title: string): boolean =>
  ACCESSORY_PATTERN.test(title) && !ACCESSORY_KEYWORDS.some((keyword) => queryTokens.includes(keyword));

/**
 * Pick the best-matching candidate for the queried product. Store searches
 * often return loosely-related items (e.g. a Dell laptop for an ASUS ROG
 * query), so candidates below the relevance threshold are rejected instead
 * of being reported as competitor prices.
 */
const pickBestMatch = (
  storeName: string,
  candidates: Candidate[],
  productName: string,
  searchUrl: string,
): CompetitorPrice | null => {
  const queryTokens = tokenize(productName);
  let best: Candidate | null = null;
  let bestScore = MIN_RELEVANCE;

  for (const candidate of candidates) {
    if (looksLikeAccessory(queryTokens, candidate.title)) continue;
    const score = relevanceScore(queryTokens, candidate.title);
    // Strictly greater keeps the earlier candidate on ties, which matches
    // the store's own relevance ranking.
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    storeName,
    price: best.price,
    productTitle: best.title,
    url: best.url || searchUrl,
    isLive: true,
  };
};

// ---------------------------------------------------------------------------
// Scraping pipeline
// ---------------------------------------------------------------------------

const scrapeRetailer = async (retailer: Retailer, productName: string): Promise<CompetitorPrice | null> => {
  const searchUrl = retailer.searchUrl(encodeURIComponent(productName).replace(/%20/g, '+'));
  try {
    const { data: body } = await axios.get<any>(searchUrl, {
      headers: {
        ...requestHeaders,
        // Look like an in-site navigation from the retailer's own homepage.
        Referer: new URL(searchUrl).origin + '/',
      },
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    return pickBestMatch(retailer.name, retailer.extract(body, searchUrl), productName, searchUrl);
  } catch (error) {
    console.warn(`${retailer.name} scraping failed:`, error instanceof Error ? error.message : error);
    return null;
  }
};

export const fetchRealCompetitorPrices = async (productName: string): Promise<CompetitorPrice[]> => {
  const activeRetailers = retailers.filter((retailer) => retailer.enabled !== false);
  const results = await Promise.all(activeRetailers.map((retailer) => scrapeRetailer(retailer, productName)));
  return results.filter((result): result is CompetitorPrice => result !== null);
};
