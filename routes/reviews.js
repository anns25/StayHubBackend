import express from 'express';
import {
  getReviews,
  getReview,
  createReview,
  updateReview,
  respondToReview,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/hotel/:hotelId', getReviews);
router.get('/:id', getReview);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.post('/:id/respond', protect, authorize('hotel_owner', 'admin'), respondToReview);

export default router;

