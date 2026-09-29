import { Settings } from '../models/Settings.js';

// @desc    Get storewide settings (bKash & Nagad numbers, fees)
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ key: 'store_settings' });
    if (!settings) {
      settings = await Settings.create({
        key: 'store_settings',
        bkashNumber: '+8801700000000',
        nagadNumber: '+8801800000000'
      });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

// @desc    Update storewide settings (Admin only)
// @route   PUT /api/settings or PATCH /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res, next) => {
  try {
    const {
      bkashNumber,
      nagadNumber,
      deliveryChargeInsideDhaka,
      deliveryChargeOutsideDhaka,
      storeAddress,
      storePhone,
      storeEmail,
      openingHours,
      facebookUrl,
      instagramUrl,
      whatsappNumber,
      youtubeUrl,
      isPromoBannerEnabled
    } = req.body;

    let settings = await Settings.findOne({ key: 'store_settings' });
    if (!settings) {
      settings = new Settings({ key: 'store_settings' });
    }

    if (bkashNumber !== undefined) settings.bkashNumber = String(bkashNumber).trim();
    if (nagadNumber !== undefined) settings.nagadNumber = String(nagadNumber).trim();
    if (deliveryChargeInsideDhaka !== undefined) settings.deliveryChargeInsideDhaka = Number(deliveryChargeInsideDhaka);
    if (deliveryChargeOutsideDhaka !== undefined) settings.deliveryChargeOutsideDhaka = Number(deliveryChargeOutsideDhaka);

    if (storeAddress !== undefined) settings.storeAddress = String(storeAddress).trim();
    if (storePhone !== undefined) settings.storePhone = String(storePhone).trim();
    if (storeEmail !== undefined) settings.storeEmail = String(storeEmail).trim();
    if (openingHours !== undefined) settings.openingHours = String(openingHours).trim();
    if (facebookUrl !== undefined) settings.facebookUrl = String(facebookUrl).trim();
    if (instagramUrl !== undefined) settings.instagramUrl = String(instagramUrl).trim();
    if (whatsappNumber !== undefined) settings.whatsappNumber = String(whatsappNumber).trim();
    if (youtubeUrl !== undefined) settings.youtubeUrl = String(youtubeUrl).trim();
    if (isPromoBannerEnabled !== undefined) settings.isPromoBannerEnabled = Boolean(isPromoBannerEnabled);

    await settings.save();
    console.log('✅ [Server settingsController] Store settings updated in MongoDB:', settings);

    res.json({
      success: true,
      settings,
      message: 'Store payment and footer settings updated successfully in MongoDB!'
    });
  } catch (err) {
    next(err);
  }
};
