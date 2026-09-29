import express from 'express';
import { logSession, getVisitorLogs } from '../controllers/visitorController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/log', logSession);
router.get('/', protect, adminOnly, getVisitorLogs);

export default router;
