import express from 'express';
import {
  getHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  searchHotels,
} from '../controllers/hotelController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/search', searchHotels);
router.get('/', getHotels);
router.get('/:id', getHotel);
router.post('/', protect, authorize('hotel_owner', 'admin'), upload.array('images', 10), createHotel);
router.put('/:id', protect, authorize('hotel_owner', 'admin'), upload.array('images', 10), updateHotel);
router.delete('/:id', protect, authorize('hotel_owner', 'admin'), deleteHotel);

export default router;

