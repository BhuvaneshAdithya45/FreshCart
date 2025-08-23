// server/models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: [String], required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: { type: [String], required: true },
    category: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    stock: { type: Number, default: 0 },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
