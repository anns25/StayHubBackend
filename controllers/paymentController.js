import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import sendEmail from '../utils/sendEmail.js';
import User from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
export const createPaymentIntent = async (req, res, next) => {
    try {
        const { room, checkIn, checkOut, guests, specialRequests } = req.body;

        // Validate room and calculate total
        const roomData = await Room.findById(room);
        if (!roomData) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        // Check availability
        const existingBookings = await Booking.find({
            room,
            status: { $in: ['confirmed', 'checked_in'] },
            $or: [
                {
                    checkIn: { $lte: new Date(checkOut) },
                    checkOut: { $gte: new Date(checkIn) },
                },
            ],
        });

        if (existingBookings.length >= roomData.available) {
            return res.status(400).json({
                success: false,
                message: 'Room not available for selected dates',
            });
        }

        // Calculate total
        const nights = Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
        );
        const totalAmount = roomData.price.base * nights;

        // Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: req.user.id,
                roomId: room,
                hotelId: roomData.hotel.toString(),
                checkIn,
                checkOut,
                adults: guests.adults,
                children: guests.children || 0,
                specialRequests: specialRequests || '',
            },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            amount: totalAmount,
        });
    } catch (error) {
        next(error);
    }
};

// Confirm payment and create booking
export const confirmPayment = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: 'Payment not completed',
            });
        }

        // Extract metadata
        const { userId, roomId, hotelId, checkIn, checkOut, adults, children, specialRequests } = paymentIntent.metadata;

        //Get hotel and owner info for notification
        const Hotel = (await import('../models/Hotel.js')).default;
        const hotel = await Hotel.findById(hotelId).populate('owner', 'name email');

        // Create booking
        const booking = await Booking.create({
            customer: userId,
            hotel: hotelId,
            room: roomId,
            checkIn,
            checkOut,
            guests: {
                adults: parseInt(adults),
                children: parseInt(children) || 0,
            },
            totalAmount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'card',
            specialRequests: specialRequests || undefined,
            paymentIntentId: paymentIntentId.id,
        });

        // Update room availability
        const roomData = await Room.findById(roomId);
        if (roomData) {
            roomData.available -= 1;
            await roomData.save();
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('hotel', 'name')
            .populate('room', 'name type')
            .populate('customer', 'name email');

        // Send notification email to hotel owner
        if (hotel && hotel.owner && hotel.owner.email) {
            try {
                const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
                const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                await sendEmail({
                    email: hotel.owner.email,
                    subject: `New Booking Confirmed - ${hotel.name}`,
                    message: `
              <h2>New Booking Confirmed!</h2>
              <p>You have received a new booking for your hotel <strong>${hotel.name}</strong>.</p>
              <h3>Booking Details:</h3>
              <ul>
                <li><strong>Booking ID:</strong> ${booking._id}</li>
                <li><strong>Customer:</strong> ${populatedBooking.customer?.name || 'N/A'}</li>
                <li><strong>Room:</strong> ${populatedBooking.room?.name || 'N/A'}</li>
                <li><strong>Check-in:</strong> ${checkInDate}</li>
                <li><strong>Check-out:</strong> ${checkOutDate}</li>
                <li><strong>Guests:</strong> ${adults} adult(s), ${children || 0} child(ren)</li>
                <li><strong>Total Amount:</strong> ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)}</li>
                ${specialRequests ? `<li><strong>Special Requests:</strong> ${specialRequests}</li>` : ''}
              </ul>
              <p>Please log in to your dashboard to view and manage this booking.</p>
            `,
                });
            } catch (emailError) {
                // Don't fail the booking if email fails
                console.error('Failed to send booking notification email:', emailError);
            }
        }

        res.json({
            success: true,
            data: populatedBooking,
        });
    } catch (error) {
        next(error);
    }
};

// Webhook handler for Stripe events
export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook signature verification failed.`);
    }

    // Handle payment success
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        // You can update booking status here if needed
        console.log('Payment succeeded:', paymentIntent.id);
    }

    res.json({ received: true });
};