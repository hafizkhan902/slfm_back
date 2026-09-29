import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'store_settings',
      unique: true
    },
    bkashNumber: {
      type: String,
      default: '+8801700000000'
    },
    nagadNumber: {
      type: String,
      default: '+8801800000000'
    },
    deliveryChargeInsideDhaka: {
      type: Number,
      default: 120
    },
    deliveryChargeOutsideDhaka: {
      type: Number,
      default: 250
    },
    storeAddress: {
      type: String,
      default: 'Porabari Road CNG Station, Trishal, Mymensingh'
    },
    storePhone: {
      type: String,
      default: '+880 1700-000000'
    },
    storeEmail: {
      type: String,
      default: 'info@shahlajuk.com'
    },
    openingHours: {
      type: String,
      default: 'Open daily, 10am–8pm'
    },
    facebookUrl: {
      type: String,
      default: 'https://facebook.com'
    },
    instagramUrl: {
      type: String,
      default: 'https://instagram.com'
    },
    whatsappNumber: {
      type: String,
      default: '8801700000000'
    },
    youtubeUrl: {
      type: String,
      default: ''
    },
    isPromoBannerEnabled: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);
