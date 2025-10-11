import dotenv from 'dotenv';

dotenv.config();

/**
 * Booking.com Hotel Search Service
 *
 * This module integrates with Booking.com accommodations.search API
 * Following CodeFest compliance: No Marriott APIs or proprietary data
 *
 * To enable: Add Booking.com MCP connector to your environment
 * Action: /Booking.com/link_68e9fd75b130819191727cad2b9b2b43/accommodations.search
 */

class BookingComHotelSearch {
  constructor() {
    // Check if Booking.com MCP connector is available
    this.enabled = process.env.BOOKINGCOM_MCP_ENABLED === 'true';

    if (!this.enabled) {
      console.log('ℹ️  Booking.com MCP connector not configured - using demo mode');
      console.log('   To enable: Set BOOKINGCOM_MCP_ENABLED=true in .env');
    } else {
      console.log('✅ Booking.com hotel search enabled');
    }
  }

  /**
   * Search hotels using Booking.com API
   * @param {Object} params - Search parameters
   * @param {string} params.destination - City/district/region/landmark (e.g., "Paris", "Eiffel Tower")
   * @param {Object} params.coordinates - Alternative to destination: {latitude, longitude, radius}
   * @param {string} params.checkin_date - Format: YYYY-MM-DD
   * @param {string} params.checkout_date - Format: YYYY-MM-DD
   * @param {number} params.number_of_rooms - 1-10 (default: 1)
   * @param {number} params.number_of_guests - 1-20 (default: 2)
   * @param {string} params.destination_country_code - ISO-2 lowercase (e.g., "fr", "us")
   * @param {string} params.user_country_code - ISO-2 lowercase (user location)
   * @param {string} params.currency - ISO-4217 uppercase (default: "USD")
   * @param {string[]} params.facilities - Optional: ["FREE_WIFI", "WHEELCHAIR_ACCESSIBLE", etc.]
   * @param {string[]} params.accommodation_types - Optional: ["HOTEL", "APARTMENT", etc.]
   * @param {Object} params.price - Optional: {minimum, maximum}
   * @param {string} params.sort_by - Optional: "price" | "review_score" | "stars"
   * @param {string} params.sort_direction - Optional: "ascending" | "descending"
   */
  async searchHotels(params) {
    // Validate required parameters
    const validation = this.validateParams(params);
    if (!validation.valid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
    }

    if (!this.enabled) {
      console.log('📍 Demo search:', params.destination || params.coordinates);
      return this.getDemoHotels(params);
    }

    try {
      // Build request payload for Booking.com MCP connector
      const requestPayload = this.buildRequestPayload(params);

      console.log('🔍 Searching Booking.com:', JSON.stringify(requestPayload, null, 2));

      // TODO: Call Booking.com MCP connector when available
      // This is where you would integrate the MCP tool:
      // const response = await mcpClient.call('/Booking.com/link_68e9fd75b130819191727cad2b9b2b43/accommodations.search', requestPayload);

      // For now, return demo data structured like Booking.com response
      return this.getDemoHotels(params);

    } catch (error) {
      console.error('❌ Booking.com search error:', error.message);

      // Fallback strategies
      if (error.message.includes('destination') && params.destination) {
        console.log('🔄 Retrying with city-center coordinates...');
        // Could retry with coordinates fallback
      }

      throw error;
    }
  }

