import express from 'express';
import authUser from '../middlewares/authUser.js';
import {
  getAllOrders,
  getUserOrders,
  placeOrderCOD,
  placeOrderStripe,
  updateOrderStatus
} from '../controllers/orderController.js';
import authSeller from '../middlewares/authSeller.js';

const orderRouter = express.Router();

// User order routes
orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.get('/user', authUser, getUserOrders);

// Seller order routes
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.patch('/:id/status', authSeller, updateOrderStatus);  // NEW: Update order status (Shipped/Delivered)

export default orderRouter;
