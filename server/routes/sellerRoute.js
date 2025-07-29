import express from 'express';
import {
  registerSeller,    // NEW: Seller registration
  sellerLogin,
  sellerLogout,
  isSellerAuth,
  getSellerAnalytics
} from '../controllers/sellerController.js';

import authSeller from '../middlewares/authSeller.js';

const sellerRouter = express.Router();

// Restrict Seller Registration with ADMIN_KEY
sellerRouter.post('/register', (req, res, next) => {
  if (req.body.adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ success: false, message: 'Not authorized to register sellers' });
  }
  next();
}, registerSeller);

// Authentication Routes
sellerRouter.post('/login', sellerLogin);
sellerRouter.get('/is-auth', authSeller, isSellerAuth);
sellerRouter.get('/logout', sellerLogout);

// Analytics Dashboard Route
sellerRouter.get('/analytics', authSeller, getSellerAnalytics);

export default sellerRouter;
