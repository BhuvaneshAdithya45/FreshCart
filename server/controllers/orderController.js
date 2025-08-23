// controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Stripe from "stripe";

// Single Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ----------------------------- helpers ----------------------------- */

const emitStockUpdate = async (productId) => {
  const updated = await Product.findById(productId);
  if (global.io && updated) {
    global.io.emit("stockUpdate", { productId: updated._id, stock: updated.stock });
  }
};

// 2% tax helper (you can tune/remove)
const addTax2Percent = (amt) => Math.floor(amt * 1.02);

/* ----------------------------- COD ----------------------------- */
/** POST /api/order/cod  (authUser) */
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;

    if (!userId || !address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let amount = 0;
    const orderItems = [];

    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) return res.json({ success: false, message: "Product not found" });
      if (!product.seller)
        return res.json({ success: false, message: `Product ${product.name} is missing seller link` });
      if (product.stock < it.quantity)
        return res.json({ success: false, message: `Not enough stock for ${product.name}` });

      product.stock -= it.quantity;
      await product.save();
      await emitStockUpdate(product._id);

      amount += product.offerPrice * it.quantity;
      orderItems.push({
        product: product._id,
        quantity: it.quantity,
        seller: product.seller,
      });
    }

    amount = addTax2Percent(amount);

    await Order.create({
      userId,
      items: orderItems,
      amount,
      address,
      paymentType: "COD",
      isPaid: false,
      status: "Order Placed",
    });

    // clear cart
    await User.findByIdAndUpdate(userId, { cartItems: {} });

    return res.json({ success: true, message: "Order Placed Successfully" });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

/* ----------------------------- Stripe checkout ----------------------------- */
/** POST /api/order/stripe  (authUser) */
export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const { origin } = req.headers;

    if (!userId || !address || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    let amount = 0;
    const orderItems = [];
    const line_items = [];

    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) return res.json({ success: false, message: "Product not found" });
      if (product.stock < it.quantity)
        return res.json({ success: false, message: `Not enough stock for ${product.name}` });

      // reserve stock immediately (we’ll restore on failure via webhook)
      product.stock -= it.quantity;
      await product.save();
      await emitStockUpdate(product._id);

      orderItems.push({
        product: product._id,
        quantity: it.quantity,
        seller: product.seller,
      });

      amount += product.offerPrice * it.quantity;

      line_items.push({
        price_data: {
          currency: "inr",
          product_data: { name: product.name },
          unit_amount: Math.round(product.offerPrice * 100),
        },
        quantity: it.quantity,
      });
    }

    amount = addTax2Percent(amount);

    // Guard (Stripe minimum)
    if (amount < 30) {
      return res.json({
        success: false,
        message: "Stripe requires a minimum amount of ₹30. Please add more items.",
      });
    }

    // create the (unpaid) order first
    const order = await Order.create({
      userId,
      items: orderItems,
      amount,
      address,
      paymentType: "Online",
      isPaid: false,
      status: "Order Placed",
    });

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      // include session_id so client can confirm if webhook is missing
      success_url: `${origin}/my-orders?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId,
      },
    });

    return res.json({ success: true, url: session.url });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

/* ----------------------------- Seller/admin views ----------------------------- */
/** GET /api/order/user  (authUser) */
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
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/order/seller  (authSeller) */
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
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

/** PATCH /api/order/:id/status  (authSeller) */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const allowed = ["Order Placed", "Confirmed", "Shipped", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.json({ success: false, message: "Invalid status value" });
    }

    const order = await Order.findById(id).populate("items.product");
    if (!order) return res.json({ success: false, message: "Order not found" });
    if (order.status === "Delivered") {
      return res.json({ success: false, message: "Delivered orders cannot be changed" });
    }

    // If cancelling, restore stock
    if (status === "Cancelled") {
      for (const it of order.items) {
        const p = await Product.findById(it.product._id);
        if (p) {
          p.stock += it.quantity;
          await p.save();
          await emitStockUpdate(p._id);
        }
      }
    }

    order.status = status;
    await order.save();

    return res.json({ success: true, message: `Order updated to ${status}`, order });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

/* ----------------------------- Stripe webhook ----------------------------- */
/**
 * POST /api/order/stripe/webhook
 * NOTE: This route is wired in server.js with `express.raw({ type: "application/json" })`
 * Do NOT use express.json() before it.
 */
export const stripeWebhooks = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Payment completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    const userId = session.metadata?.userId;

    try {
      await Order.findByIdAndUpdate(
        orderId,
        {
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: "Stripe",
          paymentInfo: {
            id: session.payment_intent,
            status: session.payment_status,
            amount_received: (session.amount_total || 0) / 100,
          },
        },
        { new: true }
      );

      // clear the user's cart
      await User.findByIdAndUpdate(userId, { cartItems: {} });
    } catch (err) {
      return res.status(500).json({ received: false, message: err.message });
    }
  }

  // Payment failed / session expired — restore stock & delete order
  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    try {
      if (orderId) {
        const order = await Order.findById(orderId).populate("items.product");
        if (order) {
          for (const it of order.items) {
            const p = await Product.findById(it.product._id);
            if (p) {
              p.stock += it.quantity;
              await p.save();
              await emitStockUpdate(p._id);
            }
          }
        }
        await Order.findByIdAndDelete(orderId);
      }
    } catch (err) {
      return res.status(500).json({ received: false, message: err.message });
    }
  }

  return res.json({ received: true });
};

/* ----------------------------- Fallback confirm (after redirect) ----------------------------- */
/** GET /api/order/stripe/confirm?session_id=...  (no auth; called by client after success redirect)
 *  Use when webhooks are not reachable in local dev. Idempotent.
 */
export const confirmStripeSession = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.payment_status !== "paid") {
      return res.json({ success: false, message: "Payment not completed yet" });
    }

    const orderId = session.metadata?.orderId;
    const userId = session.metadata?.userId;
    if (!orderId || !userId) {
      return res.status(400).json({ success: false, message: "Missing metadata" });
    }

    await Order.findByIdAndUpdate(
      orderId,
      {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: "Stripe",
        paymentInfo: {
          id: session.payment_intent,
          status: session.payment_status,
          amount_received: (session.amount_total || 0) / 100,
        },
      },
      { new: true }
    );

    await User.findByIdAndUpdate(userId, { cartItems: {} });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
