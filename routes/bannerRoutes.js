import express from 'express';
import multer from 'multer';
import { getNativeBanner, updateNativeBanner } from '../controllers/bannerController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for native banners!'), false);
    }
  }
});

// Public: Fetch active native banner config
router.get('/', getNativeBanner);

// Admin Protected: Update native banner config
router.put('/', protect, adminOnly, upload.single('bannerImage'), updateNativeBanner);

export default router;
