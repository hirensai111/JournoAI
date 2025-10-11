import Amadeus from 'amadeus';
import dotenv from 'dotenv';

dotenv.config();

class FlightSearch {
  constructor() {
    // Check if Amadeus API keys are available
    if (process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET) {
      this.amadeus = new Amadeus({
        clientId: process.env.AMADEUS_API_KEY,
        clientSecret: process.env.AMADEUS_API_SECRET
      });
      this.demoMode = false;
      console.log('✅ Amadeus API keys found - using live API');
    } else {
      this.amadeus = null;
      this.demoMode = true;
      console.log('🎭 DEMO MODE: No Amadeus API keys - using mock data');
    }
  }

  async searchFlights({ origin, destination, departureDate, returnDate, accessibility = [] }) {
    try {
      console.log(`🔍 Searching flights: ${origin} → ${destination} on ${departureDate}`);
      
      // Use demo mode if no API keys
      if (this.demoMode) {
        console.log('🎭 Using mock flight data (no API keys)');
        return this.getMockFlights(origin, destination, departureDate);
      }
      
      const searchParams = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: departureDate,
        adults: 1,
        max: 10
      };

      if (returnDate) {
        searchParams.returnDate = returnDate;
      }

      // Add accessibility filters if specified
      if (accessibility.includes('wheelchair_accessible')) {
        searchParams.includedAirlineCodes = 'UA,AA,DL'; // Airlines with good accessibility
      }

      const response = await this.amadeus.shopping.flightOffersSearch.get(searchParams);
      
      if (!response.data) {
        return [];
      }

      const flights = response.data.map(offer => ({
        id: offer.id,
        price: offer.price,
        itineraries: offer.itineraries.map(itinerary => ({
          duration: itinerary.duration,
          segments: itinerary.segments.map(segment => ({
            departure: {
              airport: segment.departure.iataCode,
              time: segment.departure.at
            },
            arrival: {
              airport: segment.arrival.iataCode,
              time: segment.arrival.at
            },
            carrier: segment.carrierCode,
            aircraft: segment.aircraft.code,
            duration: segment.duration
          }))
        })),
        accessibility: this.checkAccessibility(offer, accessibility)
      }));

      console.log(`✅ Found ${flights.length} flights`);
      return flights;

    } catch (error) {
      console.error('Flight search error:', error);
      
      // Return mock data for demo if API fails
      if (error.status === 401 || error.status === 403) {
        console.log('🎭 Using mock flight data (API key issue)');
        return this.getMockFlights(origin, destination, departureDate);
      }
      
      throw error;
    }
  }

  async searchAirports(query) {
    try {
      console.log(`🔍 Searching airports for: ${query}`);
      
      // Use demo mode if no API keys
      if (this.demoMode) {
        console.log('🎭 Using mock airport data (no API keys)');
        return this.getMockAirports(query);
      }
      
      const response = await this.amadeus.referenceData.locations.get({
        keyword: query,
        subType: 'AIRPORT',
        'page[limit]': 10
      });

      if (!response.data) {
        return [];
      }

      const airports = response.data.map(airport => ({
        iataCode: airport.iataCode,
        name: airport.name,
        city: airport.address.cityName,
        country: airport.address.countryName,
        coordinates: {
          latitude: airport.geoCode.latitude,
          longitude: airport.geoCode.longitude
        }
      }));

      console.log(`✅ Found ${airports.length} airports`);
      return airports;

    } catch (error) {
      console.error('Airport search error:', error);
      
      // Return mock data for demo if API fails
      if (error.status === 401 || error.status === 403) {
        console.log('🎭 Using mock airport data (API key issue)');
        return this.getMockAirports(query);
      }
      
      throw error;
    }
  }

  checkAccessibility(offer, accessibility) {
    const features = [];
    
    if (accessibility.includes('wheelchair_accessible')) {
      // Check if airline supports wheelchair assistance
      const carriers = offer.itineraries.flatMap(it => 
        it.segments.map(seg => seg.carrierCode)
      );
      
      const accessibleAirlines = ['UA', 'AA', 'DL', 'WN', 'B6'];
      const hasAccessibleCarrier = carriers.some(code => 
        accessibleAirlines.includes(code)
      );
      
      if (hasAccessibleCarrier) {
        features.push('wheelchair_accessible');
      }
    }
    
    return features;
  }

  getMockFlights(origin, destination, departureDate) {
    return [
      {
        id: 'mock-flight-1',
        price: {
          currency: 'USD',
          total: '299.00',
          base: '250.00',
          fees: [
            { amount: '25.00', type: 'SUPPLIER' },
            { amount: '24.00', type: 'TICKETING' }
          ]
        },
        itineraries: [
          {
            duration: 'PT3H30M',
            segments: [
              {
                departure: {
                  airport: origin,
                  time: `${departureDate}T08:00:00`
                },
                arrival: {
                  airport: destination,
                  time: `${departureDate}T11:30:00`
                },
                carrier: 'AA',
                aircraft: 'B737',
                duration: 'PT3H30M'
              }
            ]
          }
        ],
        accessibility: ['wheelchair_accessible']
      },
      {
        id: 'mock-flight-2',
        price: {
          currency: 'USD',
          total: '349.00',
          base: '300.00',
          fees: [
            { amount: '30.00', type: 'SUPPLIER' },
            { amount: '19.00', type: 'TICKETING' }
          ]
        },
        itineraries: [
          {
            duration: 'PT4H15M',
            segments: [
              {
                departure: {
                  airport: origin,
                  time: `${departureDate}T14:30:00`
                },
                arrival: {
                  airport: destination,
                  time: `${departureDate}T18:45:00`
                },
                carrier: 'UA',
                aircraft: 'A320',
                duration: 'PT4H15M'
              }
            ]
          }
        ],
        accessibility: ['wheelchair_accessible']
      }
    ];
  }

  getMockAirports(query) {
    const mockAirports = [
      { iataCode: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
      { iataCode: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
      { iataCode: 'MSY', name: 'Louis Armstrong New Orleans International Airport', city: 'New Orleans', country: 'United States' },
      { iataCode: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { iataCode: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { iataCode: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
      { iataCode: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy' },
      { iataCode: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain' },
      { iataCode: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
      { iataCode: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' }
    ];

    return mockAirports.filter(airport => 
      airport.iataCode.toLowerCase().includes(query.toLowerCase()) ||
      airport.name.toLowerCase().includes(query.toLowerCase()) ||
      airport.city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }
}

export default FlightSearch;