import aiService from '../services/aiService.js';
import Room from '../models/Room.js';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';

// @desc    Generate room description
// @route   POST /api/ai/room-description
// @access  Private
export const generateRoomDescription = async (req, res, next) => {
  try {
    const { roomType, amenities, size, bedType } = req.body;

    const prompt = `Generate a compelling, SEO-optimized room description for a ${roomType} hotel room. 
    Details: ${bedType} bed, ${size} ${size.includes('sq') ? '' : 'square feet'}, amenities: ${amenities.join(', ')}.
    Make it professional, inviting, and highlight key features. Keep it under 150 words.`;

    const description = await aiService.generateText(prompt, 200);

    res.json({
      success: true,
      description,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate review response
// @route   POST /api/ai/review-response
// @access  Private
export const generateReviewResponse = async (req, res, next) => {
  try {
    const { reviewId, tone = 'professional' } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    const prompt = `Generate a ${tone} response to this hotel review. 
    Review: "${review.comment}" (Rating: ${review.rating.overall}/5)
    Make it warm, professional, and address any concerns. Keep it under 100 words.`;

    const response = await aiService.generateText(prompt, 150);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate pricing suggestion
// @route   POST /api/ai/pricing-suggestion
// @access  Private
export const generatePricingSuggestion = async (req, res, next) => {
  try {
    const { roomId, season, currentPrice } = req.body;

    const room = await Room.findById(roomId).populate('hotel');
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    const prompt = `Suggest an optimal pricing strategy for a ${room.type} room in a ${room.hotel.category} hotel.
    Current price: $${currentPrice}/night, Season: ${season}.
    Consider market trends, seasonality, and competitive positioning. Provide a price recommendation and brief reasoning.`;

    const suggestion = await aiService.generateText(prompt, 150);

    res.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate marketing content
// @route   POST /api/ai/marketing-content
// @access  Private
export const generateMarketingContent = async (req, res, next) => {
  try {
    const { hotelId, type, theme } = req.body;

    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found',
      });
    }

    const prompt = `Generate ${type} marketing content for a ${hotel.category} hotel named "${hotel.name}" in ${hotel.location.city}.
    Theme: ${theme || 'general promotion'}. Make it engaging, persuasive, and highlight unique features. Keep it under 200 words.`;

    const content = await aiService.generateText(prompt, 250);

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate smart replies
// @route   POST /api/ai/smart-replies
// @access  Private
export const generateSmartReplies = async (req, res, next) => {
  try {
    const { message, context } = req.body;

    const prompt = `Generate 3 short, helpful reply suggestions for this hotel guest message: "${message}".
    Context: ${context || 'general inquiry'}. Return only the replies, one per line, max 10 words each.`;

    const response = await aiService.generateText(prompt, 100);
    const replies = response.split('\n').filter(r => r.trim()).slice(0, 3);

    res.json({
      success: true,
      replies,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate booking summary
// @route   POST /api/ai/booking-summary
// @access  Private
export const generateBookingSummary = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('hotel', 'name location')
      .populate('room', 'name type');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const prompt = `Create a concise booking summary for a stay at ${booking.hotel.name}:
    Room: ${booking.room.name}, Check-in: ${booking.checkIn}, Check-out: ${booking.checkOut}, 
    Guests: ${booking.guests.adults} adults. Make it friendly and informative. Keep it under 100 words.`;

    const summary = await aiService.generateText(prompt, 120);

    // Update booking with summary
    booking.aiSummary = summary;
    await booking.save();

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate business insights
// @route   POST /api/ai/business-insights
// @access  Private
export const generateBusinessInsights = async (req, res, next) => {
  try {
    const { hotelId } = req.body;

    const hotel = await Hotel.findById(hotelId);
    const bookings = await Booking.find({ hotel: hotelId });
    const reviews = await Review.find({ hotel: hotelId });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating.overall, 0) / reviews.length
      : 0;

    const prompt = `Analyze hotel performance and provide business insights:
    Hotel: ${hotel.name}, Total Bookings: ${bookings.length}, Total Revenue: $${totalRevenue}, 
    Average Rating: ${avgRating.toFixed(1)}/5, Reviews: ${reviews.length}.
    Provide 3-5 actionable insights and recommendations in bullet points.`;

    const insights = await aiService.generateText(prompt, 300);

    res.json({
      success: true,
      insights,
      stats: {
        totalBookings: bookings.length,
        totalRevenue,
        averageRating: avgRating.toFixed(1),
        reviewCount: reviews.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

