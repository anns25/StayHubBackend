import express from 'express';
import {
  getHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  searchHotels,
  getMyHotels,
} from '../controllers/hotelController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

router.get('/search', searchHotels);
router.get('/my-hotels', protect, authorize('hotel_owner', 'admin'), getMyHotels);
router.get('/', getHotels);
router.get('/:id', getHotel);
router.post('/', protect, authorize('hotel_owner', 'admin'), upload.array('images', 10), handleUploadError, createHotel);
router.patch('/:id', protect, authorize('hotel_owner', 'admin'), upload.array('images', 10), handleUploadError, updateHotel);
router.delete('/:id', protect, authorize('hotel_owner', 'admin'), deleteHotel);

export default router;

