import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'shahlajuk_furniture_mart_secure_jwt_secret_key_2026_change_me',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, address, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Please provide name, email, phone, and password' });
    }

    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email or phone number already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      address: address || '',
      password,
      role: 'USER',
      isVerified: true,
      status: 'Approved'
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          isVerified: true,
          status: 'Approved'
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid user data provided' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Auth user & get token (supports Email or Phone login)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const email = body.email;
    const emailOrPhone = body.emailOrPhone;
    const phone = body.phone;
    const password = body.password;

    const identifier = String(emailOrPhone || email || phone || '').trim();
    const pass = String(password || '').trim();

    if (!identifier || !pass) {
      return res.status(400).json({ error: 'Please provide email or phone number and password' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (user.status === 'Rejected') {
        return res.status(403).json({ error: '⛔ Account Suspended/Rejected: Please contact ShahLajuk support.' });
      }

      res.json({
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          isVerified: user.isVerified !== false,
          status: user.status || 'Approved'
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid email/phone or password' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile & shipping address
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get all registered users for Admin panel
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject user registration (Admin only)
// @route   PATCH /api/auth/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved, Rejected, or Pending' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    user.status = status;
    user.isVerified = status === 'Approved';
    await user.save();

    res.json({
      success: true,
      message: `User registration status updated to ${status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    next(err);
  }
};
