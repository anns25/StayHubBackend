import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    default: null, // null for general support, hotel ID for hotel-specific chat
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  message: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    enum: ['user', 'support', 'ai'],
    required: true,
  },
  smartReplies: [{
    type: String,
  }],
  isAI: {
    type: Boolean,
    default: false,
  },
  summary: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

chatMessageSchema.index({ user: 1, createdAt: -1 });
chatMessageSchema.index({ hotel: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;

