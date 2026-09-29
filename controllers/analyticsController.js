import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

// @desc    Get store management analytics and overview
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getStoreAnalytics = async (req, res, next) => {
  try {
    const orders = await Order.find();
    const users = await User.find();
    const products = await Product.find();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    // Status breakdown
    const pendingCount = orders.filter(o => o.status === 'Placed').length;
    const confirmedCount = orders.filter(o => o.status === 'Confirmed').length;
    const shippedCount = orders.filter(o => o.status === 'Shipped').length;
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

    // Payment distribution
    const bkashOrders = orders.filter(o => o.paymentMethod === 'bKash');
    const nagadOrders = orders.filter(o => o.paymentMethod === 'Nagad');
    const codOrders = orders.filter(o => !['bKash', 'Nagad'].includes(o.paymentMethod));

    const bkashRev = bkashOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const nagadRev = nagadOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const codRev = codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Bestselling products breakdown
    const productSalesMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const name = item.name || item.product?.name || 'Furniture Item';
        const pId = item.productId || item.product?.id || name;
        const qty = item.quantity || 1;
        const price = item.price || item.product?.price || 0;
        const rev = qty * price;

        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { id: pId, name, units: 0, revenue: 0 };
        }
        productSalesMap[pId].units += qty;
        productSalesMap[pId].revenue += rev;
      });
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.units - a.units);

    // Customer Leaderboard
    const customerLeaderboard = users.map(user => {
      const userOrders = orders.filter(
        o => String(o.userId) === String(user._id) ||
             (o.phone && o.phone === user.phone) ||
             (o.customerName && user.name && o.customerName.toLowerCase() === user.name.toLowerCase())
      );
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const orderCount = userOrders.length;
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        orderCount,
        totalSpent,
        avgOrder: orderCount > 0 ? Math.round(totalSpent / orderCount) : 0
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      success: true,
      kpis: {
        totalRevenue,
        avgOrderValue,
        totalOrders: orders.length,
        totalCustomers: users.length,
        totalProducts: products.length,
        pendingCount,
        confirmedCount,
        shippedCount,
        deliveredCount
      },
      paymentDistribution: {
        bKash: { count: bkashOrders.length, revenue: bkashRev },
        Nagad: { count: nagadOrders.length, revenue: nagadRev },
        COD: { count: codOrders.length, revenue: codRev }
      },
      topProducts,
      customerLeaderboard
    });
  } catch (error) {
    next(error);
  }
};
