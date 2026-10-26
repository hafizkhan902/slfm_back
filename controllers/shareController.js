import { ShareHistory } from '../models/ShareHistory.js';

// @desc    Record a link copy or product share event
// @route   POST /api/shares
// @access  Public (Optional auth)
export const recordShare = async (req, res, next) => {
  try {
    const {
      productId,
      productName,
      productPrice,
      productImage,
      category,
      room,
      sharedUrl,
      shareType,
      userId,
      userName,
      userEmail,
      userPhone,
      device
    } = req.body;

    if (!productId || !productName || !sharedUrl) {
      return res.status(400).json({
        error: 'productId, productName, and sharedUrl are required to record a share event.'
      });
    }

    const clientIp = (
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1'
    ).split(',')[0].trim();

    const userAgent = req.headers['user-agent'] || '';

    // Determine device from header if not explicitly sent
    const detectedDevice = device || (
      /mobile|android|iphone|ipad|phone/i.test(userAgent)
        ? 'Mobile Device'
        : 'Desktop Browser'
    );

    // If authenticated user info exists on req.user, prefer it
    const activeUserId = req.user?._id || userId || null;
    const activeUserName = req.user?.name || userName || 'Guest Customer';
    const activeUserEmail = req.user?.email || userEmail || '';
    const activeUserPhone = req.user?.phone || userPhone || '';

    const shareRecord = await ShareHistory.create({
      productId: String(productId).trim(),
      productName: String(productName).trim(),
      productPrice: Number(productPrice) || 0,
      productImage: String(productImage || '').trim(),
      category: String(category || '').trim(),
      room: String(room || '').trim(),
      sharedUrl: String(sharedUrl).trim(),
      shareType: shareType || 'copy_link',
      userId: activeUserId,
      userName: activeUserName,
      userEmail: activeUserEmail,
      userPhone: activeUserPhone,
      ip: clientIp,
      device: detectedDevice,
      userAgent
    });

    console.log(`🔗 [Server shareController] Link copied/shared for "${productName}" (${productId}) by ${activeUserName}`);

    res.status(201).json({
      success: true,
      message: 'Product link copy recorded successfully!',
      share: shareRecord
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all product share and link copy history with metrics for Admin Settings
// @route   GET /api/shares
// @access  Private/Admin
export const getShareHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const [shares, totalCount, distinctProducts, topSharedAgg] = await Promise.all([
      ShareHistory.find().sort({ createdAt: -1 }).limit(limit),
      ShareHistory.countDocuments(),
      ShareHistory.distinct('productId'),
      ShareHistory.aggregate([
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$productName' },
            productImage: { $first: '$productImage' },
            productPrice: { $first: '$productPrice' },
            count: { $sum: 1 },
            lastSharedAt: { $max: '$createdAt' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const metrics = {
      totalShares: totalCount,
      uniqueProductsShared: distinctProducts.length,
      topSharedProducts: topSharedAgg
    };

    res.json({
      success: true,
      count: shares.length,
      metrics,
      shares
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a single share history entry
// @route   DELETE /api/shares/:id
// @access  Private/Admin
export const deleteShareItem = async (req, res, next) => {
  try {
    const item = await ShareHistory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Share history record not found' });
    }
    res.json({
      success: true,
      message: 'Share history record deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear all share history records
// @route   DELETE /api/shares
// @access  Private/Admin
export const clearShareHistory = async (req, res, next) => {
  try {
    const result = await ShareHistory.deleteMany({});
    res.json({
      success: true,
      message: `All share history cleared (${result.deletedCount} records deleted)`
    });
  } catch (err) {
    next(err);
  }
};
