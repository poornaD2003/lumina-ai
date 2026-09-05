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

type Retailer = {
  name: string;
  searchUrl: (query: string) => string;
  selectors: string[];
};

const retailers: Retailer[] = [
  {
    name: 'TechZone',
    searchUrl: (query) => `https://www.techzone.lk/?s=${query}&post_type=product`,
    selectors: ['.product-grid-item', '.product-item', 'li.product'],
  },
  {
    name: 'Nanotek',
    searchUrl: (query) => `https://www.nanotek.lk/?s=${query}`,
    selectors: ['li.product', '.product-item', '.product-grid-item'],
  },
  {
    name: 'Barclays',
    searchUrl: (query) => `https://barclays.lk/?s=${query}&post_type=product`,
    selectors: ['li.product', '.product-item', '.product-grid-item'],
  },
  {
    name: 'Daraz',
    searchUrl: (query) => `https://www.daraz.lk/catalog/?q=${query}`,
    selectors: ['[data-qa-locator="product-item"]', '[data-qa-locator="product-card"]', '.Bm3ON'],
  },
];

const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const parsePrice = (value: string): number | null => {
  const match = value.replace(/,/g, '').match(/(?:LKR|Rs\.?|රු\.?)?\s*([0-9]{4,})/i);
  const price = match ? Number(match[1]) : NaN;
  return Number.isFinite(price) && price > 0 ? price : null;
};

const scrapeRetailer = async (retailer: Retailer, productName: string): Promise<CompetitorPrice | null> => {
  const searchUrl = retailer.searchUrl(encodeURIComponent(productName));
  try {
    const { data: html } = await axios.get<string>(searchUrl, {
      headers: requestHeaders,
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    const $ = cheerio.load(html);
    let product = $(retailer.selectors.join(',')).first();

    if (!product.length) {
      const jsonProduct = $('script[type="application/ld+json"]').toArray()
        .map((element) => {
          try { return JSON.parse($(element).html() ?? ''); } catch { return null; }
        })
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .find((value) => value?.['@type'] === 'Product' && value?.offers?.price);
      if (jsonProduct) {
        const price = parsePrice(String(jsonProduct.offers.price));
        if (price) {
          return {
            storeName: retailer.name,
            price,
            productTitle: jsonProduct.name || productName,
            url: jsonProduct.url || searchUrl,
            isLive: true,
          };
        }
      }
    }

    if (!product.length) return null;
    const title = product.find('[class*="title"], .product-title, .name, h2, h3').first().text().trim() || productName;
    const priceText = product.find('[class*="price"], .amount, .price, [data-price]').first().text()
      || product.find('[data-price]').attr('data-price')
      || '';
    const price = parsePrice(priceText);
    if (!price) return null;
    return {
      storeName: retailer.name,
      price,
      productTitle: title,
      url: product.find('a').first().attr('href') || searchUrl,
      isLive: true,
    };
  } catch (error) {
    console.warn(`${retailer.name} scraping failed:`, error instanceof Error ? error.message : error);
    return null;
  }
};

export const fetchRealCompetitorPrices = async (productName: string): Promise<CompetitorPrice[]> => {
  const results = await Promise.all(retailers.map((retailer) => scrapeRetailer(retailer, productName)));
  return results.filter((result): result is CompetitorPrice => result !== null);
};