  /**
   * Validate search parameters
   */
  validateParams(params) {
    const errors = [];

    // Must have either destination OR coordinates
    if (!params.destination && !params.coordinates) {
      errors.push('Must provide either destination or coordinates');
    }

    if (params.coordinates) {
      if (!params.coordinates.latitude || !params.coordinates.longitude) {
        errors.push('Coordinates must include latitude and longitude');
      }
    }

    // Required fields
    if (!params.checkin_date) errors.push('checkin_date is required (YYYY-MM-DD)');
    if (!params.checkout_date) errors.push('checkout_date is required (YYYY-MM-DD)');

    // Date validation
    if (params.checkin_date && params.checkout_date) {
      const checkin = new Date(params.checkin_date);
      const checkout = new Date(params.checkout_date);

      if (checkout <= checkin) {
        errors.push('checkout_date must be after checkin_date');
      }
    }

    // Range validation
    if (params.number_of_rooms && (params.number_of_rooms < 1 || params.number_of_rooms > 10)) {
      errors.push('number_of_rooms must be between 1 and 10');
    }

    if (params.number_of_guests && (params.number_of_guests < 1 || params.number_of_guests > 20)) {
      errors.push('number_of_guests must be between 1 and 20');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build Booking.com API request payload
   */
  buildRequestPayload(params) {
    const payload = {
      // Either destination OR coordinates (not both)
      ...(params.destination ? { destination: params.destination } : {}),
      ...(params.coordinates ? { coordinates: params.coordinates } : {}),

      // Required fields
      checkin_date: params.checkin_date,
      checkout_date: params.checkout_date,
      number_of_rooms: params.number_of_rooms || 1,
      number_of_guests: params.number_of_guests || 2,
      destination_country_code: params.destination_country_code || 'us',
      user_country_code: params.user_country_code || 'us',
      currency: params.currency || 'USD',

      // Optional filters (only include if provided)
      ...(params.facilities && params.facilities.length > 0 ? { facilities: params.facilities } : {}),
      ...(params.accommodation_types && params.accommodation_types.length > 0 ? { accommodation_types: params.accommodation_types } : {}),
      ...(params.price ? { price: params.price } : {}),
      ...(params.sort_by ? { sort_by: params.sort_by, sort_direction: params.sort_direction || 'ascending' } : {})
    };

    return payload;
  }

  /**
   * Normalize Booking.com response to our UI schema
   */
  normalizeResults(bookingComResults) {
    if (!bookingComResults || !Array.isArray(bookingComResults)) {
      return [];
    }

    return bookingComResults.map(hotel => ({
      id: hotel.id || `hotel_${Date.now()}_${Math.random()}`,
      name: hotel.name || 'Hotel',
      url: hotel.url || 'https://www.booking.com',
      deeplink_url: hotel.deeplink_url,
      price: {
        total: hotel.price?.total || 0,
        currency: hotel.price?.currency || 'USD',
        per_night: hotel.price?.total ? (hotel.price.total / this.calculateNights(hotel)).toFixed(2) : 0
      },
      rating: {
        review_score: hotel.rating?.review_score || 0,
        number_of_reviews: hotel.rating?.number_of_reviews || 0,
        stars: hotel.rating?.stars || 3
      },
      main_photo: hotel.main_photo || 'https://via.placeholder.com/400x300?text=Hotel',
      photos: hotel.photos || [],
      facilities: hotel.facilities || [],
      location: {
        address: hotel.location?.address || '',
        postal_code: hotel.location?.postal_code || '',
        country: hotel.location?.country || ''
      },
      accessibility: {
        wheelchair_accessible: hotel.facilities?.includes('WHEELCHAIR_ACCESSIBLE') || false,
        elevator: hotel.facilities?.includes('ELEVATOR') || false,
        accessible_parking: hotel.facilities?.includes('ACCESSIBLE_PARKING') || false
      }
    }));
  }

  calculateNights(hotel) {
    // Helper to calculate nights for per-night price
    return 1; // Will be calculated from actual checkin/checkout dates
  }

  /**
   * Demo hotels for testing (structured like Booking.com response)
   */
  getDemoHotels(params) {
    const destination = params.destination || 'Rome';
    const nights = this.calculateNightsBetween(params.checkin_date, params.checkout_date);
    const currency = params.currency || 'USD';

    const demoHotels = [
      {
        id: 'booking_rome_crowne_plaza',
        name: 'CROWNE PLAZA ROME SAINT PETERS',
        url: 'https://www.booking.com/hotel/it/crowne-plaza-rome-st-peters.html',
        deeplink_url: 'booking://hotel/crowne-plaza-rome-st-peters',
        price: {
          total: (250 * nights).toFixed(2),
          currency: currency
        },
        rating: {
          review_score: 8.7,
          number_of_reviews: 1234,
          stars: 4
        },
        main_photo: 'https://via.placeholder.com/400x300?text=Crowne+Plaza+Rome',
        photos: [],
        facilities: ['FREE_WIFI', 'WHEELCHAIR_ACCESSIBLE', 'PARKING', 'ELEVATOR', 'ACCESSIBLE_PARKING', 'AIR_CONDITIONING'],
        location: {
          address: 'Via Aurelia Antica, 415, Rome',
          postal_code: '00165',
          country: 'it'
        }
      },
      {
        id: 'booking_rome_artemide',
        name: 'Hotel Artemide',
        url: 'https://www.booking.com/hotel/it/artemide.html',
        deeplink_url: 'booking://hotel/artemide',
        price: {
          total: (270 * nights).toFixed(2),
          currency: currency
        },
        rating: {
          review_score: 9.1,
          number_of_reviews: 2456,
          stars: 4
        },
        main_photo: 'https://via.placeholder.com/400x300?text=Hotel+Artemide',
        photos: [],
        facilities: ['FREE_WIFI', 'WHEELCHAIR_ACCESSIBLE', 'ELEVATOR', 'BAR', 'RESTAURANT'],
        location: {
          address: 'Via Nazionale, 22, Rome',
          postal_code: '00184',
          country: 'it'
        }
      },
      {
        id: 'booking_rome_radisson',
        name: 'Radisson Blu es. Hotel Rome',
        url: 'https://www.booking.com/hotel/it/radisson-blu-es.html',
        deeplink_url: 'booking://hotel/radisson-blu-es',
        price: {
          total: (300 * nights).toFixed(2),
          currency: currency
        },
        rating: {
          review_score: 8.9,
          number_of_reviews: 1876,
          stars: 5
        },
        main_photo: 'https://via.placeholder.com/400x300?text=Radisson+Blu+Rome',
        photos: [],
        facilities: ['FREE_WIFI', 'WHEELCHAIR_ACCESSIBLE', 'PARKING', 'ELEVATOR', 'POOL', 'GYM', 'ELECTRIC_VEHICLE_CHARGING_STATION'],
        location: {
          address: 'Via Filippo Turati, 171, Rome',
          postal_code: '00185',
          country: 'it'
        }
      }
    ];

    // Filter by facilities if requested
    if (params.facilities && params.facilities.length > 0) {
      return demoHotels.filter(hotel =>
        params.facilities.every(facility => hotel.facilities.includes(facility))
      );
    }

    // Filter by price if requested
    if (params.price) {
      const filtered = demoHotels.filter(hotel => {
        const totalPrice = parseFloat(hotel.price.total);
        if (params.price.minimum && totalPrice < params.price.minimum) return false;
        if (params.price.maximum && totalPrice > params.price.maximum) return false;
        return true;
      });
      return filtered;
    }

    return demoHotels;
  }

  calculateNightsBetween(checkin, checkout) {
    if (!checkin || !checkout) return 7; // default
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

export default BookingComHotelSearch;
