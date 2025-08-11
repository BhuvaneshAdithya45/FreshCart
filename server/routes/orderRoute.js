import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
  getAllOrders,
  getUserOrders,
  placeOrderCOD,
  placeOrderStripe,
  updateOrderStatus,
  stripeWebhooks
} from '../controllers/orderController.js';
import bodyParser from 'body-parser';

const orderRouter = express.Router();

// Stripe webhook must use raw body
orderRouter.post('/stripe/webhook', bodyParser.raw({ type: 'application/json' }), stripeWebhooks);

orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.patch('/:id/status', authSeller, updateOrderStatus);

export default orderRouter;
