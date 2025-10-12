/**
 * Hotelbeds Hotel Search API Adapter
 * Provides real hotel data with prices and accessibility information
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const HOTELBEDS_API_KEY = process.env.HOTELBEDS_API_KEY;
const HOTELBEDS_SECRET = process.env.HOTELBEDS_SECRET;
const HOTELBEDS_BASE_URL = 'https://api.test.hotelbeds.com/hotel-api/1.0';

// Destination code mapping (IATA city codes for Hotelbeds)
// Hotelbeds uses IATA codes (3 letters max)
const DESTINATION_MAPPING = {
  // Europe
  'paris': 'PAR',      // Paris, France
  'rome': 'ROM',       // Rome, Italy
  'london': 'LON',     // London, UK
  'barcelona': 'BCN',  // Barcelona, Spain
  'amsterdam': 'AMS',  // Amsterdam, Netherlands
  'venice': 'VCE',     // Venice, Italy
  'florence': 'FLR',   // Florence, Italy
  'milan': 'MIL',      // Milan, Italy
  'madrid': 'MAD',     // Madrid, Spain
  'lisbon': 'LIS',     // Lisbon, Portugal
  'berlin': 'BER',     // Berlin, Germany
  'munich': 'MUC',     // Munich, Germany
  'vienna': 'VIE',     // Vienna, Austria
  'prague': 'PRG',     // Prague, Czech Republic

  // North America
  'new york': 'NYC',   // New York, USA
  'los angeles': 'LAX', // Los Angeles, USA
  'chicago': 'CHI',    // Chicago, USA
  'miami': 'MIA',      // Miami, USA
  'las vegas': 'LAS',  // Las Vegas, USA
  'san francisco': 'SFO', // San Francisco, USA
  'boston': 'BOS',     // Boston, USA
  'washington': 'WAS', // Washington DC, USA
  'austin': 'AUS',     // Austin, USA
  'seattle': 'SEA',    // Seattle, USA
  'denver': 'DEN',     // Denver, USA

  // Asia
  'tokyo': 'TYO',      // Tokyo, Japan
  'bangkok': 'BKK',    // Bangkok, Thailand
  'singapore': 'SIN',  // Singapore
  'hong kong': 'HKG',  // Hong Kong
  'dubai': 'DXB',      // Dubai, UAE
  'seoul': 'SEL',      // Seoul, South Korea
  'beijing': 'BJS',    // Beijing, China
  'shanghai': 'SHA',   // Shanghai, China

  // Others
  'sydney': 'SYD',     // Sydney, Australia
  'melbourne': 'MEL',  // Melbourne, Australia
  'toronto': 'YTO',    // Toronto, Canada
  'vancouver': 'YVR',  // Vancouver, Canada
  'montreal': 'YMQ'    // Montreal, Canada
};

/**
 * Generate Hotelbeds API signature
 */
function generateSignature(apiKey, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha256')
    .update(apiKey + secret + timestamp)
    .digest('hex');

  return { signature, timestamp };
}

/**
 * Search hotels using Hotelbeds API
 */
