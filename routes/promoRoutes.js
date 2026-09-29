import express from 'express';
import {
  getPromos,
  createPromo,
  updatePromo,
  deletePromo
} from '../controllers/promoController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { cacheProducts } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', cacheProducts, getPromos);
router.post('/admin', protect, adminOnly, createPromo);
router.put('/admin/:id', protect, adminOnly, updatePromo);
router.delete('/admin/:id', protect, adminOnly, deletePromo);

export default router;
