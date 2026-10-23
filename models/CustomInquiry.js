import mongoose from 'mongoose';

const customInquirySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: false
    },
    // Optional contact details for reaching out to the customer
    customerName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    productType: {
      type: String,
      required: [true, 'Product type is required (e.g. Dining Table, Bed Frame, Wardrobe)'],
      trim: true
    },
    dimensions: {
      height: {
        type: Number,
        required: [true, 'Height dimension is required'],
        min: [0.1, 'Height must be a positive number']
      },
      width: {
        type: Number,
        required: [true, 'Width dimension is required'],
        min: [0.1, 'Width must be a positive number']
      },
      depth: {
        type: Number,
        required: [true, 'Depth dimension is required'],
        min: [0.1, 'Depth must be a positive number']
      },
      unit: {
        type: String,
        enum: {
          values: ['cm', 'inch'],
          message: '{VALUE} is not a supported unit. Allowed units: cm, inch'
        },
        default: 'inch'
      }
    },
    materials: {
      woodType: {
        type: String,
        trim: true,
        default: ''
      },
      finish: {
        type: String,
        trim: true,
        default: ''
      },
      hardware: {
        type: String,
        trim: true,
        default: ''
      }
    },

    customDetails: {
      description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        trim: true,
        default: ''
      },
      referenceImages: {
        type: [String],
        default: []
      }
    },
    status: {
      type: String,
      enum: {
        values: ['Pending Review', 'Contacted', 'Confirmed', 'Cancelled'],
        message: '{VALUE} is not a valid inquiry status'
      },
      default: 'Pending Review'
    },
    adminNotes: {
      type: String,
      trim: true,
      default: ''
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    convertedOrderNumber: {
      type: String,
      trim: true,
      default: ''
    },
    confirmedPrice: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup by status, user, and creation date
customInquirySchema.index({ status: 1, createdAt: -1 });
customInquirySchema.index({ userId: 1, createdAt: -1 });

export const CustomInquiry = mongoose.model('CustomInquiry', customInquirySchema);
