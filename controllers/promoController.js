import { PromoBanner } from '../models/PromoBanner.js';
import { clearProductCache } from '../middleware/cacheMiddleware.js';

// Default promo banners seed data for instant bootstrap
const DEFAULT_PROMOS = [
  {
    promoId: 'promo-festive-sale',
    badge: '🎉 FESTIVE SALE — LIMITED TIME',
    title: 'Artisanal Chittagong Teak & Living Room Sets',
    subtitle: 'Up to 25% Off on handcrafted solid teak sofa sets, coffee tables & dining. Free white-glove delivery across Dhaka.',
    discountPill: '25% OFF',
    buttonText: 'Explore Festival Deals',
    linkAnchor: '#shop',
    theme: 'walnut-gold',
    artType: 'living-set',
    layoutDirection: 'normal',
    isActive: true,
    displayOrder: 1
  },
  {
    promoId: 'promo-custom-interior',
    badge: '✨ BESPOKE INTERIOR SERVICE',
    title: 'Custom Modular Wardrobes & Architectural Joinery',
    subtitle: 'Designed to fit your exact home dimensions by master artisans at ShahLajuk Furniture Mart.',
    discountPill: 'FREE CONSULTATION',
    buttonText: 'Book Free Interior Visit',
    linkAnchor: '#visit',
    theme: 'sage-timber',
    artType: 'interior-joinery',
    layoutDirection: 'reverse',
    isActive: true,
    displayOrder: 2
  }
];

// @desc    Get active home page promo banners
// @route   GET /api/promos
// @access  Public
export const getPromos = async (req, res, next) => {
  try {
    let promos = await PromoBanner.find({ isActive: true }).sort({ displayOrder: 1 });

    // Seed default promos if DB is empty
    if (promos.length === 0) {
      promos = await PromoBanner.insertMany(DEFAULT_PROMOS);
    }

    res.json({
      success: true,
      count: promos.length,
      promos
    });
  } catch (err) {
    res.json({ success: true, count: DEFAULT_PROMOS.length, promos: DEFAULT_PROMOS });
  }
};

// @desc    Create new promo banner (Admin)
// @route   POST /api/admin/promos
// @access  Private/Admin
export const createPromo = async (req, res, next) => {
  try {
    const promo = await PromoBanner.create(req.body);
    await clearProductCache();
    res.status(201).json(promo);
  } catch (err) {
    next(err);
  }
};

// @desc    Update promo banner (Admin)
// @route   PUT /api/admin/promos/:id
// @access  Private/Admin
export const updatePromo = async (req, res, next) => {
  try {
    const promo = await PromoBanner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!promo) {
      return res.status(404).json({ error: 'Promo banner not found' });
    }

    await clearProductCache();
    res.json(promo);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete promo banner (Admin)
// @route   DELETE /api/admin/promos/:id
// @access  Private/Admin
export const deletePromo = async (req, res, next) => {
  try {
    const promo = await PromoBanner.findByIdAndDelete(req.params.id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo banner not found' });
    }
    await clearProductCache();
    res.json({ success: true, message: 'Promo banner deleted' });
  } catch (err) {
    next(err);
  }
};
