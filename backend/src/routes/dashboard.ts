/**
 * Dashboard REST API - read-only GET endpoints backed by the analytics and
 * forecast services. Every handler wraps its service call in try/catch and
 * forwards failures to the Express error middleware.
 */
import { Router } from 'express';
import * as analytics from '../services/analytics.js';
import * as forecast from '../services/forecast.js';

const router = Router();

router.get('/kpis', async (_req, res, next) => {
  try {
    res.json(await analytics.getKPIs());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/sales-summary', async (_req, res, next) => {
  try {
    res.json(await analytics.getSalesSummary());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/daily-net-profit', async (_req, res, next) => {
  try {
    res.json(await analytics.getDailyNetProfitHistory());
  } catch (error) {
    next(error as Error);
  }
});

router.post('/daily-net-profit', async (req, res, next) => {
  try {
    const { date, productId, productName, quantity, sellingPrice, unitCost, revenue, costOfGoods, netProfit } = req.body;
    const values = [productId, quantity, sellingPrice, unitCost, revenue, costOfGoods, netProfit];
    if (
      typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isInteger(productId) || typeof productName !== 'string' || !productName.trim() ||
      values.slice(1).some((value) => typeof value !== 'number' || !Number.isFinite(value))
    ) {
      res.status(400).json({ error: 'date, product, quantity, prices, and profit values are required' });
      return;
    }

    res.json(await analytics.saveDailyProductProfit({ date, productId, productName, quantity, sellingPrice, unitCost, revenue, costOfGoods, netProfit }));
  } catch (error) {
    next(error as Error);
  }
});

router.post('/daily-net-profit/batch', async (req, res, next) => {
  try {
    const records = req.body?.records;
    if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ error: 'At least one sale record is required' });
    const valid = records.every((record) => {
      const values = [record.quantity, record.sellingPrice, record.unitCost, record.revenue, record.costOfGoods, record.netProfit];
      return typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && Number.isInteger(record.productId) && typeof record.productName === 'string' && record.productName.trim() && values.every((value) => typeof value === 'number' && Number.isFinite(value));
    });
    if (!valid) return res.status(400).json({ error: 'Invalid sale record' });
    res.json(await analytics.saveDailyProductProfits(records));
  } catch (error) {
    next(error as Error);
  }
});

router.get('/customer-segments', async (_req, res, next) => {
  try {
    res.json(await analytics.getCustomerSegments());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/product-performance', async (_req, res, next) => {
  try {
    res.json(await analytics.getProductPerformance());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/financial-overview', async (_req, res, next) => {
  try {
    res.json(await analytics.getFinancialOverview());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/sales-forecast', async (_req, res, next) => {
  try {
    res.json(await forecast.getSalesForecast());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/inventory-alerts', async (_req, res, next) => {
  try {
    res.json(await analytics.getInventoryAlerts());
  } catch (error) {
    next(error as Error);
  }
});

router.get('/sales-by-region', async (_req, res, next) => {
  try {
    res.json(await analytics.getSalesByRegion());
  } catch (error) {
    next(error as Error);
  }
});

export default router;
