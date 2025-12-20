import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a hotel name'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
  },
  category: {
    type: String,
    enum: ['budget', 'mid-range', 'luxury', 'boutique', 'resort'],
    required: true,
  },
  location: {
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
    },
    coordinates: {
      latitude: {
        type: Number,
        //required: true,
      },
      longitude: {
        type: Number,
        //required: true,
      },
    },
  },
  images: [{
    url: String,
    publicId: String,
  }],
  videos: [{
    url: String,
    publicId: String,
  }],
  amenities: [{
    type: String,
  }],
  policies: {
    checkIn: String,
    checkOut: String,
    cancellation: String,
    pets: Boolean,
    smoking: Boolean,
    ageRestriction: Number,
  },
  contact: {
    phone: String,
    email: String,
    website: String,
  },
  rating: {
    average: {
      type: Number,
      default: 0,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for location-based searches
hotelSchema.index({ 'location.coordinates': '2dsphere' });
hotelSchema.index({ category: 1 });
hotelSchema.index({ isApproved: 1, isActive: 1 });

const Hotel = mongoose.model('Hotel', hotelSchema);

export default Hotel;

