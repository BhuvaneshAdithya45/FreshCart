// server/controllers/productController.js
import { v2 as cloudinary } from "cloudinary";
import Product from "../models/Product.js";

/* ===============================
   Add Product : /api/product/add
================================ */
export const addProduct = async (req, res) => {
  try {
    const productData = JSON.parse(req.body.productData || "{}");

    const images = req.files || [];
    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    const numericStock = Math.max(0, parseInt(productData.stock ?? 0, 10) || 0);

    const newProduct = await Product.create({
      ...productData,
      stock: numericStock,
      inStock: numericStock > 0,
      image: imagesUrl,
      seller: req.sellerId,
    });

    return res.json({ success: true, message: "Product Added", product: newProduct });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to add product" });
  }
};

/* ===============================
   Get All Products (Public)
   – return only in-stock items to shoppers
================================ */
export const productList = async (_req, res) => {
  try {
    const products = await Product.find({ inStock: true });
    return res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to fetch products" });
  }
};

/* ===============================
   Get Seller Products (Private)
================================ */
export const sellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.sellerId });
    return res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to fetch seller products" });
  }
};

/* ===============================
   Get Single Product (Public)
   GET /api/product/id/:id
================================ */
export const productById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.json({ success: false, message: "Product not found" });
    return res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to fetch product" });
  }
};

/* ===============================
   Toggle inStock (Private)
   POST /api/product/stock  { id, inStock }
================================ */
export const changeStock = async (req, res) => {
  try {
    const { id, inStock } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: id, seller: req.sellerId },
      { inStock: !!inStock, ...(inStock ? {} : { stock: 0 }) }, // if turning off, zero the stock
      { new: true }
    );

    if (!product) {
      return res.json({ success: false, message: "Not authorized or product not found" });
    }

    // broadcast stock qty change as well (so UIs refresh)
    global.io?.emit("stockUpdate", { productId: product._id.toString(), stock: product.stock });

    return res.json({ success: true, message: "Stock status updated", product });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to update stock" });
  }
};

/* ===============================
   Set absolute stock (Private)
   PATCH /api/product/stock/update  { id, stock }
================================ */
export const updateProductStock = async (req, res) => {
  try {
    const { id, stock } = req.body;
    if (!id || stock == null) {
      return res.status(400).json({ success: false, message: "id and stock are required" });
    }

    const numericStock = Math.max(0, parseInt(stock, 10) || 0);

    const product = await Product.findOneAndUpdate(
      { _id: id, seller: req.sellerId },
      { stock: numericStock, inStock: numericStock > 0 },
      { new: true }
    );

    if (!product) {
      return res.json({ success: false, message: "Not authorized or product not found" });
    }

    // notify everyone (seller dashboard, carts, product pages, etc.)
    global.io?.emit("stockUpdate", { productId: product._id.toString(), stock: product.stock });

    return res.json({ success: true, message: "Stock updated", product });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message || "Failed to update stock" });
  }
};
