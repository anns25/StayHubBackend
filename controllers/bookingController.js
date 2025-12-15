import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req, res, next) => {
  try {
    let query = {};

    // Hotel owners see their hotel bookings, customers see their own
    if (req.user.role === 'hotel_owner') {
      const { Hotel } = await import('../models/Hotel.js');
      const hotels = await Hotel.find({ owner: req.user.id });
      query.hotel = { $in: hotels.map(h => h._id) };
    } else if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email')
      .populate('hotel', 'name location')
      .populate('room', 'name type price')
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

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('hotel', 'name location')
      .populate('room', 'name type price');

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
      .populate('room', 'name type')
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
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('hotel', 'name')
      .populate('room', 'name type');

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
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

