import express from 'express';
import multer from 'multer';
import { getThemeSection, updateThemeSection } from '../controllers/themeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Memory storage for image buffers to process with Cloudinary or save locally
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public: Fetch theme section content
router.get('/', getThemeSection);

// Admin Protected: Update theme section content (accepts JSON or multipart/form-data)
router.put('/', protect, adminOnly, upload.any(), updateThemeSection);

export default router;
