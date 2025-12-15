import ChatMessage from '../models/ChatMessage.js';
import aiService from '../services/aiService.js';

export const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room for hotel-specific chat
    socket.on('join-hotel', (hotelId) => {
      socket.join(`hotel-${hotelId}`);
      console.log(`User ${socket.id} joined hotel-${hotelId}`);
    });

    // Handle new message
    socket.on('send-message', async (data) => {
      try {
        const { user, hotel, booking, message, sender } = data;

        // Save message to database
        const chatMessage = await ChatMessage.create({
          user,
          hotel,
          booking,
          message,
          sender: sender || 'user',
        });

        // Generate smart replies if it's a user message
        let smartReplies = [];
        if (sender === 'user') {
          try {
            const prompt = `Generate 3 short, helpful reply suggestions for this hotel guest message: "${message}". Return only the replies, one per line, max 10 words each.`;
            const aiResponse = await aiService.generateText(prompt, 100);
            smartReplies = aiResponse.split('\n').filter(r => r.trim()).slice(0, 3);
          } catch (error) {
            console.error('Error generating smart replies:', error);
          }
        }

        // Emit message to room
        const room = hotel ? `hotel-${hotel}` : 'general';
        io.to(room).emit('new-message', {
          ...chatMessage.toObject(),
          smartReplies,
        });

        // If it's a user message, optionally trigger AI response
        if (sender === 'user' && hotel) {
          // Auto-respond logic can be added here
        }
      } catch (error) {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

