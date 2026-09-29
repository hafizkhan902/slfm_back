import mongoose from 'mongoose';

const promoBannerSchema = new mongoose.Schema(
  {
    promoId: {
      type: String,
      required: true,
      unique: true
    },
    badge: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      required: true
    },
    discountPill: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      required: true
    },
    linkAnchor: {
      type: String,
      default: '#shop'
    },
    theme: {
      type: String,
      default: 'walnut-gold'
    },
    artType: {
      type: String,
      default: 'living-set'
    },
    layoutDirection: {
      type: String,
      enum: ['normal', 'reverse'],
      default: 'normal'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const PromoBanner = mongoose.model('PromoBanner', promoBannerSchema);
