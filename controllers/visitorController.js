import { VisitorLog } from '../models/VisitorLog.js';

// @desc    Log a new visitor session or update existing
// @route   POST /api/visitors/log
// @access  Public
export const logSession = async (req, res, next) => {
  try {
    const { sessionId, city, country, ip, device, browsedSection } = req.body;
    if (!sessionId || !ip) {
      return res.status(400).json({ error: 'Session ID and IP address are required' });
    }

    const updatedLog = await VisitorLog.findOneAndUpdate(
      { sessionId },
      {
        $inc: { pageViews: 1 },
        $setOnInsert: {
          sessionId,
          city: city || 'Dhaka',
          country: country || 'Bangladesh',
          ip,
          device: device || 'Desktop Browser'
        },
        $set: {
          browsedSection: browsedSection || 'Home Page'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, log: updatedLog });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const existing = await VisitorLog.findOne({ sessionId: req.body.sessionId });
        return res.status(200).json({ success: true, log: existing });
      } catch (err) {
        return next(err);
      }
    }
    next(error);
  }
};

// @desc    Get visitor logs for Admin
// @route   GET /api/admin/visitors
// @access  Private/Admin
export const getVisitorLogs = async (req, res, next) => {
  try {
    const { search, city } = req.query;
    let query = {};

    if (city && city !== 'all') {
      query.city = city;
    }

    if (search) {
      query.$or = [
        { city: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { ip: { $regex: search, $options: 'i' } },
        { device: { $regex: search, $options: 'i' } },
        { browsedSection: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await VisitorLog.find(query).sort({ createdAt: -1 });
    const totalSessions = await VisitorLog.countDocuments();

    res.json({
      success: true,
      totalSessions,
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};
