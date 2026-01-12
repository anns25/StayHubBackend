import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
// TODO: Re-enable geocoding at the end of the project
// import { geocodeAddress } from '../utils/geocoding.js';

// Helper function to parse nested FormData fields
const parseNestedFormData = (body) => {
  const parsed = { ...body };

  // Parse location fields if they exist as flat keys
  if (body['location[address]'] || body['location[city]']) {
    parsed.location = {
      address: body['location[address]'] || '',
      city: body['location[city]'] || '',
      state: body['location[state]'] || '',
      country: body['location[country]'] || '',
      zipCode: body['location[zipCode]'] || '',
    };
    // Clean up flat keys
    ['location[address]', 'location[city]', 'location[state]', 'location[country]', 'location[zipCode]'].forEach(key => {
      delete parsed[key];
    });
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

  // Parse policies
  if (body['policies[checkIn]'] || body['policies[checkOut]']) {
    parsed.policies = {
      checkIn: body['policies[checkIn]'] || '',
      checkOut: body['policies[checkOut]'] || '',
      cancellation: body['policies[cancellation]'] || '',
      pets: body['policies[pets]'] === 'true',
      smoking: body['policies[smoking]'] === 'true',
      ageRestriction: body['policies[ageRestriction]'] ? parseInt(body['policies[ageRestriction]']) : undefined,
    };
    ['policies[checkIn]', 'policies[checkOut]', 'policies[cancellation]', 'policies[pets]', 'policies[smoking]', 'policies[ageRestriction]'].forEach(key => {
      delete parsed[key];
    });
  }

  // Parse contact
  if (body['contact[phone]'] || body['contact[email]']) {
    parsed.contact = {
      phone: body['contact[phone]'] || '',
      email: body['contact[email]'] || '',
      website: body['contact[website]'] || '',
    };
    ['contact[phone]', 'contact[email]', 'contact[website]'].forEach(key => {
      delete parsed[key];
    });
  }

  return parsed;
};

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
export const getHotels = async (req, res, next) => {
  try {
    const { category, city, minPrice, maxPrice, search } = req.query;

    let query = { isApproved: true, isActive: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by city
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Filter by price range (if you have room prices, you'd need to join with rooms)
    // For now, this is a placeholder - you might need to adjust based on your schema
    if (minPrice || maxPrice) {
      // This would require aggregation if filtering by room prices
      // For now, we'll skip price filtering at hotel level
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const hotels = await Hotel.find(query)
      .populate('owner', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
export const getHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('owner', 'name email');

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

// @desc    Create hotel
// @route   POST /api/hotels
// @access  Private (Hotel Owner/Admin)
export const createHotel = async (req, res, next) => {
  try {
    // Parse FormData nested fields into proper objects
    req.body = parseNestedFormData(req.body);

    req.body.owner = req.user.id;

    // Log location data for debugging
    console.log('Location data received:', req.body.location);

    // TODO: Re-enable geocoding at the end of the project
    // Geocode address to get coordinates
    // if (req.body.location && !req.body.location.coordinates) {
    //   try {
    //     const coordinates = await geocodeAddress(req.body.location);
    //     req.body.location.coordinates = coordinates;
    //   } catch (error) {
    //     return res.status(400).json({
    //       success: false,
    //       message: error.message || 'Failed to geocode address',
    //     });
    //   }
    // }

    // Handle image uploads from Cloudinary
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path || file.secure_url || file.url,
        publicId: file.filename || file.public_id,
      }));
    }

    const hotel = await Hotel.create(req.body);

    res.status(201).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private (Hotel Owner/Admin)
export const updateHotel = async (req, res, next) => {
  try {
    // Parse FormData nested fields into proper objects
    req.body = parseNestedFormData(req.body);

    let hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    // Check ownership - ensure owner exists before calling toString()
    if (!hotel.owner) {
      return res.status(400).json({
        success: false,
        message: 'Hotel owner information is missing',
      });
    }

    // Convert owner to string for comparison (handles both ObjectId and string)
    const hotelOwnerId = hotel.owner.toString ? hotel.owner.toString() : String(hotel.owner);
    const userId = req.user.id.toString ? req.user.id.toString() : String(req.user.id);

    if (hotelOwnerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this hotel',
      });
    }

    // TODO: Re-enable geocoding at the end of the project
    // Geocode address if location fields changed
    // if (req.body.location && (
    //   req.body.location.address !== hotel.location.address ||
    //   req.body.location.city !== hotel.location.city ||
    //   req.body.location.state !== hotel.location.state ||
    //   req.body.location.country !== hotel.location.country ||
    //   req.body.location.zipCode !== hotel.location.zipCode
    // )) {
    //   try {
    //     const coordinates = await geocodeAddress(req.body.location);
    //     req.body.location.coordinates = coordinates;
    //   } catch (error) {
    //     return res.status(400).json({
    //       success: false,
    //       message: error.message || 'Failed to geocode address',
    //     });
    //   }
    // } else if (req.body.location) {
    //   // Keep existing coordinates if location hasn't changed
    //   req.body.location.coordinates = hotel.location.coordinates;
    // }

    // Handle image uploads from Cloudinary
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary if they exist
      if (hotel.images && hotel.images.length > 0) {
        const cloudinary = (await import('../config/cloudinary.js')).default;
        for (const image of hotel.images) {
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
      delete req.body.images;
    }

    hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private (Hotel Owner/Admin)
export const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    // Check ownership
    if (hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this hotel',
      });
    }

    await hotel.deleteOne();

    res.json({
      success: true,
      message: 'Hotel deleted',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search hotels
// @route   GET /api/hotels/search
// @access  Public
export const searchHotels = async (req, res, next) => {
  try {
    const { category, city, latitude, longitude, radius = 50 } = req.query;

    let query = { isApproved: true, isActive: true };

    if (category) {
      query.category = category;
    }

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    let hotels = await Hotel.find(query).populate('owner', 'name email');

    // TODO: Re-enable radius-based search when geocoding is enabled
    // Filter by radius if coordinates provided
    // if (latitude && longitude) {
    //   const lat = parseFloat(latitude);
    //   const lng = parseFloat(longitude);
    //   const radiusKm = parseFloat(radius);
    //
    //   hotels = hotels.filter(hotel => {
    //     if (!hotel.location.coordinates || !hotel.location.coordinates.latitude || !hotel.location.coordinates.longitude) {
    //       return false; // Skip hotels without coordinates
    //     }
    //     const distance = calculateDistance(
    //       lat,
    //       lng,
    //       hotel.location.coordinates.latitude,
    //       hotel.location.coordinates.longitude
    //     );
    //     return distance <= radiusKm;
    //   });
    // }

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

// TODO: Re-enable when geocoding is enabled
// Helper function to calculate distance between two coordinates
// function calculateDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; // Radius of the Earth in km
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// @desc    Get hotels by owner
// @route   GET /api/hotels/my-hotels
// @access  Private (Hotel Owner/Admin)
export const getMyHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find({ owner: req.user.id })
      .sort('-createdAt');

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get hotel owner dashboard statistics
// @route   GET /api/hotels/dashboard/stats
// @access  Private (Hotel Owner/Admin)
export const getHotelOwnerDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all hotels owned by the user
    const hotels = await Hotel.find({ owner: userId }).select('_id');
    const hotelIds = hotels.map(h => h._id.toString());

    if (hotelIds.length === 0) {
      return res.json({
        success: true,
        data: {
          bookingsToday: 0,
          bookingsTodayChange: 0,
          occupancyRate: 0,
          occupancyRateChange: 0,
          monthlyRevenue: 0,
          monthlyRevenueChange: 0,
          hotels: [],
        },
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's date range for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get current month date range
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get previous month date range
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // Import Booking model
    const Booking = (await import('../models/Booking.js')).default;
    const Room = (await import('../models/Room.js')).default;

    // Bookings created today
    const bookingsToday = await Booking.countDocuments({
      hotel: { $in: hotelIds },
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
    });

    // Bookings created yesterday (for comparison)
    const bookingsYesterday = await Booking.countDocuments({
      hotel: { $in: hotelIds },
      createdAt: { $gte: yesterday, $lt: today },
      status: { $ne: 'cancelled' },
    });

    // Calculate bookings today change percentage
    const bookingsTodayChange = bookingsYesterday === 0
      ? (bookingsToday > 0 ? 100 : 0)
      : ((bookingsToday - bookingsYesterday) / bookingsYesterday) * 100;

    // Get all rooms for occupancy calculation
    const rooms = await Room.find({ hotel: { $in: hotelIds }, isActive: true });
    const totalRooms = rooms.reduce((sum, room) => sum + room.quantity, 0);

    // Get active bookings (confirmed, checked_in, or checked_out with paid status)
    const activeBookings = await Booking.find({
      hotel: { $in: hotelIds },
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
      paymentStatus: 'paid',
      checkIn: { $lte: new Date() },
      checkOut: { $gte: new Date() },
    });

    // Calculate occupied rooms
    const occupiedRooms = activeBookings.length;

    // Current occupancy rate
    const occupancyRate = totalRooms === 0 ? 0 : (occupiedRooms / totalRooms) * 100;

    // Previous period occupancy (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const previousActiveBookings = await Booking.find({
      hotel: { $in: hotelIds },
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
      paymentStatus: 'paid',
      checkIn: { $lte: thirtyDaysAgo },
      checkOut: { $gte: thirtyDaysAgo },
    });
    const previousOccupiedRooms = previousActiveBookings.length;
    const previousOccupancyRate = totalRooms === 0 ? 0 : (previousOccupiedRooms / totalRooms) * 100;
    const occupancyRateChange = previousOccupancyRate === 0
      ? (occupancyRate > 0 ? 100 : 0)
      : ((occupancyRate - previousOccupancyRate) / previousOccupancyRate) * 100;

    // Monthly revenue (current month, paid bookings)
    const monthlyBookings = await Booking.find({
      hotel: { $in: hotelIds },
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
    });
    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Previous month revenue
    const previousMonthBookings = await Booking.find({
      hotel: { $in: hotelIds },
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
    });
    const previousMonthlyRevenue = previousMonthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const monthlyRevenueChange = previousMonthlyRevenue === 0
      ? (monthlyRevenue > 0 ? 100 : 0)
      : ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100;

    // Get hotel details with room counts and revenue
    const hotelsWithStats = await Promise.all(
      hotels.map(async (hotel) => {
        const hotelId = hotel._id.toString();

        // Room count for this hotel
        const hotelRooms = await Room.countDocuments({ hotel: hotelId, isActive: true });
        const totalHotelRooms = await Room.aggregate([
          { $match: { hotel: hotel._id, isActive: true } },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);
        const roomCount = totalHotelRooms.length > 0 ? totalHotelRooms[0].total : 0;

        // Revenue for this hotel (current month)
        const hotelBookings = await Booking.find({
          hotel: hotelId,
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          paymentStatus: 'paid',
          status: { $ne: 'cancelled' },
        });
        const hotelRevenue = hotelBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

        return {
          id: hotelId,
          roomCount,
          revenue: hotelRevenue,
        };
      })
    );

    res.json({
      success: true,
      data: {
        bookingsToday,
        bookingsTodayChange: Math.round(bookingsTodayChange * 10) / 10,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        occupancyRateChange: Math.round(occupancyRateChange * 10) / 10,
        monthlyRevenue,
        monthlyRevenueChange: Math.round(monthlyRevenueChange * 10) / 10,
        hotels: hotelsWithStats,
      },
    });
  } catch (error) {
    console.error('Get hotel owner dashboard stats error:', error);
    next(error);
  }
};
