import mongoose from 'mongoose';

const visitorLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    city: {
      type: String,
      default: 'Dhaka'
    },
    country: {
      type: String,
      default: 'Bangladesh'
    },
    ip: {
      type: String,
      required: true
    },
    device: {
      type: String,
      default: 'Desktop Browser'
    },
    browsedSection: {
      type: String,
      default: 'Home Page'
    },
    pageViews: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

visitorLogSchema.index({ city: 1, createdAt: -1 });

export const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);
