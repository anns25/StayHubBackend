import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
} from '../controllers/paymentController.js';

const router = express.Router();

// Webhook must be before body parser middleware
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected routes
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

export default router;