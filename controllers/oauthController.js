import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// @desc    Handle OAuth callback (Google/GitHub)
// @route   POST /api/auth/oauth/callback
// @access  Public
export const oauthCallback = async (req, res, next) => {
  try {
    const { provider, oauthId, email, name, profileImage, role } = req.body;

    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth provider',
      });
    }

    // Check if user exists by oauthId
    let user = await User.findOne({ 
      oauthProvider: provider,
      oauthId: oauthId 
    });

    // If not found by oauthId, check by email
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      
      if (user) {
        // Link OAuth account to existing user
        user.oauthProvider = provider;
        user.oauthId = oauthId;
        if (profileImage && !user.profileImage) {
          user.profileImage = profileImage;
        }
        // OAuth users are automatically verified
        user.isVerified = true;
        await user.save();
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      // OAuth users default to customer role (can't register as hotel_owner via OAuth)
      const userRole = role === 'hotel_owner' ? 'customer' : (role || 'customer');
      
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        oauthProvider: provider,
        oauthId: oauthId,
        role: userRole,
        profileImage: profileImage || null,
        isVerified: true, // OAuth users are automatically verified
        isApproved: userRole === 'customer', // Customers auto-approved
        // No password required for OAuth users
      });
    }

    // Check if hotel owner is approved
    if (user.role === 'hotel_owner' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. Please wait for approval before logging in.',
        requiresApproval: true,
      });
    }

    // Generate token
    const token = user.generateToken();

    // Prepare response
    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
      },
    };

    // Add message for hotel owners about approval
    if (user.role === 'hotel_owner' && !user.isApproved) {
      responseData.message = 'Account created successfully. Your account is pending admin approval.';
    }

    res.json(responseData);
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    next(error);
  }
};