import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    iconType: { type: String, default: 'table' },
    bg: { type: String, default: 'var(--surface)' }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    shippingAddress: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    trxId: {
      type: String,
      default: null
    },
    items: [orderItemSchema],
    shippingFee: {
      type: Number,
      default: 120
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered'],
      default: 'Placed'
    }
  },
  { timestamps: true }
);

// High-Performance Query Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ phone: 1 });
orderSchema.index({ trxId: 1 }, { sparse: true });

// Auto-generate Order Number pre-validate hook
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `SLM-${randomCode}`;
  }
  next();
});

export const Order = mongoose.model('Order', orderSchema);
