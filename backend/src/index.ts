import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import dashboardRoutes from './routes/dashboard.js';
import agentRoutes from './routes/agent.js';
import pricingRoutes from './routes/pricingRoutes';
import { getRestockPlan } from './Controlller/stockController.js';
import {
  generatePurchaseOrders,
  listPurchaseOrders,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from './Controlller/purchaseOrderController.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup to allow Vercel Frontend & Localhost
app.use(cors({
  origin: '*', // Vercel සහ Localhost දෙකටම සපෝට් කරයි
  credentials: true
}));

app.use(express.json());

// Root health check route (FIXED: Placed before error handler & routes)
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Lumina Backend API is live and running successfully!'
  });
});

// Health check API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard analytics API
app.use('/api/dashboard', dashboardRoutes);

// AI agent chat API
app.use('/api/agent', agentRoutes);

// Pricing Engine API
app.use('/api/pricing', pricingRoutes);

// Restock plan + purchase order lifecycle
app.get('/api/restock-plan', getRestockPlan);
app.get('/api/restock-plan/orders', listPurchaseOrders);
app.post('/api/restock-plan/generate-po', generatePurchaseOrders);
app.post('/api/restock-plan/orders/:id/receive', receivePurchaseOrder);
app.post('/api/restock-plan/orders/:id/cancel', cancelPurchaseOrder);

// Error handler (MUST be the last middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;