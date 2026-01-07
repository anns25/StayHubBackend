import { faker } from '@faker-js/faker';
import Booking from '../../models/Booking.js';

const STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];
const PAYMENT_METHODS = ['card', 'paypal', 'cash'];

export const seedBookings = async (customers, hotels, rooms) => {
  // Get existing bookings
  const existingBookings = await Booking.find();
  const bookings = [...existingBookings];

  if (!customers || customers.length === 0 || !hotels || hotels.length === 0 || !rooms || rooms.length === 0) {
    console.log('   ⚠️  Missing required data. Using existing bookings only.');
    return bookings;
  }

  // Add new bookings (up to 30 total)
  const bookingsToAdd = Math.max(0, 30 - existingBookings.length);
  console.log(`   📝 Adding ${bookingsToAdd} new bookings...`);

  for (let i = 0; i < bookingsToAdd; i++) {
    // Select random customer, hotel, and room
    const customer = faker.helpers.arrayElement(customers);
    const hotel = faker.helpers.arrayElement(hotels);
    
    // Get rooms for this hotel
    const hotelRooms = rooms.filter(r => r.hotel.toString() === hotel._id.toString());
    if (hotelRooms.length === 0) continue; // Skip if hotel has no rooms
    
    const room = faker.helpers.arrayElement(hotelRooms);
    
    // Generate check-in date (between today and 30 days from now)
    const checkInDate = faker.date.future({ days: 30 });
    // Generate check-out date (1-7 days after check-in)
    const nights = faker.number.int({ min: 1, max: 7 });
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + nights);
    
    // Calculate total amount (room price * nights)
    const basePrice = room.price?.base || 100;
    const totalAmount = parseFloat((basePrice * nights).toFixed(2));
    
    // Generate guest count
    const adults = faker.number.int({ min: 1, max: 4 });
    const children = faker.number.int({ min: 0, max: 2 });
    
    // Select status and payment status (with realistic combinations)
    const status = faker.helpers.arrayElement(STATUSES);
    let paymentStatus = faker.helpers.arrayElement(PAYMENT_STATUSES);
    
    // Adjust payment status based on booking status
    if (status === 'cancelled') {
      paymentStatus = faker.helpers.arrayElement(['pending', 'refunded']);
    } else if (status === 'checked_in' || status === 'checked_out') {
      paymentStatus = 'paid';
    } else if (status === 'confirmed') {
      paymentStatus = faker.helpers.arrayElement(['pending', 'paid']);
    }
    
    const paymentMethod = paymentStatus === 'paid' 
      ? faker.helpers.arrayElement(PAYMENT_METHODS)
      : undefined;
    
    const booking = await Booking.create({
      customer: customer._id,
      hotel: hotel._id,
      room: room._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: {
        adults,
        children,
      },
      totalAmount,
      currency: 'USD',
      status,
      paymentStatus,
      paymentMethod,
      specialRequests: faker.datatype.boolean({ probability: 0.3 }) 
        ? faker.lorem.sentence()
        : null,
      cancellationReason: status === 'cancelled' && faker.datatype.boolean({ probability: 0.5 })
        ? faker.lorem.sentence()
        : null,
    });
    
    bookings.push(booking);
  }

  return bookings;
};