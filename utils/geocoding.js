import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

/**
 * Geocode an address to get coordinates
 * @param {Object} location - Location object with address, city, state, country, zipCode
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const geocodeAddress = async (location) => {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not set in environment variables');
    }

    // Build full address string
    const addressParts = [
      location.address,
      location.city,
      location.state,
      location.country,
      location.zipCode,
    ].filter(Boolean); // Remove empty parts

    const fullAddress = addressParts.join(', ');

    if (!fullAddress) {
      throw new Error('Address information is incomplete');
    }

    console.log('Geocoding address:', fullAddress);
    console.log('Using API key:', process.env.GOOGLE_MAPS_API_KEY ? 'Set' : 'Not set');

    const response = await client.geocode({
      params: {
        address: fullAddress,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return {
        latitude: lat,
        longitude: lng,
      };
    } else {
      throw new Error('No results found for the provided address');
    }
  } catch (error) {
    console.error('Geocoding error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    if (error.response?.data?.error_message) {
      throw new Error(`Geocoding failed: ${error.response.data.error_message}`);
    }
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to geocode address. Please check the address and try again.');
  }
};