import { Product } from '../models/Product.js';
import { clearProductCache } from '../middleware/cacheMiddleware.js';

// @desc    Get all products with category/room filtering, search, and sorting
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const { category, room, search, sort, page = 1, limit = 100 } = req.query;

    const query = { isAvailable: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (room && room !== 'all') {
      query.room = room;
    }

    if (search) {
      query.$text = { $search: search };
    }

    let sortOptions = {};
    if (sort === 'price-low') {
      sortOptions.price = 1;
    } else if (sort === 'price-high') {
      sortOptions.price = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    const totalCount = await Product.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      totalCount,
      products
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single product by ID / slug
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id }, { productId: req.params.id }]
    });

    if (!product) {
      return res.status(404).json({ error: 'Furniture item not found' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Create new product (Admin)
// @route   POST /api/admin/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    await clearProductCache();
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Update product (Admin)
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ error: 'Furniture item not found' });
    }

    await clearProductCache();
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Furniture item not found' });
    }

    await clearProductCache();
    res.json({ success: true, message: 'Product deleted from database' });
  } catch (err) {
    next(err);
  }
};
