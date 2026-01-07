import { faker } from '@faker-js/faker';
import Review from '../../models/Review.js';

const REVIEW_COMMENTS = [
  'Great stay! The room was clean and comfortable.',
  'Excellent service and beautiful location.',
  'The hotel exceeded our expectations.',
  'Perfect for a weekend getaway.',
  'Amazing amenities and friendly staff.',
  'Would definitely stay here again.',
  'The breakfast was delicious!',
  'Beautiful views and great value.',
  'Very comfortable beds and quiet rooms.',
  'Outstanding hospitality and attention to detail.',
  'The location was perfect for exploring the city.',
  'Clean rooms and excellent customer service.',
  'Great value for money, highly recommended!',
  'The staff was very helpful and accommodating.',
  'Loved the modern amenities and comfortable atmosphere.',
];

export const seedReviews = async (bookings) => {
  // Get existing reviews
  const existingReviews = await Review.find();
  const reviews = [...existingReviews];

  if (!bookings || bookings.length === 0) {
    console.log('   ⚠️  No bookings available. Using existing reviews only.');
    return reviews;
  }

  // Filter for completed bookings (checked_out status)
  const completedBookings = bookings.filter(b => b.status === 'checked_out');
  
  if (completedBookings.length === 0) {
    console.log('   ⚠️  No completed bookings available. Using existing reviews only.');
    return reviews;
  }

  // Add new reviews (up to 20 total)
  const reviewsToAdd = Math.max(0, 20 - existingReviews.length);
  console.log(`   📝 Adding ${reviewsToAdd} new reviews...`);

  for (let i = 0; i < reviewsToAdd; i++) {
    const booking = faker.helpers.arrayElement(completedBookings);
    
    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking: booking._id });
    if (existingReview) continue;

    // Generate ratings
    const overallRating = faker.number.int({ min: 3, max: 5 }); // Bias towards positive reviews
    const cleanliness = faker.number.int({ min: 1, max: 5 });
    const service = faker.number.int({ min: 1, max: 5 });
    const value = faker.number.int({ min: 1, max: 5 });
    const location = faker.number.int({ min: 1, max: 5 });

    // Determine sentiment based on overall rating
    let sentiment = 'positive';
    if (overallRating <= 2) {
      sentiment = 'negative';
    } else if (overallRating === 3) {
      sentiment = 'neutral';
    }

    // Generate comment (use predefined or faker)
    const comment = faker.datatype.boolean({ probability: 0.7 })
      ? faker.helpers.arrayElement(REVIEW_COMMENTS)
      : faker.lorem.paragraphs(1);

    const review = await Review.create({
      customer: booking.customer,
      hotel: booking.hotel,
      booking: booking._id,
      rating: {
        overall: overallRating,
        cleanliness,
        service,
        value,
        location,
      },
      comment,
      sentiment,
      isVerified: faker.datatype.boolean({ probability: 0.6 }),
      isPublished: faker.datatype.boolean({ probability: 0.9 }),
    });
    
    reviews.push(review);
  }

  return reviews;
};