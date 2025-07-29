import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, ref: "user" },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
        quantity: { type: Number, required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Seller" }, // ✅ NEW: Track seller for each item
      },
    ],
    amount: { type: Number, required: true },
    address: { type: String, required: true, ref: "address" },
    status: {
      type: String,
      enum: ["Order Placed", "Shipped", "Delivered", "Cancelled"],
      default: "Order Placed",
    },
    paymentType: { type: String, required: true },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    paymentInfo: { type: Object },
  },
  { timestamps: true }
);

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
