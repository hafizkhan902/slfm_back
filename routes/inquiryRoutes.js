import express from 'express';
import multer from 'multer';
import {
  createCustomInquiry,
  getAllInquiries,
  getMyInquiries,
  getInquiryById,
  updateInquiryStatus,
  confirmInquiryToOrder,
  deleteInquiry
} from '../controllers/inquiryController.js';
import { protect, adminOnly, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure Multer in-memory storage for up to 5 image uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed!'), false);
    }
  }
});

// Middleware to gracefully catch Multer limits or filter errors
const handleUpload = (req, res, next) => {
  upload.array('referenceImages', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files uploaded. Maximum allowed is 5 images.' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Each image must be under 10MB.' });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Customer / Public Endpoint: Submit custom inquiry with reference photos
router.post('/custom', optionalProtect, handleUpload, createCustomInquiry);

// Authenticated Customer Endpoint: Get inquiries submitted by logged-in user
router.get('/my', protect, getMyInquiries);

// Admin Management Endpoints
router.get('/', protect, adminOnly, getAllInquiries);
router.get('/:id', protect, getInquiryById);
router.patch('/:id/status', protect, adminOnly, updateInquiryStatus);
router.post('/:id/confirm-order', protect, adminOnly, confirmInquiryToOrder);
router.delete('/:id', protect, adminOnly, deleteInquiry);

export default router;
