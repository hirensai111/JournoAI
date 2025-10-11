/**
 * Express API Routes for Trip Planning
 * Exposes composer and individual search endpoints
 */

import express from 'express';
import { composePlan } from '../../lib/trips/compose.js';
import { searchFlights } from '../../lib/trips/adapters/amadeus.js';
import { searchHotels } from '../../lib/trips/adapters/booking.js';
import { searchExperiences } from '../../lib/trips/adapters/experiences.js';

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
 * Search hotels only
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
    
    const hotels = await searchHotels(prefs);
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

