import express from 'express';
import { register, login, getMe, updateProfile, logout } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { oauthCallback } from '../controllers/oauthController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordController.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.patch('/resetpassword/:resettoken', authLimiter, resetPassword);
router.post('oauth/callback', authLimiter, oauthCallback);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;

