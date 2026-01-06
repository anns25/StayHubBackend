import express from 'express';
import {
    getFavoriteHotels,
    addToFavorites,
    removeFromFavorites,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Favorites routes
router.get('/favorites', getFavoriteHotels);
router.post('/favorites/:hotelId', addToFavorites);
router.delete('/favorites/:hotelId', removeFromFavorites);

export default router;