import { Router } from 'express';
import { createProduct, listProducts, updateProduct } from '../Controlller/productController.js';

const router = Router();
router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
export default router;