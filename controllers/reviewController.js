import Review from '../models/Review.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';

// @desc    Get reviews for a hotel
// @route   GET /api/reviews/hotel/:hotelId
// @access  Public
export const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      hotel: req.params.hotelId,
      isPublished: true,
    })
      .populate('customer', 'name profileImage')
      .sort('-createdAt');

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
export const getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('customer', 'name profileImage')
      .populate('hotel', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res, next) => {
  try {
    const { hotel, booking, rating, comment } = req.body;

    // Verify booking belongs to user
    const bookingData = await Booking.findById(booking);
    if (!bookingData || bookingData.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking',
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking',
      });
    }

    const review = await Review.create({
      customer: req.user.id,
      hotel,
      booking,
      rating,
      comment,
      isVerified: true,
    });

    // Update hotel rating
    await updateHotelRating(hotel);

    const populatedReview = await Review.findById(review._id)
      .populate('customer', 'name profileImage');

    res.status(201).json({
      success: true,
      data: populatedReview,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (review.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review',
      });
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name profileImage');

    // Update hotel rating
    await updateHotelRating(review.hotel);

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to review
// @route   POST /api/reviews/:id/respond
// @access  Private (Hotel Owner/Admin)
export const respondToReview = async (req, res, next) => {
  try {
    const { text, tone } = req.body;

    const review = await Review.findById(req.params.id).populate('hotel');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check hotel ownership
    if (review.hotel.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this review',
      });
    }

    review.ownerResponse = {
      text,
      tone,
      respondedAt: new Date(),
    };

    await review.save();

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update hotel rating
async function updateHotelRating(hotelId) {
  const reviews = await Review.find({ hotel: hotelId });
  if (reviews.length === 0) return;

  const average = reviews.reduce((sum, review) => sum + review.rating.overall, 0) / reviews.length;

  await Hotel.findByIdAndUpdate(hotelId, {
    'rating.average': average.toFixed(1),
    'rating.count': reviews.length,
  });
}

