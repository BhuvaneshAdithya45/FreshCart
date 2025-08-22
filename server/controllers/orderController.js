import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js";

const emitStockUpdate = async (productId) => {
  const updatedProduct = await Product.findById(productId);
  if (global.io && updatedProduct) {
    global.io.emit("stockUpdate", {
      productId: updatedProduct._id,
      stock: updatedProduct.stock,
    });
  }
};

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    if (!userId || !address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.json({ success: false, message: "Product not found" });
      if (!product.seller) return res.json({ success: false, message: `Product ${product.name} has no seller linked` });
      if (product.stock < item.quantity) return res.json({ success: false, message: `Not enough stock for ${product.name}` });

      product.stock -= item.quantity;
      await product.save();
      await emitStockUpdate(product._id);

      totalAmount += product.offerPrice * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        seller: product.seller,
      });
    }

    totalAmount += Math.floor(totalAmount * 0.02);

    await Order.create({
      userId,
      items: orderItems,
      amount: totalAmount,
      address,
      paymentType: "COD",
      isPaid: false,
      status: "Order Placed",
    });

    await User.findByIdAndUpdate(userId, { cartItems: {} });

    return res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const { origin } = req.headers;

    if (!userId || !address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let totalAmount = 0;
    const productData = [];
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.json({ success: false, message: "Product not found" });
      if (product.stock < item.quantity) return res.json({ success: false, message: `Not enough stock for ${product.name}` });

      product.stock -= item.quantity;
      await product.save();
      await emitStockUpdate(product._id);

      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });

      totalAmount += product.offerPrice * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        seller: product.seller,
      });
    }

    totalAmount += Math.floor(totalAmount * 0.02);
    if (totalAmount < 30) {
      return res.json({ success: false, message: "Stripe requires a minimum amount of ₹30. Please add more items." });
    }

    const order = await Order.create({
      userId,
      items: orderItems,
      amount: totalAmount,
      address,
      paymentType: "Online",
      isPaid: false,
      status: "Order Placed",
    });

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = productData.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/my-orders?payment=success`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // ✅ Added "Confirmed" and blocked changes after Delivered
    const allowed = ["Order Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findById(id).populate("items.product");
    if (!order) return res.json({ success: false, message: "Order not found" });

    if (order.status === "Delivered") {
      return res.json({ success: false, message: "Delivered orders cannot be changed" });
    }

    if (status === "Cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock += item.quantity;
          await product.save();
          await emitStockUpdate(product._id);
        }
      }
    }

    order.status = status;
    await order.save();

    return res.json({ success: true, message: `Order updated to ${status}`, order });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.body.userId || req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Not Authorized" });

    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .sort({ createdAt: -1 })
      .populate("items.product")
      .populate("items.seller");

    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const orders = await Order.find({
      "items.seller": sellerId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .sort({ createdAt: -1 })
      .populate("items.product")
      .populate("items.seller");

    return res.json({ success: true, orders });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata.orderId;
    const userId = session.metadata.userId;

    try {
      await Order.findByIdAndUpdate(orderId, {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: "Stripe",
        paymentInfo: {
          id: session.payment_intent,
          status: session.payment_status,
          amount_received: session.amount_total / 100,
        },
      });

      await User.findByIdAndUpdate(userId, { cartItems: {} });
    } catch (err) {
      return response.status(500).json({ received: false, message: err.message });
    }
  } else if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    try {
      if (orderId) {
        await Order.findByIdAndDelete(orderId);
      }
    } catch (err) {
      return response.status(500).json({ received: false, message: err.message });
    }
  }

  return response.json({ received: true });
};
