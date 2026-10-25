import mongoose from 'mongoose';

export const defaultNativeBannerData = {
  bannerId: 'default_native_320x50',
  title: 'ShahLajuk Exclusive Collections & Offers',
  adestraLink: 'https://shahlajuk.com',
  adScriptCode: '',
  imageUrl: '',
  badgeText: 'SPONSORED',
  placement: 'footer', // 'footer' | 'home_mid' | 'both'
  isActive: true,
  openInNewTab: true,
  altText: 'ShahLajuk Furniture Partner'
};

const nativeBannerSchema = new mongoose.Schema(
  {
    bannerId: {
      type: String,
      default: 'default_native_320x50',
      unique: true
    },
    title: {
      type: String,
      default: 'ShahLajuk Exclusive Collections & Offers',
      trim: true
    },
    adestraLink: {
      type: String,
      default: 'https://shahlajuk.com',
      trim: true
    },
    adScriptCode: {
      type: String,
      default: '',
      trim: true
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true
    },
    badgeText: {
      type: String,
      default: 'SPONSORED',
      trim: true
    },
    placement: {
      type: String,
      enum: ['footer', 'home_mid', 'both'],
      default: 'footer'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    openInNewTab: {
      type: Boolean,
      default: true
    },
    altText: {
      type: String,
      default: 'ShahLajuk Furniture Partner',
      trim: true
    }
  },
  { timestamps: true }
);

export const NativeBanner = mongoose.model('NativeBanner', nativeBannerSchema);
