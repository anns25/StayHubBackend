import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Validate role
    const validRole = role && ['customer', 'hotel_owner', 'admin'].includes(role) ? role : 'customer';

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: validRole,
      // isApproved is set by default in schema (customers auto-approved, owners need approval)
    });

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
      responseData.message = 'Account created successfully. Your account is pending admin approval. You will be notified once approved.';
    }

    res.status(201).json(responseData);
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Check if user exists and password matches
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = user.generateToken();

    // Check if hotel owner is approved
    if (user.role === 'hotel_owner' && !user.isApproved) {
      // Return 200 with token but mark as pending approval
      return res.status(200).json({
        success: true,
        token, // Still return token so they can access pending-approval page
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          isVerified: user.isVerified,
          profileImage: user.profileImage,
        },
        requiresApproval: true,
        message: 'Your account is pending admin approval.',
      });
    }

    res.json({
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
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Since JWT is stateless, we just return success
    // In the future, you could implement token blacklisting here
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // If profile image is uploaded, use the Cloudinary URL
    if (req.file) {
      updateData.profileImage = req.file.path;
    }

    // Parse nested address fields if they exist
    if (req.body.address) {
      try {
        updateData.address = typeof req.body.address === 'string' 
          ? JSON.parse(req.body.address) 
          : req.body.address;
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

