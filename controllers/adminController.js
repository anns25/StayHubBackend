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

