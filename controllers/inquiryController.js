import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CustomInquiry } from '../models/CustomInquiry.js';
import { Order } from '../models/Order.js';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely parse JSON strings or return original object
const parseJsonField = (field, fallback = {}) => {
  if (!field) return fallback;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return fallback;
  }
};

/**
 * Safely upload an image buffer to Cloudinary with local file fallback.
 * Guarantees zero failures even if Cloudinary credentials are mock or offline.
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
        folder: 'shahlajuk_custom_inquiries',
        resource_type: 'auto',
        transformation: [
          { width: 1600, height: 1600, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      });

      if (uploadResponse && uploadResponse.secure_url) {
        return uploadResponse.secure_url;
      }
    } catch (err) {
      console.warn('⚠️ [Cloudinary] Upload failed, switching to local disk fallback:', err.message);
    }
  }

  // Fallback: Save file to local uploads directory
  try {
    const uploadDir = path.resolve(__dirname, '../uploads/custom-inquiries');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeExt = path.extname(file.originalname) || (file.mimetype.includes('png') ? '.png' : '.jpg');
    const filename = `inquiry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/custom-inquiries/${filename}`;
  } catch (localErr) {
    console.error('❌ Failed to save file locally:', localErr);
    // Ultimate in-memory data URL fallback
    const b64 = Buffer.from(file.buffer).toString('base64');
    return `data:${file.mimetype};base64,${b64}`;
  }
};

// @desc    Submit a new custom furniture inquiry with reference images
// @route   POST /api/inquiries/custom
// @access  Public / Optional Auth
export const createCustomInquiry = async (req, res, next) => {
  try {
    const rawBody = req.body || {};

    // 1. Parse Dimensions
    const dimensionsInput = parseJsonField(rawBody.dimensions);
    const height = Number(dimensionsInput.height ?? rawBody.height);
    const width = Number(dimensionsInput.width ?? rawBody.width);
    const depth = Number(dimensionsInput.depth ?? rawBody.depth);
    const unit = String(dimensionsInput.unit ?? rawBody.unit ?? 'inch').toLowerCase();

    // 2. Parse Materials (optional)
    const materialsInput = parseJsonField(rawBody.materials);
    const woodType = materialsInput.woodType ?? rawBody.woodType ?? '';
    const finish = materialsInput.finish ?? rawBody.finish ?? '';
    const hardware = materialsInput.hardware ?? rawBody.hardware ?? '';


    // 3. Parse Custom Details
    const customDetailsInput = parseJsonField(rawBody.customDetails);
    const description = customDetailsInput.description ?? rawBody.description ?? '';

    // 4. Parse Product Type & Contact Info
    const productType = rawBody.productType ?? '';
    const customerName = rawBody.customerName ?? rawBody.name ?? req.user?.name ?? '';
    const phone = rawBody.phone ?? rawBody.customerPhone ?? req.user?.phone ?? '';
    const email = rawBody.email ?? rawBody.customerEmail ?? req.user?.email ?? '';

    // Input Validation
    if (!productType || typeof productType !== 'string' || !productType.trim()) {
      return res.status(400).json({
        error: 'Product type is required (e.g., Dining Table, Bed Frame, Wardrobe)'
      });
    }

    if (isNaN(height) || height <= 0 || isNaN(width) || width <= 0 || isNaN(depth) || depth <= 0) {
      return res.status(400).json({
        error: 'Dimensions (Height, Width, Depth) must be valid numbers greater than 0'
      });
    }

    if (!['cm', 'inch'].includes(unit)) {
      return res.status(400).json({
        error: 'Dimension unit must be either "cm" or "inch"'
      });
    }

    if (description && description.length > 1000) {
      return res.status(400).json({
        error: `Description cannot exceed 1000 characters. Currently ${description.length} characters.`
      });
    }

    // 5. Process & Upload Reference Images (Multer files up to 5)
    const uploadedFiles = req.files || [];
    if (uploadedFiles.length > 5) {
      return res.status(400).json({
        error: 'You can upload a maximum of 5 reference images'
      });
    }

    // Validate mime types
    for (const file of uploadedFiles) {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return res.status(400).json({
          error: `Invalid file type for "${file.originalname}". Only image files (JPG, PNG, WebP) are allowed.`
        });
      }
    }

    // Upload files concurrently
    const uploadedUrls = await Promise.all(uploadedFiles.map(uploadSingleImage));

    // Also support any pre-existing URLs provided in customDetails.referenceImages or rawBody
    let existingUrls = [];
    if (customDetailsInput.referenceImages) {
      if (Array.isArray(customDetailsInput.referenceImages)) {
        existingUrls = customDetailsInput.referenceImages;
      } else if (typeof customDetailsInput.referenceImages === 'string') {
        try {
          existingUrls = JSON.parse(customDetailsInput.referenceImages);
        } catch {
          existingUrls = [customDetailsInput.referenceImages];
        }
      }
    } else if (rawBody.referenceImages) {
      if (Array.isArray(rawBody.referenceImages)) {
        existingUrls = rawBody.referenceImages;
      } else if (typeof rawBody.referenceImages === 'string') {
        try {
          existingUrls = JSON.parse(rawBody.referenceImages);
        } catch {
          existingUrls = [rawBody.referenceImages];
        }
      }
    }

    const finalReferenceImages = [...uploadedUrls, ...existingUrls]
      .filter(url => typeof url === 'string' && url.trim().length > 0)
      .slice(0, 5);

    // Resolve userId
    let resolvedUserId = null;
    if (req.user && req.user._id) {
      resolvedUserId = req.user._id;
    } else if (rawBody.userId && rawBody.userId.match(/^[0-9a-fA-F]{24}$/)) {
      resolvedUserId = rawBody.userId;
    }

    // 6. Save Custom Inquiry Document (Explicitly no pricing calculated)
    const newInquiry = await CustomInquiry.create({
      userId: resolvedUserId,
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
      productType: String(productType).trim(),
      dimensions: {
        height,
        width,
        depth,
        unit
      },
      materials: {
        woodType: String(woodType).trim(),
        finish: String(finish).trim(),
        hardware: String(hardware).trim()
      },
      customDetails: {
        description: String(description).trim().slice(0, 1000),
        referenceImages: finalReferenceImages
      },
      status: 'Pending Review'
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully! Our team will review your specifications and contact you shortly with a quote and confirmation.',
      inquiry: newInquiry
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all custom inquiries with filtering & pagination
// @route   GET /api/inquiries
// @access  Private/Admin
export const getAllInquiries = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { productType: searchRegex },
        { customerName: searchRegex },
        { phone: searchRegex },
        { 'customDetails.description': searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [inquiries, totalCount] = await Promise.all([
      CustomInquiry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email phone')
        .populate('convertedOrderId', 'orderNumber status totalAmount createdAt'),
      CustomInquiry.countDocuments(query)
    ]);

    // Calculate status breakdown metrics
    const [totalAll, pendingReview, contacted, confirmed, cancelled] = await Promise.all([
      CustomInquiry.countDocuments(),
      CustomInquiry.countDocuments({ status: 'Pending Review' }),
      CustomInquiry.countDocuments({ status: 'Contacted' }),
      CustomInquiry.countDocuments({ status: 'Confirmed' }),
      CustomInquiry.countDocuments({ status: 'Cancelled' })
    ]);

    res.json({
      success: true,
      inquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount
      },
      metrics: {
        total: totalAll,
        pendingReview,
        contacted,
        confirmed,
        cancelled
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inquiries for the authenticated user
// @route   GET /api/inquiries/my
// @access  Private
export const getMyInquiries = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const inquiries = await CustomInquiry.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('convertedOrderId', 'orderNumber status totalAmount createdAt');

    res.json({
      success: true,
      inquiries
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inquiry details by ID
// @route   GET /api/inquiries/:id
// @access  Private
export const getInquiryById = async (req, res, next) => {
  try {
    const inquiry = await CustomInquiry.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('convertedOrderId', 'orderNumber status totalAmount createdAt');

    if (!inquiry) {
      return res.status(404).json({ error: 'Custom inquiry not found' });
    }

    // Only allow owner or admin
    if (
      req.user.role !== 'ADMIN' &&
      (!inquiry.userId || inquiry.userId._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      inquiry
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update inquiry status & admin notes (If confirmed, automatically creates Order with status 'Pending')
// @route   PATCH /api/inquiries/:id/status
// @access  Private/Admin
export const updateInquiryStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, confirmedPrice, shippingAddress, paymentMethod } = req.body;
    const allowedStatuses = ['Pending Review', 'Contacted', 'Confirmed', 'Cancelled'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status "${status}". Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const inquiry = await CustomInquiry.findById(req.params.id)
      .populate('userId', 'name email phone address');

    if (!inquiry) {
      return res.status(404).json({ error: 'Custom inquiry not found' });
    }

    if (status) inquiry.status = status;
    if (typeof adminNotes === 'string') inquiry.adminNotes = adminNotes;
    if (confirmedPrice !== undefined && confirmedPrice !== null && !isNaN(Number(confirmedPrice))) {
      inquiry.confirmedPrice = Number(confirmedPrice);
    }

    let createdOrder = null;

    // When status is 'Confirmed', automatically create the corresponding Order with 'Pending' status if not already converted
    if (status === 'Confirmed' && !inquiry.convertedOrderId) {
      const priceVal = Number(confirmedPrice ?? inquiry.confirmedPrice) || 0;
      const addr = (shippingAddress && String(shippingAddress).trim()) || inquiry.userId?.address || 'To be confirmed upon call';
      const custName = inquiry.customerName || inquiry.userId?.name || 'Custom Order Customer';
      const custPhone = inquiry.phone || inquiry.userId?.phone || '01700000000';
      const dimensionStr = `${inquiry.dimensions?.height || ''} (H) × ${inquiry.dimensions?.width || ''} (W) × ${inquiry.dimensions?.depth || ''} (D) ${inquiry.dimensions?.unit || 'inch'}`;
      const firstImage = (inquiry.customDetails?.referenceImages && inquiry.customDetails.referenceImages[0]) || '';

      createdOrder = await Order.create({
        userId: inquiry.userId ? inquiry.userId._id : null,
        customInquiryId: inquiry._id,
        customerName: custName,
        phone: custPhone,
        shippingAddress: addr,
        paymentMethod: paymentMethod || 'Cash on Delivery (Custom Order)',
        totalAmount: priceVal,
        shippingFee: 0,
        status: 'Pending',
        items: [
          {
            product: {
              id: `custom-${inquiry._id}`,
              name: `Custom Commission: ${inquiry.productType}`,
              price: priceVal,
              iconType: 'table',
              bg: 'var(--surface)',
              image: firstImage,
              dimensions: dimensionStr,
              isCustom: true
            },
            quantity: 1
          }
        ]
      });

      inquiry.convertedOrderId = createdOrder._id;
      inquiry.convertedOrderNumber = createdOrder.orderNumber;
      if (priceVal > 0) {
        inquiry.confirmedPrice = priceVal;
      }
    }

    await inquiry.save();

    res.json({
      success: true,
      message: createdOrder
        ? `Inquiry confirmed and converted to Order #${createdOrder.orderNumber} with Pending status.`
        : 'Inquiry status updated successfully',
      inquiry,
      order: createdOrder
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Explicitly confirm custom inquiry and convert to Order with status 'Pending'
// @route   POST /api/inquiries/:id/confirm-order
// @access  Private/Admin
export const confirmInquiryToOrder = async (req, res, next) => {
  try {
    const { confirmedPrice, shippingAddress, paymentMethod, adminNotes } = req.body;
    const inquiry = await CustomInquiry.findById(req.params.id)
      .populate('userId', 'name email phone address');

    if (!inquiry) {
      return res.status(404).json({ error: 'Custom inquiry not found' });
    }

    // If already converted, return existing order
    if (inquiry.convertedOrderId) {
      const existingOrder = await Order.findById(inquiry.convertedOrderId);
      if (existingOrder) {
        return res.json({
          success: true,
          message: `Inquiry is already converted to Order #${existingOrder.orderNumber}`,
          inquiry,
          order: existingOrder
        });
      }
    }

    const priceVal = Number(confirmedPrice ?? inquiry.confirmedPrice) || 0;
    const addr = (shippingAddress && String(shippingAddress).trim()) || inquiry.userId?.address || 'To be confirmed upon call';
    const custName = inquiry.customerName || inquiry.userId?.name || 'Custom Order Customer';
    const custPhone = inquiry.phone || inquiry.userId?.phone || '01700000000';
    const dimensionStr = `${inquiry.dimensions?.height || ''} (H) × ${inquiry.dimensions?.width || ''} (W) × ${inquiry.dimensions?.depth || ''} (D) ${inquiry.dimensions?.unit || 'inch'}`;
    const firstImage = (inquiry.customDetails?.referenceImages && inquiry.customDetails.referenceImages[0]) || '';

    const newOrder = await Order.create({
      userId: inquiry.userId ? inquiry.userId._id : null,
      customInquiryId: inquiry._id,
      customerName: custName,
      phone: custPhone,
      shippingAddress: addr,
      paymentMethod: paymentMethod || 'Cash on Delivery (Custom Order)',
      totalAmount: priceVal,
      shippingFee: 0,
      status: 'Pending',
      items: [
        {
          product: {
            id: `custom-${inquiry._id}`,
            name: `Custom Commission: ${inquiry.productType}`,
            price: priceVal,
            iconType: 'table',
            bg: 'var(--surface)',
            image: firstImage,
            dimensions: dimensionStr,
            isCustom: true
          },
          quantity: 1
        }
      ]
    });

    inquiry.status = 'Confirmed';
    inquiry.convertedOrderId = newOrder._id;
    inquiry.convertedOrderNumber = newOrder.orderNumber;
    inquiry.confirmedPrice = priceVal;
    if (typeof adminNotes === 'string') {
      inquiry.adminNotes = adminNotes;
    }
    await inquiry.save();

    res.status(201).json({
      success: true,
      message: `Inquiry confirmed and converted to Order #${newOrder.orderNumber} with Pending status`,
      inquiry,
      order: newOrder
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete custom inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private/Admin
export const deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await CustomInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ error: 'Custom inquiry not found' });
    }

    res.json({
      success: true,
      message: 'Custom inquiry deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