export async function searchHotelsHotelbeds(prefs) {
  // Check if API credentials are configured
  if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
    console.log('⚠️  Hotelbeds API not configured - using demo mode');
    return generateDemoHotels(prefs);
  }

  try {
    const destination = prefs.destination.toLowerCase();
    const destinationCode = DESTINATION_MAPPING[destination];

    if (!destinationCode) {
      console.log(`⚠️  No Hotelbeds destination code for ${prefs.destination} - using demo mode`);
      return generateDemoHotels(prefs);
    }

    // Generate authentication signature
    const { signature, timestamp } = generateSignature(HOTELBEDS_API_KEY, HOTELBEDS_SECRET);

    // Format dates for API (YYYY-MM-DD)
    const checkIn = prefs.startDate;
    const checkOut = prefs.endDate;

    // Build request payload
    const payload = {
      stay: {
        checkIn: checkIn,
        checkOut: checkOut
      },
      occupancies: [
        {
          rooms: 1,
          adults: prefs.travelers || 2,
          children: 0
        }
      ],
      destination: {
        code: destinationCode
      },
      filter: {
        maxHotels: 5,
        minRate: 50,
        maxRate: 500
      },
      reviews: [
        {
          type: "HOTELBEDS",
          minRate: 3
        }
      ]
    };

    console.log('🔍 Searching Hotelbeds hotels:', {
      destination: prefs.destination,
      code: destinationCode,
      dates: `${checkIn} to ${checkOut}`,
      travelers: prefs.travelers
    });

    // Make API request
    const response = await fetch(`${HOTELBEDS_BASE_URL}/hotels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-key': HOTELBEDS_API_KEY,
        'X-Signature': signature,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hotelbeds API error:', response.status, errorText);
      return generateDemoHotels(prefs);
    }

    const data = await response.json();

    if (!data.hotels || !data.hotels.hotels || data.hotels.hotels.length === 0) {
      console.log('No hotels found, using demo mode');
      return generateDemoHotels(prefs);
    }

    console.log(`✅ Found ${data.hotels.hotels.length} hotels from Hotelbeds`);

    // Transform Hotelbeds response to our format
    const hotels = data.hotels.hotels.slice(0, 3).map(hotel => normalizeHotelbedsHotel(hotel, prefs));

    return hotels;

  } catch (error) {
    console.error('Hotelbeds API error:', error.message);
    return generateDemoHotels(prefs);
  }
}

/**
 * Normalize Hotelbeds hotel data to our format
 */
function normalizeHotelbedsHotel(hotel, prefs) {
  // Get the first room rate
  const firstRoom = hotel.rooms?.[0];
  const rate = firstRoom?.rates?.[0];

  // Calculate total price and price per night
  const totalPrice = parseFloat(rate?.net || 0);
  const nights = calculateNights(prefs.startDate, prefs.endDate);
  const pricePerNight = nights > 0 ? Math.round(totalPrice / nights) : totalPrice;

  // Extract accessibility features from hotel facilities
  const accessibility = extractAccessibilityFeatures(hotel);

  // Get hotel category (stars)
  const category = hotel.categoryCode || '4';

  return {
    id: `hotelbeds_${hotel.code}`,
    name: hotel.name || 'Hotel',
    neighborhood: hotel.destinationName || hotel.zoneName || 'City Center',
    rating: parseFloat(hotel.S2C || 8.0), // S2C is Hotelbeds rating (0-10)
    pricePerNight: pricePerNight,
    totalPrice: totalPrice,
    currency: rate?.currency || 'EUR',
    category: parseInt(category),
    accessibility: accessibility,
    amenities: extractAmenities(hotel),
    address: hotel.address?.content || '',
    coordinates: {
      latitude: hotel.latitude,
      longitude: hotel.longitude
    },
    images: hotel.images?.map(img => img.path) || [],
    cancellationPolicies: rate?.cancellationPolicies || [],
    hotelbedsCode: hotel.code // Store original code for booking
  };
}

/**
 * Extract accessibility features from hotel facilities
 */
function extractAccessibilityFeatures(hotel) {
  const accessibility = [];
  const facilities = hotel.facilities || [];

  // Map Hotelbeds facility codes to our accessibility features
  const facilityMap = {
    '10': 'wheelchair_access',       // Wheelchair accessible
    '20': 'elevator_required',       // Lift/Elevator
    '70': 'step_free',               // Accessible bathroom
    '290': 'hearing_assist',         // Facilities for disabled guests
    '550': 'service_animal_friendly' // Pets allowed (for service animals)
  };

  for (const facility of facilities) {
    const facilityCode = facility.facilityCode?.toString();
    if (facilityMap[facilityCode]) {
      accessibility.push(facilityMap[facilityCode]);
    }
  }

  // Check if hotel has medical services (useful for diabetes support)
  if (facilities.some(f => f.facilityGroupCode === 60)) { // Medical services
    accessibility.push('diabetes_support');
  }

  return accessibility.length > 0 ? accessibility : ['wheelchair_access', 'elevator_required'];
}

/**
 * Extract amenities from hotel facilities
 */
function extractAmenities(hotel) {
  const amenities = [];
  const facilities = hotel.facilities || [];

  const amenityMap = {
    '10': 'wifi',
    '15': 'parking',
    '20': 'restaurant',
    '30': 'bar',
    '40': 'gym',
    '50': 'pool',
    '60': 'spa',
    '70': 'room_service',
    '261': 'air_conditioning'
  };

  for (const facility of facilities) {
    const code = facility.facilityCode?.toString();
    if (amenityMap[code]) {
      amenities.push(amenityMap[code]);
    }
  }

  return amenities;
}

/**
 * Calculate number of nights between dates
 */
function calculateNights(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate demo hotels when API is not available
 */
function generateDemoHotels(prefs) {
  const destination = prefs.destination || 'Unknown';
  const nights = calculateNights(prefs.startDate, prefs.endDate);

  return [
    {
      id: 'demo_1',
      name: `Grand ${destination} Hotel`,
      neighborhood: 'City Center',
      rating: 9.2,
      pricePerNight: 180,
      totalPrice: 180 * nights,
      currency: 'USD',
      category: 5,
      accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'diabetes_support'],
      amenities: ['wifi', 'parking', 'restaurant', 'gym', 'pool', 'spa'],
      address: `123 Main Street, ${destination}`,
      coordinates: { latitude: 0, longitude: 0 },
      images: [],
      cancellationPolicies: []
    },
    {
      id: 'demo_2',
      name: `${destination} Plaza Hotel`,
      neighborhood: 'Historic District',
      rating: 8.8,
      pricePerNight: 150,
      totalPrice: 150 * nights,
      currency: 'USD',
      category: 4,
      accessibility: ['wheelchair_access', 'elevator_required', 'hearing_assist'],
      amenities: ['wifi', 'restaurant', 'bar', 'gym'],
      address: `456 Plaza Avenue, ${destination}`,
      coordinates: { latitude: 0, longitude: 0 },
      images: [],
      cancellationPolicies: []
    },
    {
      id: 'demo_3',
      name: `${destination} Boutique Inn`,
      neighborhood: 'Arts Quarter',
      rating: 8.5,
      pricePerNight: 120,
      totalPrice: 120 * nights,
      currency: 'USD',
      category: 4,
      accessibility: ['wheelchair_access', 'step_free', 'service_animal_friendly'],
      amenities: ['wifi', 'restaurant', 'bar'],
      address: `789 Arts Street, ${destination}`,
      coordinates: { latitude: 0, longitude: 0 },
      images: [],
      cancellationPolicies: []
    }
  ];
}

export default {
  searchHotelsHotelbeds
};
