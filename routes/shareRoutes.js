import express from 'express';
import {
  recordShare,
  getShareHistory,
  deleteShareItem,
  clearShareHistory
} from '../controllers/shareController.js';
import { protect, adminOnly, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', optionalProtect, recordShare);
router.get('/', protect, adminOnly, getShareHistory);
router.delete('/:id', protect, adminOnly, deleteShareItem);
router.delete('/', protect, adminOnly, clearShareHistory);

export default router;
