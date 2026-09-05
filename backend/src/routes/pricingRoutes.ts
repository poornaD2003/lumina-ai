// backend/src/routes/pricingRoutes.ts
import { Router } from 'express';
import {
	suggestProductPrice,
	suggestAllProductPrices,
	applySuggestedPrice,
	getCompetitorAndAISuggestion,
	getPricingProducts,
} from '../Controlller/pricingController';

const router = Router();

router.post('/suggest-price', suggestProductPrice);
router.post('/analyze', getCompetitorAndAISuggestion);
router.get('/products', getPricingProducts);
router.get('/suggestions', suggestAllProductPrices);
router.post('/apply-price', applySuggestedPrice);

export default router;