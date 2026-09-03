import { Router } from 'express';
import { getRestockPlan } from '../Controlller/stockController';
import { generatePurchaseOrders } from '../Controlller/purchaseOrderController';

const router = Router();

router.get('/suggestions', getRestockPlan);
router.post('/apply', generatePurchaseOrders);

export default router;