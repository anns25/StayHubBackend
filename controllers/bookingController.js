import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    let query = {};

    if (req.user.role === 'hotel_owner') {
      const hotels = await Hotel.find({ owner: req.user.id }).select('_id');
      const hotelIds = hotels.map(h => h._id);

      if (hotelIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }

      if (req.query.hotel && req.query.hotel !== 'all') {
        if (!hotelIds.some(id => id.equals(req.query.hotel))) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this hotel',
          });
        }
        query.hotel = req.query.hotel;
      } else {
        query.hotel = { $in: hotelIds };
      }
    }

    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email')
      .populate('hotel', 'name location images')
      .populate('room', 'name type price images')
      .sort('-createdAt');

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    next(error);
  }
};


// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('hotel', 'name location images phone email')
      .populate('room', 'name type price capacity images description');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate('hotel', 'name location images')
      .populate('room', 'name type images')
      .sort('-createdAt');

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res, next) => {
  try {
    const { room, checkIn, checkOut, guests, specialRequests } = req.body;

    // Get room details
    const roomData = await Room.findById(room);
    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check availability
    const existingBookings = await Booking.find({
      room,
      status: { $in: ['confirmed', 'checked_in'] },
      $or: [
        {
          checkIn: { $lte: new Date(checkOut) },
          checkOut: { $gte: new Date(checkIn) },
        },
      ],
    });

    if (existingBookings.length >= roomData.available) {
      return res.status(400).json({
        success: false,
        message: 'Room not available for selected dates',
      });
    }

    // Calculate total amount
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    const totalAmount = roomData.price.base * nights;

    const booking = await Booking.create({
      customer: req.user.id,
      hotel: roomData.hotel,
      room,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      specialRequests,
    });

    // Update room availability
    roomData.available -= 1;
    await roomData.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('hotel', 'name')
      .populate('room', 'name type');

    res.status(201).json({
      success: true,
      data: populatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'owner');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization
    const isHotelOwner = req.user.role === 'hotel_owner' &&
      booking.hotel &&
      booking.hotel.owner.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';
    const isCustomer = req.user.role === 'customer' &&
      booking.customer.toString() === req.user.id.toString();

    // Only hotel owners and admins can update booking status
    // Customers can only update their own bookings for non-status fields
    if (req.body.status) {
      if (!isHotelOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only hotel owners and admins can change booking status',
        });
      }
    } else {
      // For non-status updates, allow customer to update their own booking
      if (!isHotelOwner && !isAdmin && !isCustomer) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this booking',
        });
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('hotel', 'name location images')
      .populate('room', 'name type price images')
      .populate('customer', 'name email');

    res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

/// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'owner');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization: customers can cancel their own, hotel owners can cancel their hotel's bookings, admins can cancel any
    const isHotelOwner = req.user.role === 'hotel_owner' &&
      booking.hotel &&
      booking.hotel.owner.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';
    const isCustomer = req.user.role === 'customer' &&
      booking.customer.toString() === req.user.id.toString();

    if (!isHotelOwner && !isAdmin && !isCustomer) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this booking',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason;
    await booking.save();

    // Update room availability
    const room = await Room.findById(booking.room);
    if (room) {
      room.available += 1;
      await room.save();
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

