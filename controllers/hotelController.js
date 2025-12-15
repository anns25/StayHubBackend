import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
export const getHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find({ isApproved: true, isActive: true })
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
    req.body.owner = req.user.id;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
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
    let hotel = await Hotel.findById(req.params.id);

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
        message: 'Not authorized to update this hotel',
      });
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
      }));
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

    // Filter by radius if coordinates provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      hotels = hotels.filter(hotel => {
        const distance = calculateDistance(
          lat,
          lng,
          hotel.location.coordinates.latitude,
          hotel.location.coordinates.longitude
        );
        return distance <= radiusKm;
      });
    }

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

