import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true, // e.g. 'noyon-dining-table'
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true // 'table', 'chair', 'wardrobe', 'dressing-table', 'bookshelf', 'bed', 'sofa', 'wall-shelf'
    },
    categoryName: {
      type: String,
      required: true
    },
    room: {
      type: String,
      required: true // 'reading-room', 'dining-room', 'bedroom', 'living-room', 'decoration', 'kids-room'
    },
    roomName: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    originalPrice: {
      type: Number,
      default: null
    },
    badge: {
      type: String,
      default: null
    },
    bg: {
      type: String,
      default: 'var(--surface)'
    },
    iconType: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    image2: {
      type: String,
      default: ''
    },
    image3: {
      type: String,
      default: ''
    },
    image4: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      required: true
    },
    specs: {
      dimensions: { type: String, required: true },
      material: { type: String, required: true },
      warranty: { type: String, required: true },
      finish: { type: String, required: true }
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// High-Performance Query Indexes
productSchema.index({ category: 1, room: 1, price: 1 });
productSchema.index({ name: 'text', categoryName: 'text', roomName: 'text', description: 'text' });

export const Product = mongoose.model('Product', productSchema);
