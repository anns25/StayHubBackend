import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

// Helper function to parse nested FormData fields
const parseNestedFormData = (body) => {
  const parsed = { ...body };
  
  // Parse price fields
  if (body['price[base]']) {
    parsed.price = {
      base: parseFloat(body['price[base]']) || 0,
      currency: body['price[currency]'] || 'USD',
    };
    delete parsed['price[base]'];
    delete parsed['price[currency]'];
  }
  
  // Parse capacity fields
  if (body['capacity[adults]'] || body['capacity[children]']) {
    parsed.capacity = {
      adults: parseInt(body['capacity[adults]']) || 2,
      children: parseInt(body['capacity[children]']) || 0,
    };
    delete parsed['capacity[adults]'];
    delete parsed['capacity[children]'];
  }
  
  // Parse size fields
  if (body['size[value]']) {
    parsed.size = {
      value: parseFloat(body['size[value]']) || 0,
      unit: body['size[unit]'] || 'sqft',
    };
    delete parsed['size[value]'];
    delete parsed['size[unit]'];
  }
  
  // Parse amenities array
  const amenities = [];
  let index = 0;
  while (body[`amenities[${index}]`]) {
    amenities.push(body[`amenities[${index}]`]);
    delete parsed[`amenities[${index}]`];
    index++;
  }
  if (amenities.length > 0) {
    parsed.amenities = amenities;
  }
  
  // Parse numeric fields
  if (body.quantity) {
    parsed.quantity = parseInt(body.quantity) || 1;
  }
  if (body.available) {
    parsed.available = parseInt(body.available) || parsed.quantity || 1;
  }
  
  return parsed;
};

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
    // Parse FormData nested fields into proper objects
    req.body = parseNestedFormData(req.body);
    
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

    // Handle image uploads from Cloudinary
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path || file.secure_url || file.url,
        publicId: file.filename || file.public_id,
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
    // Parse FormData nested fields into proper objects
    req.body = parseNestedFormData(req.body);
    
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

    // Handle image uploads from Cloudinary
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary if they exist
      if (room.images && room.images.length > 0) {
        const cloudinary = (await import('../config/cloudinary.js')).default;
        for (const image of room.images) {
          if (image.publicId) {
            try {
              await cloudinary.uploader.destroy(image.publicId);
            } catch (error) {
              console.error('Error deleting old image from Cloudinary:', error);
            }
          }
        }
      }

      req.body.images = req.files.map(file => ({
        url: file.path || file.secure_url || file.url,
        publicId: file.filename || file.public_id,
      }));
    } else {
      // Keep existing images if no new images uploaded
      delete req.body.images;
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

