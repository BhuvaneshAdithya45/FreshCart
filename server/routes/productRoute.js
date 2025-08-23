// server/routes/productRoute.js
import express from "express";
import { upload } from "../configs/multer.js";
import authSeller from "../middlewares/authSeller.js";
import {
  addProduct,
  changeStock,            // toggle inStock true/false
  updateProductStock,     // NEW: set absolute stock number
  productById,
  productList,
  sellerProducts,
} from "../controllers/productController.js";

const productRouter = express.Router();

/* ===============================
   Seller (private)
================================ */
productRouter.post("/add", authSeller, upload.array("images"), addProduct);
productRouter.post("/stock", authSeller, changeStock);                 // toggle inStock
productRouter.patch("/stock/update", authSeller, updateProductStock);  // NEW: set stock number
productRouter.get("/seller/list", authSeller, sellerProducts);

/* ===============================
   Public
================================ */
productRouter.get("/list", productList);
// Use a path param for clarity; body is not used on GET
productRouter.get("/id/:id", productById);

export default productRouter;
