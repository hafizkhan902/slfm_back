import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ThemeSection, defaultThemeData } from '../models/ThemeSection.js';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to upload image buffer to Cloudinary with local disk fallback.
 */
const uploadSingleImage = async (file) => {
  const isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (isCloudinaryConfigured) {
    try {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;

      const uploadResponse = await cloudinary.uploader.upload(dataUri, {
        folder: 'shahlajuk_themes',
        resource_type: 'auto',
        transformation: [
          { width: 1600, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });

      if (uploadResponse && uploadResponse.secure_url) {
        return uploadResponse.secure_url;
      }
    } catch (err) {
      console.warn('⚠️ [Cloudinary] Theme image upload failed, falling back to local disk:', err.message);
    }
  }

  // Fallback: Save file to local uploads directory
  try {
    const uploadDir = path.resolve(__dirname, '../uploads/themes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeExt = path.extname(file.originalname) || (file.mimetype.includes('png') ? '.png' : '.jpg');
    const filename = `theme-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/themes/${filename}`;
  } catch (localErr) {
    console.error('❌ Failed to save theme image locally:', localErr);
    const b64 = Buffer.from(file.buffer).toString('base64');
    return `data:${file.mimetype};base64,${b64}`;
  }
};

/**
 * Helper to safely parse JSON if sent in multipart/form-data
 */
const parseJsonField = (field, fallback = null) => {
  if (!field) return fallback;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return fallback;
  }
};

// @desc    Get Curated Architecture & Themes section content (Public)
// @route   GET /api/theme-section
// @access  Public
export const getThemeSection = async (req, res, next) => {
  try {
    let section = await ThemeSection.findOne();

    if (!section) {
      try {
        section = await ThemeSection.create(defaultThemeData);
      } catch (err) {
        // In case DB is read-only or in-memory test without write, return default data directly
        return res.json({
          success: true,
          data: defaultThemeData
        });
      }
    }

    // Ensure fallback cards if cards array was somehow emptied
    if (!section.cards || section.cards.length === 0) {
      section.cards = defaultThemeData.cards;
    }

    res.json({
      success: true,
      data: section
    });
  } catch (error) {
    console.error('❌ Error fetching theme section:', error);
    // Graceful fallback to default data so storefront never breaks
    res.json({
      success: true,
      data: defaultThemeData
    });
  }
};

// @desc    Update Curated Architecture & Themes section content (Admin Protected)
// @route   PUT /api/theme-section
// @access  Private / Admin
export const updateThemeSection = async (req, res, next) => {
  try {
    let section = await ThemeSection.findOne();
    if (!section) {
      section = new ThemeSection(defaultThemeData);
    }

    const rawBody = req.body || {};

    // 1. Update Header text if provided
    if (typeof rawBody.eyebrow === 'string') {
      section.eyebrow = rawBody.eyebrow.trim();
    }
    if (typeof rawBody.heading === 'string') {
      section.heading = rawBody.heading.trim();
    }
    if (typeof rawBody.subheading === 'string') {
      section.subheading = rawBody.subheading.trim();
    }

    // 2. Parse cards from payload
    let incomingCards = parseJsonField(rawBody.cards, rawBody.cards);

    if (Array.isArray(incomingCards)) {
      // Map existing or new cards
      section.cards = incomingCards.map((card, idx) => ({
        badgeText: card.badgeText ?? section.cards?.[idx]?.badgeText ?? `THEME 0${idx + 1}`,
        imageUrl: card.imageUrl ?? section.cards?.[idx]?.imageUrl ?? '',
        category: card.category ?? section.cards?.[idx]?.category ?? '',
        title: card.title ?? section.cards?.[idx]?.title ?? '',
        description: card.description ?? section.cards?.[idx]?.description ?? '',
        buttonText: card.buttonText ?? section.cards?.[idx]?.buttonText ?? 'Explore Collection',
        buttonLink: card.buttonLink ?? section.cards?.[idx]?.buttonLink ?? '/collections',
        order: Number(card.order ?? idx + 1)
      }));
    }

    // 3. Handle any uploaded files (from multipart/form-data)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        // Check fieldname, e.g., 'card_image_0', 'card_image_1', 'card_0', or 'image_0'
        const match = file.fieldname.match(/(\d+)/);
        if (match) {
          const cardIndex = parseInt(match[1], 10);
          if (section.cards && section.cards[cardIndex]) {
            const uploadedUrl = await uploadSingleImage(file);
            section.cards[cardIndex].imageUrl = uploadedUrl;
          }
        }
      }
    } else if (req.file) {
      // Single file upload targeting a cardIndex specified in body
      const cardIndex = parseInt(rawBody.cardIndex || '0', 10);
      if (section.cards && section.cards[cardIndex]) {
        const uploadedUrl = await uploadSingleImage(req.file);
        section.cards[cardIndex].imageUrl = uploadedUrl;
      }
    }

    await section.save();

    res.json({
      success: true,
      message: 'Architecture & Themes section updated successfully',
      data: section
    });
  } catch (error) {
    console.error('❌ Error updating theme section:', error);
    res.status(500).json({
      error: error.message || 'Failed to update theme section'
    });
  }
};
