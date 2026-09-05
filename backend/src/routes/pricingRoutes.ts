// backend/src/routes/pricingRoutes.ts
import { Router } from 'express';
import { suggestProductPrice, suggestAllProductPrices, applySuggestedPrice } from '../Controlller/pricingController';

const router = Router();

router.post('/suggest-price', suggestProductPrice);
router.get('/suggestions', suggestAllProductPrices);
router.post('/apply-price', applySuggestedPrice);

export default router;