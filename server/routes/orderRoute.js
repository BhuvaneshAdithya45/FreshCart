// routes/orderRoute.js
import express from "express";
import authUser from "../middlewares/authUser.js";
import authSeller from "../middlewares/authSeller.js";
import {
  placeOrderCOD,
  placeOrderStripe,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  confirmStripeSession, // fallback confirm after redirect
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// Create order
orderRouter.post("/cod", authUser, placeOrderCOD);
orderRouter.post("/stripe", authUser, placeOrderStripe);

// Read orders
orderRouter.get("/user", authUser, getUserOrders);
orderRouter.get("/seller", authSeller, getAllOrders);

// Update status (seller)
orderRouter.patch("/:id/status", authSeller, updateOrderStatus);

// Fallback confirmation if webhook didn't reach the server
orderRouter.get("/stripe/confirm", confirmStripeSession);

export default orderRouter;
