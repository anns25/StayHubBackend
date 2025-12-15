import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
export const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .populate('hotel', 'name location')
      .sort('-createdAt');

    res.json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('hotel');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rooms by hotel
// @route   GET /api/rooms/hotel/:hotelId
// @access  Public
export const getRoomsByHotel = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      hotel: req.params.hotelId,
      isActive: true,
    }).populate('hotel', 'name');

    res.json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private (Hotel Owner/Admin)
export const createRoom = async (req, res, next) => {
  try {
    // Verify hotel ownership
    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create rooms for this hotel',
      });
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
      }));
    }

    // Set available to quantity if not provided
    if (!req.body.available) {
      req.body.available = req.body.quantity || 1;
    }

    const room = await Room.create(req.body);

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Hotel Owner/Admin)
export const updateRoom = async (req, res, next) => {
  try {
    let room = await Room.findById(req.params.id).populate('hotel');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check hotel ownership
    if (room.hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room',
      });
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
      }));
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Hotel Owner/Admin)
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('hotel');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check hotel ownership
    if (room.hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room',
      });
    }

    await room.deleteOne();

    res.json({
      success: true,
      message: 'Room deleted',
    });
  } catch (error) {
    next(error);
  }
};

