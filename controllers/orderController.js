import { Order } from '../models/Order.js';
import { DeliveryArea } from '../models/DeliveryArea.js';
import { generateOrderReceiptPDF } from '../utils/pdfGenerator.js';
import { generateServerReceiptHtml } from '../utils/htmlReceiptGenerator.js';

// @desc    Place a new order (Checkout)
// @route   POST /api/orders
// @access  Public / Optional Auth
export const createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      phone,
      shippingAddress,
      deliveryLocation,
      paymentMethod,
      trxId,
      items,
      shippingFee = 120,
      totalAmount
    } = req.body;

    if (!customerName || !phone || !shippingAddress || !paymentMethod || !items || items.length === 0) {
      return res.status(400).json({ error: 'Please provide all required order and shipping fields' });
    }

    // Validate TrxID requirement for mobile banking
    if (['bKash', 'Nagad'].includes(paymentMethod)) {
      if (!trxId || typeof trxId !== 'string' || trxId.trim().length === 0) {
        return res.status(400).json({ error: `Valid Transaction ID (TrxID) is required for ${paymentMethod} payment verification` });
      }
    }

    // Check for duplicate TrxID if provided
    if (trxId) {
      const existingOrder = await Order.findOne({ trxId: trxId.trim().toUpperCase() });
      if (existingOrder) {
        return res.status(400).json({ error: 'This Transaction ID (TrxID) has already been submitted for another order' });
      }
    }

    const formattedItems = (items || []).map((item) => {
      const prod = item.product || item;
      return {
        product: {
          id: String(prod.id || prod._id || 'prod-' + Date.now()),
          name: String(prod.name || 'Furniture Item'),
          price: Number(prod.price || 0),
          iconType: String(prod.iconType || 'table'),
          bg: String(prod.bg || 'var(--surface)')
        },
        quantity: Number(item.quantity || 1)
      };
    });

    // Calculate items subtotal on server
    const itemsSubtotal = formattedItems.reduce(
      (sum, item) => sum + (Number(item.product.price) * Number(item.quantity)),
      0
    );

    // Independently validate delivery area and fee from database (Server is Source of Truth)
    let verifiedShippingFee = Number(shippingFee || 120);
    let deliveryLocationSnapshot = null;

    const targetUpazilaId = deliveryLocation?.upazilaId || deliveryLocation?.id;
    if (targetUpazilaId) {
      const configuredArea = await DeliveryArea.findOne({
        upazilaId: Number(targetUpazilaId)
      });

      if (!configuredArea) {
        return res.status(400).json({
          error: 'The selected delivery upazila is not currently supported for delivery.'
        });
      }

      if (!configuredArea.isActive) {
        return res.status(400).json({
          error: `Delivery to ${configuredArea.upazilaName} is currently temporarily suspended or inactive.`
        });
      }

      verifiedShippingFee = Number(configuredArea.deliveryFee);
      deliveryLocationSnapshot = {
        divisionId: configuredArea.divisionId,
        divisionName: configuredArea.divisionName,
        districtId: configuredArea.districtId,
        districtName: configuredArea.districtName,
        upazilaId: configuredArea.upazilaId,
        upazilaName: configuredArea.upazilaName,
        deliveryFee: configuredArea.deliveryFee
      };
    }

    // Secure server-calculated total
    const finalTotalAmount = itemsSubtotal + verifiedShippingFee;

    const order = await Order.create({
      userId: req.user ? req.user._id : null,
      customerName,
      phone,
      shippingAddress,
      deliveryLocation: deliveryLocationSnapshot,
      paymentMethod,
      trxId: trxId ? String(trxId).trim().toUpperCase() : null,
      items: formattedItems,
      shippingFee: verifiedShippingFee,
      totalAmount: finalTotalAmount,
      status: 'Placed'
    });

    res.status(201).json({
      success: true,
      message: 'Order successfully placed!',
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Track order by Order Number or Phone
// @route   GET /api/orders/track/:orderNumber
// @access  Public
export const trackOrder = async (req, res, next) => {
  try {
    const param = String(req.params.orderNumber || '').trim();
    const digitsOnly = param.replace(/[^0-9]/g, '');

    const order = await Order.findOne({
      $or: [
        { orderNumber: param.toUpperCase() },
        ...(digitsOnly ? [{ orderNumber: `SLM-${digitsOnly}` }, { orderNumber: `SLFM-${digitsOnly}` }] : []),
        { phone: param },
        { _id: param.match(/^[0-9a-fA-F]{24}$/) ? param : null }
      ].filter(Boolean)
    });

    if (!order) {
      return res.status(404).json({ error: 'No order found with the provided Order ID or Phone number' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's order history
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const phoneDigits = user.phone ? String(user.phone).replace(/[^0-9]/g, '') : null;
    const phoneSuffix = phoneDigits && phoneDigits.length >= 7 ? phoneDigits.slice(-10) : null;

    const query = {
      $or: [
        { userId: user._id },
        ...(user.id ? [{ userId: user.id }] : []),
        ...(phoneSuffix ? [
          { phone: user.phone },
          { phone: { $regex: phoneSuffix, $options: 'i' } }
        ] : []),
        ...(user.name ? [{ customerName: { $regex: `^${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : []),
        ...(user.email ? [{ customerName: { $regex: `^${user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : [])
      ]
    };

    const orders = await Order.find(query).sort({ createdAt: -1 });
    console.log(`[Server orderController] 📦 getMyOrders fetched ${orders.length} orders for user: ${user.name} (${user.email})`);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all or /api/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// @desc    Update order status (Admin)
// @route   PATCH /api/admin/orders/:orderNumber/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, customerName, phone, shippingAddress, paymentMethod, totalAmount, items } = req.body;
    const param = String(req.params.orderNumber || req.params.id || '').trim();
    console.log(`[Server orderController] 🚚 Order status update request received for orderParam: "${param}", target status: "${status}"`);

    const ALLOWED_STATUSES = ['Pending', 'Placed', 'Confirmed', 'Shipped', 'Delivered'];
    const matchedStatus = ALLOWED_STATUSES.find(s => s.toLowerCase() === String(status || '').trim().toLowerCase());

    if (!matchedStatus) {
      console.warn(`[Server orderController] ⚠️ Invalid order status transition: ${status}`);
      return res.status(400).json({ error: 'Invalid order status transition. Must be Pending, Placed, Confirmed, Shipped, or Delivered' });
    }

    const digitsOnly = param.replace(/[^0-9]/g, '');

    const queryConditions = [
      { orderNumber: param },
      { orderNumber: param.toUpperCase() },
      ...(digitsOnly ? [
        { orderNumber: `SLM-${digitsOnly}` },
        { orderNumber: `SLFM-${digitsOnly}` },
        { orderNumber: { $regex: digitsOnly, $options: 'i' } }
      ] : []),
      ...(param.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: param }] : [])
    ];

    let order = await Order.findOneAndUpdate(
      { $or: queryConditions },
      { status: matchedStatus },
      { new: true }
    );

    if (!order) {
      console.warn(`[Server orderController] ⚠️ Order not found in database for query: ${param}`);
      return res.status(404).json({ error: `Order "${param}" not found in database` });
    }

    console.log(`[Server orderController] ✅ Order status updated successfully in MongoDB. OrderID: ${order.orderNumber || order._id}, Status: ${order.status}`);
    res.json(order);
  } catch (err) {
    console.error(`[Server orderController] ❌ Error in updateOrderStatus:`, err);
    next(err);
  }
};

// @desc    Download Server-Rendered PDF Order Receipt
// @route   GET /api/orders/:orderNumber/pdf
// @access  Public / Customer / Admin
export const downloadOrderReceipt = async (req, res, next) => {
  try {
    const param = String(req.params.orderNumber || req.params.id || '').trim();
    const digitsOnly = param.replace(/[^0-9]/g, '');

    const queryConditions = [
      { orderNumber: param },
      { orderNumber: param.toUpperCase() },
      ...(digitsOnly ? [
        { orderNumber: `SLM-${digitsOnly}` },
        { orderNumber: `SLFM-${digitsOnly}` },
        { orderNumber: { $regex: digitsOnly, $options: 'i' } }
      ] : []),
      ...(param.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: param }] : [])
    ];

    const order = await Order.findOne({ $or: queryConditions });

    if (!order) {
      return res.status(404).json({ error: `Order "${param}" not found` });
    }

    generateOrderReceiptPDF(order, res);
  } catch (err) {
    console.error('[Server orderController] ❌ PDF Receipt generation error:', err);
    next(err);
  }
};

// @desc    Server-Side Rendered (SSR) HTML Order Receipt
// @route   GET /api/orders/:orderNumber/receipt
// @access  Public / Customer / Admin
export const renderOrderReceiptHTML = async (req, res, next) => {
  try {
    const param = String(req.params.orderNumber || req.params.id || '').trim();
    const digitsOnly = param.replace(/[^0-9]/g, '');

    const queryConditions = [
      { orderNumber: param },
      { orderNumber: param.toUpperCase() },
      ...(digitsOnly ? [
        { orderNumber: `SLM-${digitsOnly}` },
        { orderNumber: `SLFM-${digitsOnly}` },
        { orderNumber: { $regex: digitsOnly, $options: 'i' } }
      ] : []),
      ...(param.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: param }] : [])
    ];

    const order = await Order.findOne({ $or: queryConditions });

    if (!order) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><title>Order Not Found | ShahLajuk Furniture Mart</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px 20px; background: #FAF8F5; color: #231D18;">
          <h2 style="color: #4A2C19; margin-bottom: 12px;">Order Not Found</h2>
          <p style="color: #666; margin-bottom: 24px;">No order matching "${param}" could be located in our system.</p>
          <a href="/" style="display: inline-block; background: #4A2C19; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">Return to Store</a>
        </body>
        </html>
      `);
    }

    const autoPrint = req.query.print === 'true' || req.query.autoprint === '1';
    const html = generateServerReceiptHtml(order, autoPrint);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Server orderController] ❌ HTML Receipt generation error:', err);
    next(err);
  }
};
