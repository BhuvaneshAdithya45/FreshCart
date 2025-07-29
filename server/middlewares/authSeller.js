import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

const authSeller = async (req, res, next) => {
  try {
    const { sellerToken } = req.cookies;

    if (!sellerToken) {
      return res.status(401).json({ success: false, message: 'Not Authorized' });
    }

    // Verify JWT
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);
    req.sellerId = decoded.sellerId;

    // Check if seller exists in DB
    const seller = await Seller.findById(req.sellerId);
    if (!seller) {
      return res.status(401).json({ success: false, message: 'Invalid seller token' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authorization failed', error: error.message });
  }
};

export default authSeller;
