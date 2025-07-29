import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import {
  addProduct,
  changeStock,
  productById,
  productList,
  sellerProducts
} from '../controllers/productController.js';

const productRouter = express.Router();

// ===============================
// Seller Routes
// ===============================
productRouter.post('/add', authSeller, upload.array("images"), addProduct); // Seller adds product
productRouter.post('/stock', authSeller, changeStock); // Seller updates stock
productRouter.get('/seller/list', authSeller, sellerProducts); // ✅ New: Get seller's own products

// ===============================
// Public Routes
// ===============================
productRouter.get('/list', productList); // Get all products (public)
productRouter.get('/id', productById);  // Get single product details (public)

export default productRouter;
