import cloudinary from '../config/cloudinary.js';

// @desc    Upload product image to Cloudinary
// @route   POST /api/upload
// @access  Private/Admin
export const uploadProductImage = async (req, res, next) => {
  try {
    let imageToUpload = null;

    // Check if file sent via multipart/form-data
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      imageToUpload = `data:${req.file.mimetype};base64,${b64}`;
    } else if (req.body && req.body.image) {
      imageToUpload = req.body.image;
    }

    if (!imageToUpload) {
      return res.status(400).json({ error: 'Please provide an image file or base64 image payload' });
    }

    // Check if Cloudinary API credentials are configured
    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (!isConfigured) {
      // Fallback response with helpful instructions if credentials not set yet
      console.warn('⚠️ [Cloudinary] Cloudinary API credentials missing in server/.env');
      return res.status(500).json({
        error: 'Cloudinary API credentials missing. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env'
      });
    }

    const uploadResponse = await cloudinary.uploader.upload(imageToUpload, {
      folder: 'shahlajuk_products',
      resource_type: 'auto',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to upload image to Cloudinary'
    });
  }
};
