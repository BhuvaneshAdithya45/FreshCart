import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js";

// Helper: Emit stock updates in real-time
const emitStockUpdate = async (productId) => {
  const updatedProduct = await Product.findById(productId);
  if (global.io && updatedProduct) {
    global.io.emit("stockUpdate", {
      productId: updatedProduct._id,
      stock: updatedProduct.stock,
    });
    console.log(`🔄 Stock updated: ${updatedProduct.name} -> ${updatedProduct.stock}`);
  }
};

// ==========================
// COD Order: /api/order/cod
// ==========================
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    if (!address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.json({ success: false, message: "Product not found" });

      if (!product.seller) {
        return res.json({ success: false, message: `Product ${product.name} has no seller linked` });
      }

      if (product.stock < item.quantity) {
        return res.json({ success: false, message: `Not enough stock for ${product.name}` });
      }

      // Decrement stock
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

    totalAmount += Math.floor(totalAmount * 0.02); // 2% tax

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
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

// ==========================
// Stripe Order: /api/order/stripe
// ==========================
export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const { origin } = req.headers;

    if (!address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let totalAmount = 0;
    const productData = [];
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.json({ success: false, message: "Product not found" });

      if (product.stock < item.quantity) {
        return res.json({ success: false, message: `Not enough stock for ${product.name}` });
      }

      // Decrement stock
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

    totalAmount += Math.floor(totalAmount * 0.02); // Add tax

    if (totalAmount < 30) {
      return res.json({
        success: false,
        message: "Stripe requires a minimum amount of ₹30. Please add more items.",
      });
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
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

// ==========================
// Update Order Status
// ==========================
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["Order Placed", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findById(id).populate("items.product");
    if (!order) return res.json({ success: false, message: "Order not found" });

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
    res.json({ success: false, message: error.message });
  }
};

// ==========================
// Get Orders for User
// ==========================
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product items.seller address")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ==========================
// Get Orders for Seller
// ==========================
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      "items.seller": req.sellerId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product items.seller address")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ==========================
// Stripe Webhooks: /stripe
// ==========================
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

      console.log("✅ Stripe payment verified and order updated:", orderId);
    } catch (err) {
      console.log("⚠️ DB update error after Stripe payment:", err.message);
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
        console.log("❌ Stripe payment failed, Order deleted:", orderId);
      }
    } catch (err) {
      console.log("⚠️ Error during failed payment cleanup:", err.message);
    }
  } else {
    console.log(`⚠️ Unhandled event type: ${event.type}`);
  }

  response.json({ received: true });
};
