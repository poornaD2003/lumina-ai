import { Router } from 'express';
import { getPricingSuggestions, applyPriceUpdate } from '../Controlller/pricingController';

const router = Router();

router.get('/suggestions', getPricingSuggestions);
router.post('/apply', applyPriceUpdate);

export default router;