import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import { seedUsers } from './seeders/users.js';
import { seedHotels } from './seeders/hotels.js';
import { seedRooms } from './seeders/rooms.js';
import { seedBookings } from './seeders/bookings.js';
import { seedReviews } from './seeders/reviews.js';

// Load environment variables
dotenv.config();

// Safety check: DO NOT run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: Seeding is not allowed in production environment!');
  console.error('   Set NODE_ENV to "development" or remove it to run seeding.');
  process.exit(1);
}

const runSeed = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Connect to database
    await connectDB();

    // Seed in order (respecting dependencies)
    console.log('📝 Seeding Users...');
    const users = await seedUsers();
    console.log(`✅ Created ${users.customers.length} customers, ${users.hotelOwners.length} hotel owners, ${users.admins.length} admin\n`);

    console.log('🏨 Seeding Hotels...');
    const hotels = await seedHotels(users.hotelOwners);
    console.log(`✅ Created ${hotels.length} hotels\n`);

    console.log('🛏️  Seeding Rooms...');
    const rooms = await seedRooms(hotels);
    console.log(`✅ Created ${rooms.length} rooms\n`);

    console.log('📅 Seeding Bookings...');
    const bookings = await seedBookings(users.customers, hotels, rooms);
    console.log(`✅ Created ${bookings.length} bookings\n`);

    console.log('⭐ Seeding Reviews...');
    const reviews = await seedReviews(bookings);
    console.log(`✅ Created ${reviews.length} reviews\n`);

    console.log('✨ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${users.customers.length + users.hotelOwners.length + users.admins.length}`);
    console.log(`   - Hotels: ${hotels.length}`);
    console.log(`   - Rooms: ${rooms.length}`);
    console.log(`   - Bookings: ${bookings.length}`);
    console.log(`   - Reviews: ${reviews.length}\n`);

    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSeed();