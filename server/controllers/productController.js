import { v2 as cloudinary } from "cloudinary";
import Product from "../models/Product.js";

// ===============================
// Add Product : /api/product/add
// ===============================
export const addProduct = async (req, res) => {
  try {
    // Parse product data from form
    const productData = JSON.parse(req.body.productData);

    // Upload images to Cloudinary
    const images = req.files;
    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    // Construct new product with stock
    const newProduct = await Product.create({
      ...productData,
      stock: Number(productData.stock), // ensure stock is numeric
      inStock: Number(productData.stock) > 0,
      image: imagesUrl,
      seller: req.sellerId,
    });

    res.json({ success: true, message: "Product Added", product: newProduct });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ===============================
// Get All Products (Public List)
// ===============================
export const productList = async (req, res) => {
  try {
    const products = await Product.find({ inStock: true }); // only return in-stock items
    res.json({ success: true, products });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ===============================
// Get Seller Products (Private)
// ===============================
export const sellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.sellerId });
    res.json({ success: true, products });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ===============================
// Get Single Product
// ===============================
export const productById = async (req, res) => {
  try {
    const { id } = req.body;
    const product = await Product.findById(id);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ===============================
// Change Product inStock Status
// ===============================
export const changeStock = async (req, res) => {
  try {
    const { id, inStock } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: id, seller: req.sellerId },
      { inStock },
      { new: true }
    );

    if (!product) {
      return res.json({
        success: false,
        message: "Not authorized or product not found",
      });
    }

    res.json({ success: true, message: "Stock status updated", product });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
