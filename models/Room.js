import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a room description'],
  },
  type: {
    type: String,
    enum: ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'],
    required: true,
  },
  price: {
    base: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    seasonal: [{
      season: String,
      multiplier: Number, // e.g., 1.2 for 20% increase
      startDate: Date,
      endDate: Date,
    }],
  },
  capacity: {
    adults: {
      type: Number,
      required: true,
      default: 2,
    },
    children: {
      type: Number,
      default: 0,
    },
  },
  size: {
    value: Number,
    unit: {
      type: String,
      enum: ['sqft', 'sqm'],
      default: 'sqft',
    },
  },
  images: [{
    url: String,
    publicId: String,
  }],
  amenities: [{
    type: String,
  }],
  bedType: {
    type: String,
    enum: ['single', 'double', 'queen', 'king', 'bunk'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  available: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

roomSchema.index({ hotel: 1 });
roomSchema.index({ isActive: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;

