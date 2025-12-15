import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
    },
    service: {
      type: Number,
      min: 1,
      max: 5,
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
    },
    location: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  comment: {
    type: String,
    required: true,
  },
  ownerResponse: {
    text: String,
    generatedByAI: {
      type: Boolean,
      default: false,
    },
    tone: {
      type: String,
      enum: ['professional', 'friendly', 'apologetic', 'grateful'],
    },
    respondedAt: Date,
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

reviewSchema.index({ hotel: 1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ 'rating.overall': 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;

