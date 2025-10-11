import Amadeus from 'amadeus';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Hotel Search Module using Amadeus API
 * Searches for accessible hotels near destination
 */
class HotelSearch {
  constructor() {
    // Check if Amadeus credentials are available
    if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
      this.amadeus = new Amadeus({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET
      });
      this.enabled = true;
      console.log('✅ Amadeus Hotel API initialized');
    } else {
      this.enabled = false;
      console.log('⚠️  Amadeus Hotel API not configured - using demo data');
    }
  }

  /**
   * Search for hotels in a city
   * @param {Object} params - Search parameters
   * @returns {Array} Hotel results
   */
  async searchHotels({ cityCode, checkInDate, checkOutDate, adults = 2, accessibility = [] }) {
    if (!this.enabled) {
      return this.getDemoHotels(cityCode);
    }

    try {
      console.log(`🏨 Searching hotels in ${cityCode}...`);

      // Step 1: Get hotel IDs by city
      const hotelListResponse = await this.amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: cityCode
      });

      const hotelIds = hotelListResponse.data.slice(0, 20).map(hotel => hotel.hotelId);

      if (hotelIds.length === 0) {
        console.log('No hotels found for city code:', cityCode);
        return this.getDemoHotels(cityCode);
      }

      // Step 2: Get hotel offers
      const offersResponse = await this.amadeus.shopping.hotelOffersSearch.get({
        hotelIds: hotelIds.join(','),
        checkInDate,
        checkOutDate,
        adults: adults.toString(),
        roomQuantity: '1',
        bestRateOnly: 'true'
      });

      const hotels = offersResponse.data.map(offer => this.formatHotelOffer(offer, accessibility));

      console.log(`✅ Found ${hotels.length} hotel offers`);
      return hotels;

    } catch (error) {
      console.error('Hotel search error:', error.response?.data || error.message);

      // Fallback to demo data
      return this.getDemoHotels(cityCode);
    }
  }

  /**
   * Get hotel details by ID
   */
  async getHotelDetails(hotelId) {
    if (!this.enabled) {
      return this.getDemoHotelDetails(hotelId);
    }

    try {
      const response = await this.amadeus.shopping.hotelOffersByHotel.get({
        hotelId: hotelId
      });

      return this.formatHotelOffer(response.data);
    } catch (error) {
      console.error('Hotel details error:', error);
      return this.getDemoHotelDetails(hotelId);
    }
  }

  /**
   * Format hotel offer for consistent response
   */
  formatHotelOffer(offer, accessibility = []) {
    const hotel = offer.hotel;
    const firstOffer = offer.offers?.[0];

    return {
      hotelId: hotel.hotelId,
      name: hotel.name,
      rating: hotel.rating || 4,
      address: {
        street: hotel.address?.lines?.[0] || '',
        city: hotel.address?.cityName || '',
        country: hotel.address?.countryCode || ''
      },
      location: {
        latitude: hotel.latitude,
        longitude: hotel.longitude
      },
      contact: {
        phone: hotel.contact?.phone || '',
        email: hotel.contact?.email || ''
      },
      amenities: hotel.amenities || ['WIFI', 'PARKING', 'RESTAURANT'],
      accessibility: this.getAccessibilityFeatures(hotel, accessibility),
      price: firstOffer ? {
        total: firstOffer.price.total,
        currency: firstOffer.price.currency,
        base: firstOffer.price.base,
        taxes: firstOffer.price.taxes?.[0]?.amount || '0'
      } : null,
      room: firstOffer ? {
        type: firstOffer.room.typeEstimated?.category || 'STANDARD',
        beds: firstOffer.room.typeEstimated?.beds || 1,
        description: firstOffer.room.description?.text || 'Standard Room'
      } : null,
      checkIn: firstOffer?.checkInDate,
      checkOut: firstOffer?.checkOutDate,
      bookingUrl: `https://www.booking.com/hotel/${hotel.hotelId}.html`
    };
  }

  /**
   * Determine accessibility features
   */
  getAccessibilityFeatures(hotel, requestedAccessibility) {
    const features = {
      wheelchair_accessible: false,
      accessible_parking: false,
      elevator: false,
      accessible_bathroom: false,
      braille_signage: false,
      hearing_accessible: false
    };

    // Check hotel amenities for accessibility features
    const amenities = (hotel.amenities || []).map(a => a.toLowerCase());

    if (amenities.includes('wheelchair') || amenities.includes('accessible')) {
      features.wheelchair_accessible = true;
      features.accessible_bathroom = true;
      features.elevator = true;
    }

    if (amenities.includes('parking')) {
      features.accessible_parking = true;
    }

    // For now, assume hotels with ratings >= 4 have basic accessibility
    if (hotel.rating >= 4) {
      features.elevator = true;
    }

    return features;
  }

  /**
   * Demo hotel data (fallback)
   */
  getDemoHotels(cityCode) {
    console.log(`🎭 DEMO MODE: Returning sample hotels for ${cityCode}`);

    const demoHotels = {
      'ROM': [ // Rome
        {
          hotelId: 'HOTEL_ROME_1',
          name: 'Accessible Grand Hotel Rome',
          rating: 5,
          address: {
            street: 'Via del Corso 126',
            city: 'Rome',
            country: 'IT'
          },
          location: { latitude: 41.9028, longitude: 12.4964 },
          amenities: ['WIFI', 'PARKING', 'RESTAURANT', 'ACCESSIBLE_ROOMS', 'ELEVATOR'],
          accessibility: {
            wheelchair_accessible: true,
            accessible_parking: true,
            elevator: true,
            accessible_bathroom: true,
            braille_signage: false,
            hearing_accessible: false
          },
          price: {
            total: '250.00',
            currency: 'EUR',
            base: '220.00',
            taxes: '30.00'
          },
          room: {
            type: 'DELUXE',
            beds: 2,
            description: 'Deluxe Accessible Room with Roll-in Shower'
          },
          bookingUrl: 'https://www.booking.com/hotel/rom/accessible-grand.html'
        },
        {
          hotelId: 'HOTEL_ROME_2',
          name: 'Hotel Colosseum Suites',
          rating: 4,
          address: {
            street: 'Via Labicana 125',
            city: 'Rome',
            country: 'IT'
          },
          location: { latitude: 41.8902, longitude: 12.4923 },
          amenities: ['WIFI', 'BREAKFAST', 'ACCESSIBLE_ROOMS'],
          accessibility: {
            wheelchair_accessible: true,
            accessible_parking: false,
            elevator: true,
            accessible_bathroom: true,
            braille_signage: false,
            hearing_accessible: false
          },
          price: {
            total: '180.00',
            currency: 'EUR',
            base: '160.00',
            taxes: '20.00'
          },
          room: {
            type: 'STANDARD',
            beds: 1,
            description: 'Standard Accessible Room'
          },
          bookingUrl: 'https://www.booking.com/hotel/rom/colosseum-suites.html'
        }
      ],
      'PAR': [ // Paris
        {
          hotelId: 'HOTEL_PARIS_1',
          name: 'Le Marais Accessible Hotel',
          rating: 4,
          address: {
            street: '15 Rue de Rivoli',
            city: 'Paris',
            country: 'FR'
          },
          location: { latitude: 48.8566, longitude: 2.3522 },
          amenities: ['WIFI', 'PARKING', 'ACCESSIBLE_ROOMS', 'ELEVATOR'],
          accessibility: {
            wheelchair_accessible: true,
            accessible_parking: true,
            elevator: true,
            accessible_bathroom: true,
            braille_signage: true,
            hearing_accessible: false
          },
          price: {
            total: '320.00',
            currency: 'EUR',
            base: '290.00',
            taxes: '30.00'
          },
          room: {
            type: 'SUPERIOR',
            beds: 2,
            description: 'Superior Accessible Room'
          },
          bookingUrl: 'https://www.booking.com/hotel/par/le-marais.html'
        }
      ]
    };

    return demoHotels[cityCode] || demoHotels['ROM'];
  }

  getDemoHotelDetails(hotelId) {
    return {
      hotelId,
      name: 'Demo Accessible Hotel',
      rating: 4,
      address: { street: 'Demo Street 123', city: 'Demo City', country: 'IT' },
      amenities: ['WIFI', 'ACCESSIBLE_ROOMS'],
      accessibility: { wheelchair_accessible: true, elevator: true },
      price: { total: '200.00', currency: 'EUR' }
    };
  }

  /**
   * Get city code from city name
   */
  async getCityCode(cityName) {
    if (!this.enabled) {
      const codes = {
        'Rome': 'ROM',
        'Paris': 'PAR',
        'London': 'LON',
        'New York': 'NYC',
        'Tokyo': 'TYO'
      };
      return codes[cityName] || 'ROM';
    }

    try {
      const response = await this.amadeus.referenceData.locations.get({
        keyword: cityName,
        subType: 'CITY'
      });

      if (response.data.length > 0) {
        return response.data[0].iataCode;
      }

      return null;
    } catch (error) {
      console.error('City code lookup error:', error);
      return null;
    }
  }
}

export default HotelSearch;
