import FlightSearch from './flightModule.js';
import HotelSearch from './hotelModule.js';
import ItineraryGenerator from './itineraryGenerator.js';
import ChecklistGenerator from './checklistGenerator.js';
import { TripService, ItineraryService, UserService } from './firebaseAdmin.js';

/**
 * Comprehensive Trip Planner Service
 * Integrates flights, hotels, itinerary generation, and checklists
 */
class TripPlannerService {
  constructor(recommender) {
    this.recommender = recommender;
    this.flightSearch = new FlightSearch();
    this.hotelSearch = new HotelSearch();
    this.itineraryGenerator = new ItineraryGenerator(recommender);
    this.checklistGenerator = new ChecklistGenerator();
  }

  /**
   * Complete trip planning workflow
   * 1. Search flights
   * 2. Search hotels
   * 3. Generate itinerary with experiences
   * 4. Generate pre-trip checklist
   * 5. Save everything to database
   */
  async planCompleteTrip({ userId, destination, startDate, duration, conditions, preferences, soloTravel, origin }) {
    console.log(`\n🗺️  Planning complete trip for user ${userId}...`);
    console.log(`   Destination: ${destination}`);
    console.log(`   Duration: ${duration} days`);
    console.log(`   Conditions: ${conditions.join(', ')}`);

    const tripPlan = {
      user_id: userId,
      destination,
      start_date: startDate,
      duration,
      conditions,
      preferences,
      solo_travel: soloTravel,
      created_at: new Date().toISOString()
    };

    try {
      // Step 1: Get user profile for personalization
      console.log('\n📋 Step 1: Loading user profile...');
      const profileResult = await UserService.getProfile(userId);
      const userProfile = profileResult.success ? profileResult.data : {};

      // Extract city and country from destination
      const [city, country] = destination.split(',').map(s => s.trim());

      // Step 2: Search Flights
      console.log('\n✈️  Step 2: Searching flights...');
      let flights = [];
      let originCode = 'JFK'; // Default
      let destinationCode = 'FCO'; // Rome default

      if (origin) {
        const originResult = await this.flightSearch.searchAirports(origin);
        if (originResult.length > 0) {
          originCode = originResult[0].iataCode;
        }
      }

      const destResult = await this.flightSearch.searchAirports(city);
      if (destResult.length > 0) {
        destinationCode = destResult[0].iataCode;
      }

      // Calculate return date
      const returnDate = this.addDays(startDate, duration);

      flights = await this.flightSearch.searchFlights({
        origin: originCode,
        destination: destinationCode,
        departureDate: startDate,
        returnDate,
        accessibility: conditions.includes('wheelchair_user') ? ['wheelchair'] : []
      });

      tripPlan.flights = {
        outbound: flights.slice(0, 3), // Top 3 options
        return: flights.slice(0, 3),
        origin_code: originCode,
        destination_code: destinationCode
      };

      console.log(`   ✅ Found ${flights.length} flight options`);

      // Step 3: Search Hotels
      console.log('\n🏨 Step 3: Searching hotels...');
      const cityCode = await this.hotelSearch.getCityCode(city);
      const checkOutDate = this.addDays(startDate, duration);

      const hotels = await this.hotelSearch.searchHotels({
        cityCode,
        checkInDate: startDate,
        checkOutDate,
        adults: soloTravel ? 1 : 2,
        accessibility: conditions
      });

      tripPlan.hotels = hotels.slice(0, 5); // Top 5 options

      console.log(`   ✅ Found ${hotels.length} hotel options`);

      // Step 4: Generate Itinerary
      console.log('\n📅 Step 4: Generating itinerary...');

      // Search for experiences at destination
      const experienceResults = await this.recommender.search({
        query: `authentic local experiences in ${city} ${country}`,
        filters: { country, city },
        limit: duration * 3
      });

      const experiences = experienceResults.map(r => r.experience);

      const itinerary = this.itineraryGenerator.buildItinerary({
        experiences,
        tripDuration: duration,
        startDate,
        conditions,
        preferences: preferences || [],
        soloTravel
      });

      tripPlan.itinerary = itinerary;

      console.log(`   ✅ Generated ${itinerary.days.length}-day itinerary`);

      // Step 5: Generate Pre-Trip Checklist
      console.log('\n✅ Step 5: Generating pre-trip checklist...');

      const checklist = await this.checklistGenerator.generateChecklist({
        conditions,
        destination,
        tripDuration: duration,
        travelDate: startDate,
        soloTravel
      });

      tripPlan.checklist = checklist;

      console.log(`   ✅ Generated ${checklist.categories.length}-category checklist`);

      // Step 6: Save to Database
      console.log('\n💾 Step 6: Saving trip to database...');

      const tripResult = await TripService.createTrip(userId, {
        destination,
        start_date: startDate,
        end_date: returnDate,
        duration,
        conditions,
        preferences,
        solo_travel: soloTravel,
        flights: tripPlan.flights,
        hotels: tripPlan.hotels,
        status: 'planning'
      });

      if (tripResult.success) {
        tripPlan.trip_id = tripResult.id;

        // Save itinerary
        await ItineraryService.saveItinerary(tripResult.id, userId, itinerary);

        console.log(`   ✅ Trip saved with ID: ${tripResult.id}`);
      }

      // Step 7: Generate Summary
      console.log('\n📊 Generating trip summary...');

      const summary = this.generateTripSummary(tripPlan);

      console.log('\n🎉 Complete trip plan generated successfully!\n');

      return {
        success: true,
        trip_id: tripPlan.trip_id,
        summary,
        flights: tripPlan.flights,
        hotels: tripPlan.hotels,
        itinerary: tripPlan.itinerary,
        checklist: tripPlan.checklist
      };

    } catch (error) {
      console.error('❌ Trip planning error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate AI-assisted itinerary using chatbot
   */
  async generateConversationalItinerary({ userId, destination, preferences, conversationHistory }) {
    // Use the conversation manager to build itinerary through chat
    // This can be a future enhancement
    console.log('💬 Conversational itinerary generation coming soon...');

    return {
      success: false,
      message: 'Use /api/trip/plan for complete trip planning'
    };
  }

  /**
   * Add days to a date string
   */
  addDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate trip summary
   */
  generateTripSummary(tripPlan) {
    const { flights, hotels, itinerary, checklist } = tripPlan;

    const bestFlight = flights.outbound?.[0];
    const bestHotel = hotels?.[0];

    return {
      destination: tripPlan.destination,
      dates: {
        start: tripPlan.start_date,
        end: this.addDays(tripPlan.start_date, tripPlan.duration),
        duration: tripPlan.duration
      },
      flight_summary: bestFlight ? {
        airline: bestFlight.airline,
        price: `${bestFlight.price.total} ${bestFlight.price.currency}`,
        duration: bestFlight.duration
      } : null,
      hotel_summary: bestHotel ? {
        name: bestHotel.name,
        rating: bestHotel.rating,
        price_per_night: `${parseFloat(bestHotel.price?.total || 0) / tripPlan.duration} ${bestHotel.price?.currency || 'EUR'}`
      } : null,
      itinerary_summary: {
        total_days: itinerary.days.length,
        activity_days: itinerary.days.filter(d => d.day_type === 'activity').length,
        rest_days: itinerary.days.filter(d => d.day_type === 'rest').length,
        average_fatigue: Math.round(
          itinerary.days.reduce((sum, d) => sum + (d.cumulative_fatigue || 0), 0) / itinerary.days.length
        ),
        average_safety: (
          itinerary.days.reduce((sum, d) => sum + (d.medical_safety || 5), 0) / itinerary.days.length
        ).toFixed(1)
      },
      checklist_summary: {
        total_categories: checklist.categories.length,
        total_items: checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0),
        critical_items: checklist.critical_count
      },
      estimated_total_cost: this.calculateTotalCost(flights, hotels, tripPlan.duration)
    };
  }

  /**
   * Calculate estimated total cost
   */
  calculateTotalCost(flights, hotels, duration) {
    let total = 0;
    let currency = 'EUR';

    // Flight cost (round trip = 2x)
    if (flights.outbound?.[0]) {
      total += parseFloat(flights.outbound[0].price.total) * 2;
      currency = flights.outbound[0].price.currency;
    }

    // Hotel cost (price * nights)
    if (hotels?.[0]?.price) {
      total += parseFloat(hotels[0].price.total) * duration;
    }

    return {
      total: total.toFixed(2),
      currency,
      breakdown: {
        flights: flights.outbound?.[0] ? (parseFloat(flights.outbound[0].price.total) * 2).toFixed(2) : '0',
        hotels: hotels?.[0]?.price ? (parseFloat(hotels[0].price.total) * duration).toFixed(2) : '0'
      }
    };
  }
}

export default TripPlannerService;
