import express from 'express';
import {
  getGeoDivisions,
  getGeoDistricts,
  getGeoUpazilas,
  searchGeo,
  getActiveDeliveryAreas,
  getActiveHierarchy,
  validateUpazila,
  getAllDeliveryAreas,
  createDeliveryAreas,
  updateDeliveryArea,
  toggleDeliveryAreaStatus,
  bulkUpdateFee,
  bulkUpdateStatus,
  deleteDeliveryArea,
  bulkDeleteDeliveryAreas
} from '../controllers/deliveryController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// Public Geo Master Data & Checkout Routes
// ==========================================
router.get('/geo/divisions', getGeoDivisions);
router.get('/geo/districts', getGeoDistricts);
router.get('/geo/upazilas', getGeoUpazilas);
router.get('/geo/search', searchGeo);

router.get('/areas', getActiveDeliveryAreas);
router.get('/areas/active', getActiveDeliveryAreas);
router.get('/areas/hierarchy', getActiveHierarchy);
router.get('/validate/:upazilaId', validateUpazila);

// ==========================================
// Admin Delivery Area Management Routes
// ==========================================
router.get('/admin/areas', protect, adminOnly, getAllDeliveryAreas);
router.post('/admin/areas', protect, adminOnly, createDeliveryAreas);
router.put('/admin/areas/:id', protect, adminOnly, updateDeliveryArea);
router.patch('/admin/areas/:id/status', protect, adminOnly, toggleDeliveryAreaStatus);
router.patch('/admin/areas/bulk-fee', protect, adminOnly, bulkUpdateFee);
router.patch('/admin/areas/bulk-status', protect, adminOnly, bulkUpdateStatus);
router.delete('/admin/areas/:id', protect, adminOnly, deleteDeliveryArea);
router.delete('/admin/areas/bulk-delete', protect, adminOnly, bulkDeleteDeliveryAreas);

export default router;
