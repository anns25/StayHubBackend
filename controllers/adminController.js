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
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Previous period for comparison (30 days ago)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Current month date range
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Helper function to validate and round trend values
    const validateTrend = (value) => {
      if (isNaN(value) || !isFinite(value)) {
        return 0;
      }
      return Math.round(value * 10) / 10;
    };

    // ========== HOTELS STATISTICS ==========
    const totalHotels = await Hotel.countDocuments();
    const approvedHotels = await Hotel.countDocuments({ isApproved: true });
    const pendingHotels = totalHotels - approvedHotels;

    // Hotels created in last 30 days (for trend)
    const hotelsLast30Days = await Hotel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    
    const sixtyDaysAgo = new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hotelsPrevious30Days = await Hotel.countDocuments({
      createdAt: { 
        $gte: sixtyDaysAgo,
        $lt: thirtyDaysAgo,
      },
    });

    // Calculate hotels trend
    let hotelsTrend = 0;
    if (hotelsPrevious30Days === 0) {
      hotelsTrend = hotelsLast30Days > 0 ? 100 : 0;
    } else {
      hotelsTrend = ((hotelsLast30Days - hotelsPrevious30Days) / hotelsPrevious30Days) * 100;
    }
    hotelsTrend = validateTrend(hotelsTrend);

    // Pending hotels (new ones created today)
    const newPendingToday = await Hotel.countDocuments({
      isApproved: false,
      createdAt: { $gte: today },
    });

    // ========== USERS STATISTICS ==========
    const totalUsers = await User.countDocuments();
    
    // Active users: users who have logged in within last 30 days
    // Note: This assumes User model has a lastLogin field. If not, use a different approach.
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo },
    });

    // Users created in last 30 days (for trend)
    const usersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    
    const usersPrevious30Days = await User.countDocuments({
      createdAt: { 
        $gte: sixtyDaysAgo,
        $lt: thirtyDaysAgo,
      },
    });

    // Calculate users trend
    let usersTrend = 0;
    if (usersPrevious30Days === 0) {
      usersTrend = usersLast30Days > 0 ? 100 : 0;
    } else {
      usersTrend = ((usersLast30Days - usersPrevious30Days) / usersPrevious30Days) * 100;
    }
    usersTrend = validateTrend(usersTrend);

    // Get user counts by role (run in parallel for better performance)
    const [customers, owners, admins] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'hotel_owner' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    // ========== REVENUE STATISTICS ==========
    // Current month revenue
    const currentMonthRevenue = await Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          status: { $ne: 'cancelled' },
          createdAt: { $gte: currentMonthStart, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Previous month revenue
    const previousMonthRevenue = await Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          status: { $ne: 'cancelled' },
          createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const revenue = currentMonthRevenue[0]?.total || 0;
    const previousRevenue = previousMonthRevenue[0]?.total || 0;

    // Calculate revenue trend
    let revenueTrend = 0;
    if (previousRevenue === 0) {
      revenueTrend = revenue > 0 ? 100 : 0;
    } else {
      revenueTrend = ((revenue - previousRevenue) / previousRevenue) * 100;
    }
    revenueTrend = validateTrend(revenueTrend);

    // Total revenue (all time)
    const totalRevenueAllTime = await Booking.aggregate([
      { 
        $match: { 
          paymentStatus: 'paid',
          status: { $ne: 'cancelled' },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // ========== BOOKINGS STATISTICS ==========
    const [totalBookings, confirmedBookings, completedBookings, cancelledBookings] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'checked_out' }),
      Booking.countDocuments({ status: 'cancelled' }),
    ]);

    // ========== BUILD RESPONSE ==========
    const stats = {
      hotels: {
        total: totalHotels || 0,
        approved: approvedHotels || 0,
        pending: pendingHotels || 0,
        newPendingToday: newPendingToday || 0,
        trend: hotelsTrend,
      },
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        customers: customers || 0,
        owners: owners || 0,
        admins: admins || 0,
        trend: usersTrend,
      },
      bookings: {
        total: totalBookings || 0,
        confirmed: confirmedBookings || 0,
        completed: completedBookings || 0,
        cancelled: cancelledBookings || 0,
      },
      revenue: {
        currentMonth: revenue || 0,
        previousMonth: previousRevenue || 0,
        allTime: totalRevenueAllTime[0]?.total || 0,
        trend: revenueTrend,
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
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



