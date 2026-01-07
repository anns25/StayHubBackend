import { faker } from '@faker-js/faker';
import User from '../../models/User.js';

// Unsplash placeholder images for user profiles
const PROFILE_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
];

// Helper function to generate email from name
const generateEmail = (name) => {
  const firstName = name.split(' ')[0].toLowerCase();
  // Remove special characters and spaces
  const cleanFirstName = firstName.replace(/[^a-z0-9]/g, '');
  return `${cleanFirstName}@stayhub.com`;
};

export const seedUsers = async () => {
  // Get existing users
  const existingCustomers = await User.find({ role: 'customer' });
  const existingHotelOwners = await User.find({ role: 'hotel_owner' });
  const existingAdmins = await User.find({ role: 'admin' });

  const customers = [...existingCustomers];
  const hotelOwners = [...existingHotelOwners];
  const admins = [...existingAdmins];

  // Add new customers (up to 20 total)
  const customersToAdd = Math.max(0, 20 - existingCustomers.length);
  console.log(`   📝 Adding ${customersToAdd} new customers...`);
  
  for (let i = 0; i < customersToAdd; i++) {
    let email;
    let name;
    let attempts = 0;
    
    // Generate unique email based on name
    do {
      name = faker.person.fullName();
      email = generateEmail(name);
      attempts++;
    } while (await User.findOne({ email }) && attempts < 20);

    if (attempts >= 20) {
      // Fallback: add number if name collision
      const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${firstName}${i + 1}@stayhub.com`;
      
      // Check if this also exists
      if (await User.findOne({ email })) {
        console.log('   ⚠️  Could not generate unique email, skipping...');
        continue;
      }
    }

    const user = await User.create({
      name,
      email,
      password: 'password123',
      role: 'customer',
      isVerified: faker.datatype.boolean({ probability: 0.8 }),
      isApproved: true,
      profileImage: faker.helpers.arrayElement(PROFILE_IMAGES),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
      },
    });
    customers.push(user);
    console.log(`      Created: ${name} - ${email}`);
  }

  // Add new hotel owners (up to 5 total)
  const ownersToAdd = Math.max(0, 5 - existingHotelOwners.length);
  console.log(`   📝 Adding ${ownersToAdd} new hotel owners...`);
  
  for (let i = 0; i < ownersToAdd; i++) {
    let email;
    let name;
    let attempts = 0;
    
    do {
      name = faker.person.fullName();
      email = generateEmail(name);
      attempts++;
    } while (await User.findOne({ email }) && attempts < 20);

    if (attempts >= 20) {
      const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${firstName}${i + 1}@stayhub.com`;
      
      if (await User.findOne({ email })) {
        continue;
      }
    }

    const user = await User.create({
      name,
      email,
      password: 'password123',
      role: 'hotel_owner',
      isVerified: true,
      isApproved: true,
      profileImage: faker.helpers.arrayElement(PROFILE_IMAGES),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
      },
    });
    hotelOwners.push(user);
    console.log(`      Created: ${name} - ${email}`);
  }

  // Add admin only if none exists
  if (existingAdmins.length === 0) {
    console.log('   📝 Adding admin user...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@stayhub.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      isApproved: true,
      profileImage: faker.helpers.arrayElement(PROFILE_IMAGES),
    });
    admins.push(admin);
    console.log(`      Created: Admin User - admin@stayhub.com`);
  } else {
    console.log('   ⚠️  Admin already exists. Skipping admin creation.');
  }

  return { customers, hotelOwners, admins };
};