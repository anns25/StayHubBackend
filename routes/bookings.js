import express from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  getMyBookings,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-bookings', protect, getMyBookings);
router.get('/:id', protect, getBooking);
router.get('/', protect, getBookings);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);
router.put('/:id/cancel', protect, cancelBooking);

export default router;

