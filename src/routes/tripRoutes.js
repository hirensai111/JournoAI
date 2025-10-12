/**
 * Express API Routes for Trip Planning
 * Exposes composer and individual search endpoints
 */

import express from 'express';
import { composePlan } from '../../lib/trips/compose.js';
import { searchFlights } from '../../lib/trips/adapters/amadeus.js';
import { searchHotels } from '../../lib/trips/adapters/booking.js';
import { searchHotelsHotelbeds } from '../../lib/trips/adapters/hotelbeds.js';
import { searchExperiences } from '../../lib/trips/adapters/experiences.js';
import { generateEnhancedItinerary } from '../../lib/trips/adapters/tripadvisor.js';
import ItineraryGenerator from '../itineraryGenerator.js';
import { TripService } from '../firebaseAdmin.js';

const router = express.Router();

/**
 * POST /api/trips/compose
 * Main endpoint: compose complete personalized itinerary
 * 
 * Body: TripPrefs object
 * Returns: Plan object
 */
router.post('/compose', async (req, res) => {
  try {
    const prefs = req.body;
    
    // Validate required fields
    if (!prefs.destination || !prefs.origin || !prefs.startDate || !prefs.endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['destination', 'origin', 'startDate', 'endDate', 'travelers']
      });
    }
    
    // Ensure travelers profiles exist (even if empty)
    if (!prefs.travelersProfiles || !Array.isArray(prefs.travelersProfiles)) {
      prefs.travelersProfiles = [];
    }
    
    // Set defaults
    prefs.travelers = prefs.travelers || 1;
    prefs.vibe = prefs.vibe || ['mixed'];
    prefs.budget = prefs.budget || 'mid';
    prefs.specialOccasion = prefs.specialOccasion || 'none';
    
    console.log('Composing plan for:', prefs.destination, 'from', prefs.origin);
    
    const plan = await composePlan(prefs);
    
    res.json(plan);
  } catch (error) {
    console.error('Error composing plan:', error);
    res.status(500).json({
      error: 'Failed to compose plan',
      message: error.message,
      partial: true
    });
  }
});

/**
 * POST /api/trips/flights
 * Search flights only
 */
router.post('/flights', async (req, res) => {
  try {
    const prefs = req.body;
    
    if (!prefs.origin || !prefs.destination || !prefs.startDate || !prefs.endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['origin', 'destination', 'startDate', 'endDate']
      });
    }
    
    const flights = await searchFlights(prefs);
    res.json({ flights, count: flights.length });
  } catch (error) {
    console.error('Error searching flights:', error);
    res.status(500).json({
      error: 'Failed to search flights',
      message: error.message
    });
  }
});

/**
 * POST /api/trips/hotels
 * Search hotels only - uses Hotelbeds API with real prices and accessibility
 */
router.post('/hotels', async (req, res) => {
  try {
    const prefs = req.body;

    if (!prefs.destination || !prefs.startDate || !prefs.endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['destination', 'startDate', 'endDate']
      });
    }

    // Use Hotelbeds API for real hotel data with prices and accessibility
    const hotels = await searchHotelsHotelbeds(prefs);
    res.json({ hotels, count: hotels.length });
  } catch (error) {
    console.error('Error searching hotels:', error);
    res.status(500).json({
      error: 'Failed to search hotels',
      message: error.message
    });
  }
});

/**
 * POST /api/trips/experiences
 * Search experiences/activities only
 */
router.post('/experiences', async (req, res) => {
  try {
    const prefs = req.body;

    if (!prefs.destination) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['destination']
      });
    }

    const experiences = await searchExperiences(prefs);
    res.json({ experiences, count: experiences.length });
  } catch (error) {
    console.error('Error searching experiences:', error);
    res.status(500).json({
      error: 'Failed to search experiences',
      message: error.message
    });
  }
});

