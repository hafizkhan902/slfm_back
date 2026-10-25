import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NativeBanner, defaultNativeBannerData } from '../models/NativeBanner.js';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to upload banner image buffer to Cloudinary with local disk fallback.
 */
const uploadBannerImage = async (file) => {
  const isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (isCloudinaryConfigured) {
    try {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataUri = `data:${file.mimetype};base64,${b64}`;

      const uploadResponse = await cloudinary.uploader.upload(dataUri, {
        folder: 'shahlajuk_banners',
        resource_type: 'auto',
        transformation: [
          { width: 640, height: 100, crop: 'limit' }, // Retina 2x for 320x50
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });

      if (uploadResponse && uploadResponse.secure_url) {
        return uploadResponse.secure_url;
      }
    } catch (err) {
      console.warn('⚠️ [Cloudinary] Banner image upload failed, falling back to local disk:', err.message);
    }
  }

  // Fallback: Save file to local uploads directory
  try {
    const uploadDir = path.resolve(__dirname, '../uploads/banners');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeExt = path.extname(file.originalname) || (file.mimetype.includes('png') ? '.png' : '.jpg');
    const filename = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/banners/${filename}`;
  } catch (localErr) {
    console.error('❌ Failed to save banner image locally:', localErr);
    const b64 = Buffer.from(file.buffer).toString('base64');
    return `data:${file.mimetype};base64,${b64}`;
  }
};

// @desc    Get Native Banner (320x50) config
// @route   GET /api/native-banner
// @access  Public
export const getNativeBanner = async (req, res, next) => {
  try {
    let banner = await NativeBanner.findOne();

    if (!banner) {
      try {
        banner = await NativeBanner.create(defaultNativeBannerData);
      } catch (err) {
        return res.json({
          success: true,
          data: defaultNativeBannerData
        });
      }
    }

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('❌ Error fetching native banner:', error);
    res.json({
      success: true,
      data: defaultNativeBannerData
    });
  }
};

// @desc    Update Native Banner (320x50) config
// @route   PUT /api/native-banner
// @access  Private / Admin
export const updateNativeBanner = async (req, res, next) => {
  try {
    let banner = await NativeBanner.findOne();
    if (!banner) {
      banner = new NativeBanner(defaultNativeBannerData);
    }

    const rawBody = req.body || {};

    // 1. Process uploaded image if file was provided
    if (req.file) {
      const uploadedUrl = await uploadBannerImage(req.file);
      if (uploadedUrl) {
        banner.imageUrl = uploadedUrl;
      }
    } else if (typeof rawBody.imageUrl === 'string') {
      banner.imageUrl = rawBody.imageUrl.trim();
    }

    // 2. Update Ad Network Script Code (e.g. Adsterra invoke.js & container div)
    if (typeof rawBody.adScriptCodeBase64 === 'string') {
      try {
        banner.adScriptCode = Buffer.from(rawBody.adScriptCodeBase64, 'base64').toString('utf-8').trim();
      } catch (err) {
        console.warn('Failed to decode adScriptCodeBase64:', err.message);
      }
    } else if (typeof rawBody.adScriptCode === 'string') {
      const unescaped = rawBody.adScriptCode
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&amp;/g, '&');
      banner.adScriptCode = unescaped.trim();
    }

    // 3. Update Adestra link
    if (typeof rawBody.adestraLink === 'string') {
      banner.adestraLink = rawBody.adestraLink.trim();
    }

    // 3. Update Title & Alt Text
    if (typeof rawBody.title === 'string') {
      banner.title = rawBody.title.trim();
    }
    if (typeof rawBody.altText === 'string') {
      banner.altText = rawBody.altText.trim();
    }

    // 4. Update Badge Text
    if (typeof rawBody.badgeText === 'string') {
      banner.badgeText = rawBody.badgeText.trim();
    }

    // 5. Update Placement
    if (typeof rawBody.placement === 'string' && ['footer', 'home_mid', 'both'].includes(rawBody.placement)) {
      banner.placement = rawBody.placement;
    }

    // 6. Update isActive & openInNewTab booleans
    if (rawBody.isActive !== undefined) {
      banner.isActive = rawBody.isActive === true || rawBody.isActive === 'true';
    }
    if (rawBody.openInNewTab !== undefined) {
      banner.openInNewTab = rawBody.openInNewTab === true || rawBody.openInNewTab === 'true';
    }

    await banner.save();

    res.json({
      success: true,
      message: 'Native banner updated successfully',
      data: banner
    });
  } catch (error) {
    console.error('❌ Error updating native banner:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error updating native banner'
    });
  }
};
