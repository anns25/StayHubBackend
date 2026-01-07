import { faker } from '@faker-js/faker';
import Room from '../../models/Room.js';

// Unsplash room images
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
];

const ROOM_TYPES = ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'];
const BED_TYPES = ['single', 'double', 'queen', 'king'];
const ROOM_AMENITIES = [
  'TV', 'Mini Bar', 'Safe', 'Balcony', 'Ocean View', 'City View',
  'Jacuzzi', 'Work Desk', 'Coffee Maker', 'Refrigerator'
];

// Price ranges by category
const PRICE_RANGES = {
  budget: { min: 50, max: 100 },
  'mid-range': { min: 100, max: 200 },
  luxury: { min: 200, max: 500 },
  boutique: { min: 150, max: 300 },
  resort: { min: 250, max: 600 },
};

export const seedRooms = async (hotels) => {
  // Get existing rooms
  const existingRooms = await Room.find();
  const rooms = [...existingRooms];

  if (!hotels || hotels.length === 0) {
    console.log('   ⚠️  No hotels available. Using existing rooms only.');
    return rooms;
  }

  // Add rooms for each hotel (3-5 per hotel)
  console.log(`   📝 Adding rooms for ${hotels.length} hotels...`);

  for (const hotel of hotels) {
    // Check how many rooms this hotel already has
    const existingHotelRooms = existingRooms.filter(
      r => r.hotel.toString() === hotel._id.toString()
    );
    
    // Add rooms if hotel has less than 5
    const roomsToAdd = Math.max(0, 5 - existingHotelRooms.length);
    
    for (let i = 0; i < roomsToAdd; i++) {
      const roomType = faker.helpers.arrayElement(ROOM_TYPES);
      const priceRange = PRICE_RANGES[hotel.category] || PRICE_RANGES['mid-range'];
      const basePrice = faker.number.float({ 
        min: priceRange.min, 
        max: priceRange.max, 
        fractionDigits: 2 
      });
      
      const quantity = faker.number.int({ min: 1, max: 10 });
      const available = faker.number.int({ min: 0, max: quantity });
      
      const numImages = faker.number.int({ min: 2, max: 4 });
      const images = Array.from({ length: numImages }, () => ({
        url: faker.helpers.arrayElement(ROOM_IMAGES),
        publicId: null,
      }));

      const selectedAmenities = faker.helpers.arrayElements(
        ROOM_AMENITIES,
        { min: 3, max: 6 }
      );

      const room = await Room.create({
        hotel: hotel._id,
        name: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room ${i + 1}`,
        description: faker.lorem.paragraphs(2),
        type: roomType,
        price: {
          base: basePrice,
          currency: 'USD',
        },
        capacity: {
          adults: faker.number.int({ min: 1, max: 4 }),
          children: faker.number.int({ min: 0, max: 2 }),
        },
        size: {
          value: faker.number.int({ min: 200, max: 800 }),
          unit: 'sqft',
        },
        images,
        amenities: selectedAmenities,
        bedType: faker.helpers.arrayElement(BED_TYPES),
        quantity,
        available,
        isActive: true,
      });
      
      rooms.push(room);
    }
  }

  return rooms;
};