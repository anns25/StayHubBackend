import { faker } from '@faker-js/faker';
import Hotel from '../../models/Hotel.js';

// Unsplash hotel images (exterior/interior/room photos)
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop',
];

const CATEGORIES = ['budget', 'mid-range', 'luxury', 'boutique', 'resort'];
const AMENITIES = [
  'Wi-Fi', 'Parking', 'Restaurant', 'Gym', 'Pool', 'Spa', 'Breakfast',
  'Room Service', 'Laundry', 'Air Conditioning', 'Pet Friendly', 'Bar'
];

const cities = [
    { city: 'New York', state: 'New York', country: 'United States' },
    { city: 'Los Angeles', state: 'California', country: 'United States' },
    { city: 'Chicago', state: 'Illinois', country: 'United States' },
    { city: 'Miami', state: 'Florida', country: 'United States' },
    { city: 'San Francisco', state: 'California', country: 'United States' },
    { city: 'Boston', state: 'Massachusetts', country: 'United States' },
    { city: 'Seattle', state: 'Washington', country: 'United States' },
    { city: 'Las Vegas', state: 'Nevada', country: 'United States' },
  ];

export const seedHotels = async (hotelOwners) => {
    // Get existing hotels
    const existingHotels = await Hotel.find();
    const hotels = [...existingHotels];
  
    if (!hotelOwners || hotelOwners.length === 0) {
      console.log('   ⚠️  No hotel owners available. Using existing hotels only.');
      return hotels;
    }
  
    // Add new hotels (up to 10 total)
    const hotelsToAdd = Math.max(0, 10 - existingHotels.length);
    console.log(`   📝 Adding ${hotelsToAdd} new hotels...`);
  
    // ... existing cities array ...
  
    for (let i = 0; i < hotelsToAdd; i++) {
      const location = faker.helpers.arrayElement(cities);
      const category = faker.helpers.arrayElement(CATEGORIES);
      const numImages = faker.number.int({ min: 3, max: 6 });
      
      const images = Array.from({ length: numImages }, () => ({
        url: faker.helpers.arrayElement(HOTEL_IMAGES),
        publicId: null,
      }));
  
      const selectedAmenities = faker.helpers.arrayElements(
        AMENITIES,
        { min: 3, max: 8 }
      );
  
      const hotel = await Hotel.create({
        name: `${faker.company.name()} ${faker.helpers.arrayElement(['Hotel', 'Resort', 'Inn', 'Lodge', 'Suites'])}`,
        owner: faker.helpers.arrayElement(hotelOwners)._id,
        description: faker.lorem.paragraphs(2),
        category,
        location: {
          address: faker.location.streetAddress(),
          city: location.city,
          state: location.state,
          country: location.country,
          zipCode: faker.location.zipCode(),
          // coordinates: {
          //   latitude: parseFloat(faker.location.latitude()),
          //   longitude: parseFloat(faker.location.longitude()),
          // },
        },
        images,
        amenities: selectedAmenities,
        policies: {
          checkIn: '3:00 PM',
          checkOut: '11:00 AM',
          cancellation: faker.helpers.arrayElement([
            'Free cancellation up to 24 hours before check-in',
            'Non-refundable',
            'Free cancellation up to 48 hours before check-in',
          ]),
          pets: faker.datatype.boolean({ probability: 0.3 }),
          smoking: false,
          ageRestriction: null,
        },
        contact: {
          phone: faker.phone.number(),
          email: faker.internet.email().toLowerCase(),
          website: faker.internet.url(),
        },
        rating: {
          average: parseFloat(faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 }).toFixed(1)),
          count: faker.number.int({ min: 10, max: 500 }),
        },
        isApproved: true,
        isActive: true,
      });
  
      hotels.push(hotel);
    }
  
    return hotels;
  };