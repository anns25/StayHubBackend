import Hotel from '../models/Hotel.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

// @desc    Get pending approvals
// @route   GET /api/admin/pending-approvals
// @access  Private (Admin)
export const getPendingApprovals = async (req, res, next) => {
  try {
    const pendingHotels = await Hotel.find({ isApproved: false })
      .populate('owner', 'name email');
    
    const pendingOwners = await User.find({
      role: 'hotel_owner',
      isApproved: false,
    });

    res.json({
      success: true,
      data: {
        hotels: pendingHotels,
        owners: pendingOwners,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve hotel
// @route   PUT /api/admin/hotels/:id/approve
// @access  Private (Admin)
export const approveHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate('owner', 'name email');

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve user
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin)
export const approveUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
export const getPlatformAnalytics = async (req, res, next) => {
  try {
    const totalHotels = await Hotel.countDocuments();
    const approvedHotels = await Hotel.countDocuments({ isApproved: true });
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const stats = {
      hotels: {
        total: totalHotels,
        approved: approvedHotels,
        pending: totalHotels - approvedHotels,
      },
      users: {
        total: totalUsers,
        customers: await User.countDocuments({ role: 'customer' }),
        owners: await User.countDocuments({ role: 'hotel_owner' }),
        admins: await User.countDocuments({ role: 'admin' }),
      },
      bookings: {
        total: totalBookings,
        confirmed: await Booking.countDocuments({ status: 'confirmed' }),
        completed: await Booking.countDocuments({ status: 'checked_out' }),
      },
      revenue: totalRevenue[0]?.total || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate demo data
// @route   POST /api/admin/generate-demo-data
// @access  Private (Admin)
export const generateDemoData = async (req, res, next) => {
  try {
    // This would use AI to generate realistic demo data
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Demo data generation will be implemented with AI service',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status === 'pending') {
      query.isApproved = false;
    } else if (status === 'approved') {
      query.isApproved = true;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/admin/users/statistics
// @access  Private (Admin)
export const getUserStatistics = async (req, res, next) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Total users by role
    const totalUsers = await User.countDocuments();
    const customers = await User.countDocuments({ role: 'customer' });
    const owners = await User.countDocuments({ role: 'hotel_owner' });
    const admins = await User.countDocuments({ role: 'admin' });
    
    // Pending approvals
    const pendingOwners = await User.countDocuments({
      role: 'hotel_owner',
      isApproved: false,
    });
    
    // New registrations
    const newLast7Days = await User.countDocuments({
      createdAt: { $gte: last7Days },
    });
    const newLast30Days = await User.countDocuments({
      createdAt: { $gte: last30Days },
    });
    
    // Verified users
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = totalUsers - verifiedUsers;
    
    // OAuth users
    const oauthUsers = await User.countDocuments({
      oauthProvider: { $ne: null },
    });
    const emailUsers = totalUsers - oauthUsers;
    
    // Registration trend (last 7 days)
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    
    res.json({
      success: true,
      data: {
        totals: {
          all: totalUsers,
          customers,
          owners,
          admins,
        },
        approvals: {
          pending: pendingOwners,
          approved: owners - pendingOwners,
        },
        registrations: {
          last7Days: newLast7Days,
          last30Days: newLast30Days,
        },
        verification: {
          verified: verifiedUsers,
          unverified: unverifiedUsers,
        },
        authentication: {
          oauth: oauthUsers,
          email: emailUsers,
        },
        trend: registrationTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

