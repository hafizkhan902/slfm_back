import mongoose from 'mongoose';

const deliveryAreaSchema = new mongoose.Schema(
  {
    divisionId: {
      type: Number,
      required: [true, 'Division ID is required'],
      index: true
    },
    divisionName: {
      type: String,
      required: [true, 'Division name is required'],
      trim: true
    },
    divisionNameBn: {
      type: String,
      default: '',
      trim: true
    },
    districtId: {
      type: Number,
      required: [true, 'District ID is required'],
      index: true
    },
    districtName: {
      type: String,
      required: [true, 'District name is required'],
      trim: true
    },
    districtNameBn: {
      type: String,
      default: '',
      trim: true
    },
    upazilaId: {
      type: Number,
      required: [true, 'Upazila ID is required'],
      unique: true,
      index: true
    },
    upazilaName: {
      type: String,
      required: [true, 'Upazila name is required'],
      trim: true
    },
    upazilaNameBn: {
      type: String,
      default: '',
      trim: true
    },
    deliveryFee: {
      type: Number,
      required: [true, 'Delivery fee is required'],
      min: [0, 'Delivery fee cannot be negative'],
      default: 120
    },
    estimatedDays: {
      type: String,
      default: '2-4 business days',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast hierarchical querying and sorting
deliveryAreaSchema.index({ divisionId: 1, districtId: 1, isActive: 1 });
deliveryAreaSchema.index({ divisionName: 1, districtName: 1, upazilaName: 1 });

export const DeliveryArea = mongoose.model('DeliveryArea', deliveryAreaSchema);
