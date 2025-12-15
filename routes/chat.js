import express from 'express';
import {
  getMessages,
  sendMessage,
  getChatSummary,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/:hotelId?', protect, getMessages);
router.post('/', protect, sendMessage);
router.get('/summary/:bookingId', protect, getChatSummary);

export default router;

