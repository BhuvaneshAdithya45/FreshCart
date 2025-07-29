import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Seller from '../models/Seller.js';
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// ========================
// Register Seller (Admin Only)
// ========================
export const registerSeller = async (req, res) => {
  try {
    const { name, email, password, adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ success: false, message: 'Not authorized to register sellers' });
    }

    const existing = await Seller.findOne({ email });
    if (existing) return res.json({ success: false, message: "Seller already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await Seller.create({ name, email, password: hashedPassword });

    res.json({ success: true, message: "Seller registered successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ========================
// Login Seller
// ========================
export const sellerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email });

    if (!seller) return res.json({ success: false, message: "Seller not found" });

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) return res.json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ sellerId: seller._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('sellerToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Logged In",
      seller: { name: seller.name, email: seller.email }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ========================
// Check Seller Auth
// ========================
export const isSellerAuth = async (req, res) => {
  try {
    const seller = await Seller.findById(req.sellerId).select("-password");
    if (!seller) return res.json({ success: false, message: "Seller not found" });

    return res.json({ success: true, seller });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ========================
// Logout Seller
// ========================
export const sellerLogout = async (req, res) => {
  try {
    res.clearCookie('sellerToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    });
    return res.json({ success: true, message: "Logged Out" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ===============================
// Seller Analytics Dashboard (Per Seller)
// ===============================
export const getSellerAnalytics = async (req, res) => {
  try {
    const sellerId = req.sellerId;

    // Get products of this seller
    const sellerProducts = await Product.find({ seller: sellerId });
    const productIds = sellerProducts.map((p) => p._id.toString());

    // Get orders containing seller's products
    const orders = await Order.find({
      "items.product": { $in: productIds },
      $or: [{ paymentType: "COD" }, { isPaid: true }]
    }).populate("items.product"); // Populate product details

    let totalOrders = 0;
    let totalRevenue = 0;
    let monthlyRevenueMap = {};
    let productSales = {};
    let delivered = 0;
    let cancelled = 0;

    // Calculate metrics
    orders.forEach(order => {
      let orderRevenue = 0;
      let hasSellerProduct = false;

      order.items.forEach(item => {
        const productObj = item.product;
        if (productObj && productIds.includes(productObj._id.toString())) {
          orderRevenue += productObj.offerPrice * item.quantity;
          productSales[productObj._id.toString()] = (productSales[productObj._id.toString()] || 0) + item.quantity;
          hasSellerProduct = true;
        }
      });

      if (hasSellerProduct) {
        totalOrders++;
        totalRevenue += orderRevenue;

        const month = new Date(order.createdAt).toLocaleString("en-US", { month: "long" });
        monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + orderRevenue;

        if (order.status === "Delivered") delivered++;
        if (order.status === "Cancelled") cancelled++;
      }
    });

    const lowStock = sellerProducts.filter(p => p.stock < 10);

    // Top 5 Best-Selling Products
    const topProductsData = await Product.find({ _id: { $in: Object.keys(productSales) } });
    const topProducts = topProductsData
      .map((p) => ({
        name: p.name,
        sales: productSales[p._id.toString()] || 0
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    res.json({
      success: true,
      totalOrders,
      totalRevenue,
      lowStock,
      monthlyRevenue: Object.entries(monthlyRevenueMap).map(([month, revenue]) => ({ month, revenue })),
      orderStatus: { delivered, cancelled, pending: totalOrders - delivered - cancelled },
      topProducts
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
