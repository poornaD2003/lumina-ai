import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root - MUST happen before any route/service imports
// that read process.env at module scope (e.g. BusinessAgent constructor).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import dashboardRoutes from './routes/dashboard.js';
import agentRoutes from './routes/agent.js';
import pricingRoutes from './routes/pricingRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard analytics API
app.use('/api/dashboard', dashboardRoutes);

// AI agent chat API
app.use('/api/agent', agentRoutes);

// Pricing Engine API
app.use('/api/pricing', pricingRoutes);

import { getRestockPlan } from './Controlller/stockController.js';
import {
  generatePurchaseOrders,
  listPurchaseOrders,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from './Controlller/purchaseOrderController.js';

// Restock plan + purchase order lifecycle (generate -> receive/cancel)
app.get('/api/restock-plan', getRestockPlan);
app.get('/api/restock-plan/orders', listPurchaseOrders);
app.post('/api/restock-plan/generate-po', generatePurchaseOrders);
app.post('/api/restock-plan/orders/:id/receive', receivePurchaseOrder);
app.post('/api/restock-plan/orders/:id/cancel', cancelPurchaseOrder);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Lumina Backend API is running!');
});
export default app;
