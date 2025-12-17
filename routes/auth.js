import express from 'express';
import { register, login, getMe, updateProfile, logout } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { oauthCallback } from '../controllers/oauthController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordController.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.patch('/resetpassword/:resettoken', authLimiter, resetPassword);
router.post('/oauth/callback', authLimiter, oauthCallback);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Check if user exists (for OAuth flow)
router.get('/check-user', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      res.json({
        exists: true,
        user: {
          role: user.role,
          isApproved: user.isApproved,
        },
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

