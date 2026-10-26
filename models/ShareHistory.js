import mongoose from 'mongoose';

const shareHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    productPrice: {
      type: Number,
      default: 0
    },
    productImage: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: ''
    },
    room: {
      type: String,
      default: ''
    },
    sharedUrl: {
      type: String,
      required: true,
      trim: true
    },
    shareType: {
      type: String,
      enum: ['copy_link', 'whatsapp', 'facebook', 'twitter', 'native_share', 'other'],
      default: 'copy_link'
    },
    userId: {
      type: String,
      default: null
    },
    userName: {
      type: String,
      default: 'Guest Customer'
    },
    userEmail: {
      type: String,
      default: ''
    },
    userPhone: {
      type: String,
      default: ''
    },
    ip: {
      type: String,
      default: ''
    },
    device: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

shareHistorySchema.index({ createdAt: -1 });
shareHistorySchema.index({ productId: 1, createdAt: -1 });

export const ShareHistory = mongoose.model('ShareHistory', shareHistorySchema);
