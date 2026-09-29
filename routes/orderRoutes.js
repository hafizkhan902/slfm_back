import express from 'express';
import {
  createOrder,
  trackOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  downloadOrderReceipt
} from '../controllers/orderController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { orderLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/', orderLimiter, createOrder);
router.get('/track/:orderNumber', trackOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/admin/all', protect, adminOnly, getAllOrders);
router.get('/admin', protect, adminOnly, getAllOrders);
router.get('/', protect, adminOnly, getAllOrders);

// PDF Receipt Generation Endpoints
router.get('/admin/:orderNumber/pdf', downloadOrderReceipt);
router.get('/:orderNumber/pdf', downloadOrderReceipt);

router.patch('/admin/:orderNumber/status', protect, adminOnly, updateOrderStatus);
router.patch('/:orderNumber/status', protect, adminOnly, updateOrderStatus);

export default router;
