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
