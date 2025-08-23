import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // ✅ this is what your controllers use
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // (optional) legacy alias in case something still sends `user`
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
      select: false,
    },

    items: { type: [orderItemSchema], required: true },
    amount: { type: Number, required: true },

    // if you store an Address document _id, make this ObjectId; if you store a plain string, String is fine
    address: { type: mongoose.Schema.Types.ObjectId, ref: "address", required: true },

    status: {
      type: String,
      enum: ["Order Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Order Placed",
    },

    paymentType: { type: String, enum: ["COD", "Online"], required: true },
    isPaid: { type: Boolean, default: false, required: true },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    paymentInfo: { type: Object },
  },
  { timestamps: true }
);

// If someone still saves `user`, copy it into userId automatically
orderSchema.pre("validate", function (next) {
  if (!this.userId && this.user) this.userId = this.user;
  next();
});

const Order =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
