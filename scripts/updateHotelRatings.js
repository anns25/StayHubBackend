import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Hotel from '../models/Hotel.js';
import Review from '../models/Review.js';

// Load environment variables
dotenv.config();

const updateHotelRatings = async () => {
  try {
    console.log('🔄 Starting hotel ratings update...\n');

    // Connect to database
    await connectDB();

    // Get all hotels
    const hotels = await Hotel.find({});
    console.log(`📊 Found ${hotels.length} hotels to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each hotel
    for (const hotel of hotels) {
      // Find all published reviews for this hotel
      const reviews = await Review.find({ 
        hotel: hotel._id,
        isPublished: true 
      });

      if (reviews.length === 0) {
        // No reviews, set to default
        await Hotel.findByIdAndUpdate(hotel._id, {
          'rating.average': 0,
          'rating.count': 0,
        });
        skippedCount++;
        console.log(`⏭️  ${hotel.name}: No reviews (set to 0)`);
        continue;
      }

      // Calculate average rating from overall ratings
      const totalRating = reviews.reduce((sum, review) => {
        return sum + (review.rating?.overall || 0);
      }, 0);

      const average = totalRating / reviews.length;
      const roundedAverage = Math.round(average * 10) / 10; // Round to 1 decimal place

      // Update hotel rating
      await Hotel.findByIdAndUpdate(hotel._id, {
        'rating.average': roundedAverage,
        'rating.count': reviews.length,
      });

      updatedCount++;
      console.log(`✅ ${hotel.name}: ${roundedAverage}/5.0 (${reviews.length} reviews)`);
    }

    console.log('\n✨ Hotel ratings update completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} hotels`);
    console.log(`   ⏭️  Skipped (no reviews): ${skippedCount} hotels`);
    console.log(`   📈 Total processed: ${hotels.length} hotels`);

    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating hotel ratings:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
updateHotelRatings();