import express from 'express';
import {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomsByHotel,
} from '../controllers/roomController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/hotel/:hotelId', getRoomsByHotel);
router.get('/:id', getRoom);
router.get('/', getRooms);
router.post('/', protect, authorize('hotel_owner', 'admin'), upload.array('images', 5), createRoom);
router.put('/:id', protect, authorize('hotel_owner', 'admin'), upload.array('images', 5), updateRoom);
router.delete('/:id', protect, authorize('hotel_owner', 'admin'), deleteRoom);

export default router;

