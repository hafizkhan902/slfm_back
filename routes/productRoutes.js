import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { cacheProducts } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', cacheProducts, getProducts);
router.get('/:id', getProductById);
router.post('/admin', protect, adminOnly, createProduct);
router.post('/', protect, adminOnly, createProduct);
router.put('/admin/:id', protect, adminOnly, updateProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/admin/:id', protect, adminOnly, deleteProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