/**
 * POST /api/trips/itinerary/enhanced
 * Generate enhanced itinerary using TripAdvisor + OpenAI
 *
 * Body: {
 *   destination: string,
 *   startDate: string,
 *   endDate: string,
 *   preferences: object (optional - vibe, accessibility, etc),
 *   flightInfo: object (optional - arrivalTime, departureTime, tripType)
 * }
 */
router.post('/itinerary/enhanced', async (req, res) => {
  try {
    const { destination, startDate, endDate, preferences, flightInfo, userId } = req.body;

    if (!destination || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['destination', 'startDate', 'endDate']
      });
    }

    console.log('Generating enhanced itinerary for:', destination);
    console.log('Dates:', startDate, 'to', endDate);
    if (flightInfo) {
      console.log('Flight info:', flightInfo);
    }

    // Calculate trip duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Create itinerary generator instance
    const generator = new ItineraryGenerator();

    // Generate detailed itinerary with all the extra fields
    const itineraryData = await generator.generateItinerary({
      destination: destination,
      city: destination,
      tripDuration: tripDuration,
      startDate: startDate,
      conditions: preferences?.accessibility || [],
      preferences: preferences?.vibe || [],
      accessibility_needs: preferences?.accessibility || [],
      dietary: [],
      soloTravel: false,
      userId: userId || null,
      wellnessData: null,
      flightInfo: flightInfo || null
    });

    // Transform the response to match frontend expectations
    // The generator returns { itinerary: [...days] }
    const days = itineraryData.itinerary || [];

    res.json({
      success: true,
      itinerary: days,
      count: days.length
    });
  } catch (error) {
    console.error('Error generating enhanced itinerary:', error);
    res.status(500).json({
      error: 'Failed to generate enhanced itinerary',
      message: error.message
    });
  }
});

/**
 * POST /api/trips/save
 * Save complete trip with selected flight, hotel, and itinerary
 *
 * Body: {
 *   user_id: string,
 *   origin: string,
 *   destination: string,
 *   start_date: string,
 *   end_date: string,
 *   duration: number,
 *   selected_flight: object,
 *   selected_hotel: object,
 *   itinerary: array,
 *   status: string
 * }
 */
router.post('/save', async (req, res) => {
  try {
    const tripData = req.body;

    // Validate required fields
    if (!tripData.user_id || !tripData.destination || !tripData.start_date || !tripData.end_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'destination', 'start_date', 'end_date']
      });
    }

    // Validate selected_flight and selected_hotel exist
    if (!tripData.selected_flight || !tripData.selected_hotel) {
      return res.status(400).json({
        error: 'Missing selected flight or hotel',
        required: ['selected_flight', 'selected_hotel']
      });
    }

    // Validate itinerary exists and is an array
    if (!tripData.itinerary || !Array.isArray(tripData.itinerary)) {
      return res.status(400).json({
        error: 'Missing or invalid itinerary',
        message: 'Itinerary must be an array of day objects'
      });
    }

    console.log('Saving trip:', {
      user: tripData.user_id,
      destination: tripData.destination,
      dates: `${tripData.start_date} to ${tripData.end_date}`,
      duration: tripData.duration,
      itinerary_days: tripData.itinerary.length
    });

    // Save to Firebase using TripService
    const result = await TripService.createTrip(tripData.user_id, tripData);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to save trip',
        message: result.error
      });
    }

    console.log(`✅ Trip saved successfully with ID: ${result.id}`);

    res.json({
      success: true,
      id: result.id,
      message: 'Trip saved successfully'
    });

  } catch (error) {
    console.error('Error saving trip:', error);
    res.status(500).json({
      error: 'Failed to save trip',
      message: error.message
    });
  }
});

/**
 * GET /api/trips/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    apis: {
      amadeus: !!process.env.AMADEUS_CLIENT_ID,
      booking: !!process.env.BOOKING_API_KEY,
      experiences: !!process.env.EXPERIENCES_API_KEY
    }
  });
});

export default router;

