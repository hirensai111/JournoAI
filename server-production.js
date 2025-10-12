import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import ExperienceRecommender from './src/recommender.js';
import ConversationManager from './src/conversationManager.js';
import ChecklistGenerator from './src/checklistGenerator.js';
import FlightSearch from './src/flightModule.js';
import WellnessManager from './src/wellnessManager.js';
import DailyChecklistManager from './src/dailyChecklistManager.js';
import ItineraryGenerator from './src/itineraryGenerator.js';
import HotelSearch from './src/hotelModule.js';
import BookingComHotelSearch from './src/bookingComHotelSearch.js';
import TripPlannerService from './src/tripPlannerService.js';
import TripAssistantChatbot from './src/tripAssistantChatbot.js';
import { UserService, TripService } from './src/firebaseAdmin.js';
import tripRoutes, { setRecommenderFactory } from './src/routes/tripRoutes.js';
import wellnessRoutes from './src/routes/wellnessRoutes.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
// Railway provides PORT via environment variable - MUST use it
const PORT = process.env.PORT || 3001;

// Log the port being used for debugging
console.log(`📌 Starting server with PORT=${PORT} (from ${process.env.PORT ? 'Railway env' : 'default'})`);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory (use absolute path for production)
app.use(express.static(path.join(__dirname, 'public')));

// Serve data files (experiences JSON)
app.use('/data', express.static(path.join(__dirname, 'data')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rate limiting (increased for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Register trip routes (includes /api/trips/compose endpoint)
app.use('/api/trips', tripRoutes);

// Register wellness routes
app.use('/api/wellness', wellnessRoutes);

// Serve main page (use absolute path for production)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize recommender and conversation manager
let recommender;
let conversationManager;
let flightSearch;
let checklistGenerator;
let itineraryGenerator;
let wellnessManager;
let dailyChecklistManager;
let hotelSearch;
let bookingComHotelSearch;
let tripPlannerService;
let tripAssistantChatbot;

// In-memory session storage for chatbot
const sessions = new Map();

// Routes
app.post('/api/recommend', async (req, res) => {
  try {
    const { query, filters = {}, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    const results = await recommender.search({ query, filters, limit });
    const queryTime = Date.now() - startTime;

    res.json({
      recommendations: results,
      query_time_ms: queryTime,
      total_results: results.length
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.get('/api/experiences', async (req, res) => {
  try {
    const { country, city, type } = req.query;
    
    let filteredExperiences = recommender.experiences;
    
    if (country) {
      filteredExperiences = filteredExperiences.filter(exp => exp.country === country);
    }
    
    if (city) {
      filteredExperiences = filteredExperiences.filter(exp => exp.city === city);
    }
    
    if (type) {
      filteredExperiences = filteredExperiences.filter(exp => exp.type === type);
    }
    
    res.json(filteredExperiences);
  } catch (error) {
    console.error('Experiences error:', error);
    res.status(500).json({ error: 'Failed to get experiences' });
  }
});

app.get('/api/experiences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const experience = recommender.experiences.find(exp => exp.id === id);
    
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    res.json(experience);
  } catch (error) {
    console.error('Experience error:', error);
    res.status(500).json({ error: 'Failed to get experience' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(recommender.getStats());
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, session_id = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let sessionState = sessions.get(session_id) || {
      messages: [],
      preferences: {},
      recommendations: []
    };

    const { reply, updatedState } = await conversationManager.sendMessage(
      message,
      sessionState
    );

    sessions.set(session_id, updatedState);

    res.json({
      reply,
      session_id,
      preferences: updatedState.preferences,
      has_recommendations: updatedState.recommendations.length > 0
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    initialized: isInitialized,
    initialization_error: initializationError ? initializationError.message : null
  });
});

// Flight search endpoint
app.post('/api/flights/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, accessibility } = req.body;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: origin, destination, departureDate' 
      });
    }

    const flights = await flightSearch.searchFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      accessibility: accessibility || []
    });

    res.json({
      flights,
      search: { origin, destination, departureDate, returnDate },
      total: flights.length
    });

  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ 
      error: 'Failed to search flights',
      message: error.message 
    });
  }
});

// Airport autocomplete endpoint
app.get('/api/airports/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters'
      });
    }

    const airports = await flightSearch.searchAirports(q);
    res.json({ airports });

  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({
      error: 'Failed to search airports'
    });
  }
});

// Checklist generation endpoint
app.post('/api/checklist/generate', async (req, res) => {
  try {
    const {
      conditions = [],
      destination = '',
      tripDuration = 7,
      travelDate = null,
      soloTravel = false
    } = req.body;

    if (!conditions || conditions.length === 0) {
      return res.status(400).json({
        error: 'At least one health condition is required'
      });
    }

    console.log(`📋 Generating checklist for ${conditions.join(', ')} → ${destination}`);

    const checklist = await checklistGenerator.generateChecklist({
      conditions,
      destination,
      tripDuration,
      travelDate,
      soloTravel
    });

    res.json({
      checklist,
      generated_for: {
        conditions,
        destination,
        trip_duration: tripDuration,
        travel_date: travelDate
      },
      summary: {
        total_categories: checklist.categories.length,
        total_items: checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0),
        critical_items: checklist.critical_count,
        high_priority_items: checklist.high_priority_count
      }
    });

  } catch (error) {
    console.error('Checklist generation error:', error);
    res.status(500).json({
      error: 'Failed to generate checklist',
      message: error.message
    });
  }
});

// Wellness check-in endpoint
app.post('/api/wellness/checkin', async (req, res) => {
  try {
    const {
      session_id = 'default',
      trip_day,
      date = new Date().toISOString().split('T')[0],
      sleep_score,
      energy_score,
      pain_level,
      additional_notes = '',
      conditions = [],
      current_itinerary = null
    } = req.body;

    // Validate required fields
    if (sleep_score === undefined || energy_score === undefined || pain_level === undefined) {
      return res.status(400).json({
        error: 'sleep_score, energy_score, and pain_level are required'
      });
    }

    // Validate ranges
    if (sleep_score < 1 || sleep_score > 5 || energy_score < 1 || energy_score > 5) {
      return res.status(400).json({
        error: 'sleep_score and energy_score must be between 1 and 5'
      });
    }

    if (pain_level < 0 || pain_level > 2) {
      return res.status(400).json({
        error: 'pain_level must be 0 (none), 1 (minor), or 2 (concerning)'
      });
    }

    console.log(`☀️ Processing wellness check-in for Day ${trip_day} (Session: ${session_id})`);

    const result = await wellnessManager.processCheckIn({
      session_id,
      trip_day,
      date,
      sleep_score,
      energy_score,
      pain_level,
      additional_notes,
      conditions,
      current_itinerary
    });

    res.json(result);

  } catch (error) {
    console.error('Wellness check-in error:', error);
    res.status(500).json({
      error: 'Failed to process wellness check-in',
      message: error.message
    });
  }
});

// Get wellness trend
app.get('/api/wellness/trend/:session_id', (req, res) => {
  try {
    const { session_id } = req.params;
    const { days = 3 } = req.query;

    const trend = wellnessManager.getWellnessTrend(session_id, parseInt(days));

    if (!trend) {
      return res.status(404).json({
        error: 'No wellness data found for this session'
      });
    }

    res.json({ session_id, trend });

  } catch (error) {
    console.error('Wellness trend error:', error);
    res.status(500).json({
      error: 'Failed to get wellness trend'
    });
  }
});

// Generate daily checklist
app.post('/api/checklist/daily', async (req, res) => {
  try {
    const {
      session_id = 'default',
      itinerary_day,
      conditions = [],
      date = null,
      wellness_data = null
    } = req.body;

    if (!itinerary_day) {
      return res.status(400).json({
        error: 'itinerary_day is required'
      });
    }

    console.log(`📅 Generating daily checklist for Day ${itinerary_day.day_number}`);

    const checklist = dailyChecklistManager.generateDailyChecklist({
      session_id,
      itinerary_day,
      conditions,
      date,
      wellness_data
    });

    res.json(checklist);

  } catch (error) {
    console.error('Daily checklist generation error:', error);
    res.status(500).json({
      error: 'Failed to generate daily checklist',
      message: error.message
    });
  }
});

// Update checklist item status
app.patch('/api/checklist/daily/:session_id/:day_number/item/:item_id', (req, res) => {
  try {
    const { session_id, day_number, item_id } = req.params;
    const { completed, data = {} } = req.body;

    if (completed === undefined) {
      return res.status(400).json({
        error: 'completed field is required'
      });
    }

    const updatedChecklist = dailyChecklistManager.updateItemStatus({
      session_id,
      day_number: parseInt(day_number),
      item_id,
      completed,
      data
    });

    res.json(updatedChecklist);

  } catch (error) {
    console.error('Checklist update error:', error);
    res.status(500).json({
      error: 'Failed to update checklist item',
      message: error.message
    });
  }
});

// Get daily checklist
app.get('/api/checklist/daily/:session_id/:day_number', (req, res) => {
  try {
    const { session_id, day_number } = req.params;

    const checklist = dailyChecklistManager.getChecklistForDay(
      session_id,
      parseInt(day_number)
    );

    if (!checklist) {
      return res.status(404).json({
        error: 'Checklist not found for this day'
      });
    }

    res.json(checklist);

  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({
      error: 'Failed to get checklist'
    });
  }
});

// Generate itinerary endpoint
app.post('/api/itinerary/generate', async (req, res) => {
  try {
    const {
      destination,
      trip_duration = 7,
      start_date,
      conditions = [],
      preferences = [],
      solo_travel = false,
      filters = {}
    } = req.body;

    if (!destination) {
      return res.status(400).json({
        error: 'destination is required'
      });
    }

    console.log(`🗺️ Generating ${trip_duration}-day itinerary for ${destination}`);

    // Search for experiences
    const searchResults = await recommender.search({
      query: `authentic local experiences in ${destination}`,
      filters: { ...filters, country: destination.split(',')[1]?.trim() || destination },
      limit: trip_duration * 3
    });

    const experiences = searchResults.map(r => r.experience);

    const itinerary = itineraryGenerator.buildItinerary({
      experiences,
      tripDuration: trip_duration,
      startDate: start_date,
      conditions,
      preferences,
      soloTravel: solo_travel
    });

    res.json({
      itinerary,
      experiences_available: experiences.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Itinerary generation error:', error);
    res.status(500).json({
      error: 'Failed to generate itinerary',
      message: error.message
    });
  }
});

// User Profile Endpoints
app.post('/api/user/profile', async (req, res) => {
  try {
    const { user_id, profile_data } = req.body;

    if (!user_id || !profile_data) {
      return res.status(400).json({ error: 'user_id and profile_data are required' });
    }

    const result = await UserService.createOrUpdateProfile(user_id, profile_data);

    if (result.success) {
      res.json({ success: true, message: 'Profile saved successfully', profile_id: result.id });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.get('/api/user/profile/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await UserService.getProfile(user_id);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Hotel Search Endpoint
app.post('/api/hotels/search', async (req, res) => {
  try {
    const { cityCode, checkInDate, checkOutDate, adults = 2, accessibility = [] } = req.body;

    if (!cityCode || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        error: 'cityCode, checkInDate, and checkOutDate are required'
      });
    }

    console.log(`🏨 Searching hotels in ${cityCode}...`);

    const hotels = await hotelSearch.searchHotels({
      cityCode,
      checkInDate,
      checkOutDate,
      adults,
      accessibility
    });

    res.json({
      hotels,
      search: { cityCode, checkInDate, checkOutDate, adults },
      total: hotels.length
    });

  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({
      error: 'Failed to search hotels',
      message: error.message
    });
  }
});

// Booking.com Hotel Search Endpoint (CodeFest Compliant - No Marriott APIs)
app.post('/api/bookingcom/hotels/search', async (req, res) => {
  try {
    const {
      destination,
      coordinates,
      checkin_date,
      checkout_date,
      number_of_rooms = 1,
      number_of_guests = 2,
      destination_country_code = 'us',
      user_country_code = 'us',
      currency = 'USD',
      facilities = [],
      accommodation_types = [],
      price = null,
      sort_by = null,
      sort_direction = null
    } = req.body;

    // Validate: Must have either destination OR coordinates
    if (!destination && !coordinates) {
      return res.status(400).json({
        error: 'Either destination or coordinates is required'
      });
    }

    if (!checkin_date || !checkout_date) {
      return res.status(400).json({
        error: 'checkin_date and checkout_date are required (YYYY-MM-DD format)'
      });
    }

    console.log(`🏨 Booking.com search: ${destination || 'coordinates'} (${checkin_date} to ${checkout_date})`);

    const hotels = await bookingComHotelSearch.searchHotels({
      destination,
      coordinates,
      checkin_date,
      checkout_date,
      number_of_rooms,
      number_of_guests,
      destination_country_code,
      user_country_code,
      currency,
      facilities,
      accommodation_types,
      price,
      sort_by,
      sort_direction
    });

    // Normalize results to UI format
    const normalizedHotels = bookingComHotelSearch.normalizeResults(hotels);

    res.json({
      hotels: normalizedHotels,
      search: {
        destination: destination || 'coordinates',
        checkin_date,
        checkout_date,
        number_of_rooms,
        number_of_guests,
        currency
      },
      total: normalizedHotels.length
    });

  } catch (error) {
    console.error('Booking.com hotel search error:', error);

    // User-friendly error messages
    let userMessage = 'Failed to search hotels';
    if (error.message.includes('destination')) {
      userMessage = 'Could not recognize the destination. Please try a major city name.';
    } else if (error.message.includes('date')) {
      userMessage = 'Invalid dates. Checkout must be after check-in.';
    } else if (error.message.includes('facilities')) {
      userMessage = 'No matches found. Try removing some filters.';
    }

    res.status(500).json({
      error: userMessage,
      message: error.message
    });
  }
});

// Complete Trip Planning Endpoint (Flights + Hotels + Itinerary + Checklist)
app.post('/api/trip/plan', async (req, res) => {
  try {
    const {
      user_id,
      destination,
      start_date,
      duration = 7,
      conditions = [],
      preferences = [],
      solo_travel = false,
      origin = 'New York' // Default origin
    } = req.body;

    if (!user_id || !destination || !start_date) {
      return res.status(400).json({
        error: 'user_id, destination, and start_date are required'
      });
    }

    console.log(`\n🌟 Planning complete trip for user ${user_id}...`);

    const tripPlan = await tripPlannerService.planCompleteTrip({
      userId: user_id,
      destination,
      startDate: start_date,
      duration,
      conditions,
      preferences,
      soloTravel: solo_travel,
      origin
    });

    if (tripPlan.success) {
      res.json(tripPlan);
    } else {
      res.status(500).json({ error: tripPlan.error });
    }

  } catch (error) {
    console.error('Complete trip planning error:', error);
    res.status(500).json({
      error: 'Failed to plan trip',
      message: error.message
    });
  }
});

// Get User's Trips
app.get('/api/user/:user_id/trips', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await TripService.getUserTrips(user_id);

    if (result.success) {
      res.json({ trips: result.trips });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Get Single Trip
app.get('/api/user/:user_id/trips/:trip_id', async (req, res) => {
  try {
    const { trip_id } = req.params;
    const result = await TripService.getTrip(trip_id);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error || 'Trip not found' });
    }
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Trip Assistant Chatbot Endpoint
app.post('/api/trip-assistant/chat', async (req, res) => {
  try {
    const {
      session_id,
      message,
      trip_context = {}
    } = req.body;

    if (!session_id || !message) {
      return res.status(400).json({
        error: 'session_id and message are required'
      });
    }

    console.log(`💬 Trip Assistant Chat (Session: ${session_id}): "${message.substring(0, 50)}..."`);

    const response = await tripAssistantChatbot.chat(session_id, message, trip_context);

    res.json({
      session_id,
      response: response.text,
      suggestions: response.suggestions || [],
      intent: response.intent,
      actions: response.actions || []
    });

  } catch (error) {
    console.error('Trip assistant chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// Update Trip with Selected Alternative
app.post('/api/trip-assistant/update', async (req, res) => {
  try {
    const {
      trip_id,
      update_type, // 'flight', 'hotel', 'experience'
      new_item,
      session_id
    } = req.body;

    if (!trip_id || !update_type || !new_item) {
      return res.status(400).json({
        error: 'trip_id, update_type, and new_item are required'
      });
    }

    console.log(`🔄 Updating trip ${trip_id}: ${update_type}`);

    // Get the trip
    const tripResult = await TripService.getTrip(trip_id);
    if (!tripResult.success) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.data;

    // Update based on type
    switch (update_type) {
      case 'flight':
        if (trip.flights) {
          trip.flights.outbound = [new_item];
        }
        break;
      case 'hotel':
        if (trip.hotels) {
          trip.hotels = [new_item, ...trip.hotels.slice(1)];
        }
        break;
      case 'experience':
        // Add experience to itinerary
        if (trip.itinerary && trip.itinerary.days) {
          // Find a suitable day to add the experience
          const targetDay = trip.itinerary.days.find(day =>
            day.activities.some(a => a.type === 'experience')
          ) || trip.itinerary.days[1]; // Default to day 2

          if (targetDay) {
            targetDay.activities.push({
              time: '14:00',
              title: new_item.name,
              description: new_item.description,
              type: 'experience',
              duration_hours: new_item.duration_hours || '2-3',
              accessibility: new_item.inclusion_tags || []
            });
          }
        }
        break;
    }

    // Save updated trip
    const updateResult = await TripService.updateTrip(trip_id, trip);

    if (updateResult.success) {
      res.json({
        success: true,
        message: `${update_type} updated successfully`,
        trip_id,
        updated_trip: trip
      });
    } else {
      res.status(500).json({ error: updateResult.error });
    }

  } catch (error) {
    console.error('Trip update error:', error);
    res.status(500).json({
      error: 'Failed to update trip',
      message: error.message
    });
  }
});

// Health Reminder Completion Endpoints
app.post('/api/health-reminders/complete', async (req, res) => {
  try {
    const { trip_id, reminder_id, completed, day_index } = req.body;

    if (!trip_id || !reminder_id) {
      return res.status(400).json({ error: 'trip_id and reminder_id are required' });
    }

    // Get the trip
    const tripResult = await TripService.getTrip(trip_id);
    if (!tripResult.success) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.data;

    // Initialize health_reminders if not exists
    if (!trip.health_reminders) {
      trip.health_reminders = {};
    }

    // Store completion state
    trip.health_reminders[reminder_id] = {
      completed,
      day_index,
      completed_at: completed ? new Date().toISOString() : null
    };

    // Update trip in database
    const updateResult = await TripService.updateTrip(trip_id, trip);

    if (updateResult.success) {
      res.json({
        success: true,
        reminder_id,
        completed
      });
    } else {
      res.status(500).json({ error: updateResult.error });
    }
  } catch (error) {
    console.error('Health reminder completion error:', error);
    res.status(500).json({ error: 'Failed to update reminder', message: error.message });
  }
});

app.get('/api/health-reminders/:trip_id', async (req, res) => {
  try {
    const { trip_id } = req.params;

    // Get the trip
    const tripResult = await TripService.getTrip(trip_id);
    if (!tripResult.success) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult.data;

    res.json({
      success: true,
      health_reminders: trip.health_reminders || {}
    });
  } catch (error) {
    console.error('Get health reminders error:', error);
    res.status(500).json({ error: 'Failed to get reminders', message: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    details: err.message
  });
});

// Track initialization status
let isInitialized = false;
let initializationError = null;

// Start server IMMEDIATELY (Railway needs this for health checks)
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🌐 Server listening on http://${HOST}:${PORT}`);
  console.log(`⏳ Initializing services in background...`);
});

// Initialize services asynchronously AFTER server starts
async function initializeServices() {
  try {
    console.log('🚀 Initializing Experience Recommender...');
    recommender = new ExperienceRecommender();

    // Enable demo mode to avoid API quota issues
    console.log('🎭 ENABLING DEMO MODE (No OpenAI API calls)');

    // Override createEmbeddings to use mock data
    recommender.createEmbeddings = async function() {
      console.log('🎭 DEMO MODE: Creating mock embeddings');
      this.embeddings = this.experiences.map(experience => ({
        experience,
        embedding: Array(1536).fill(0).map(() => Math.random() - 0.5) // Mock embedding
      }));
    };

    // Override search to use text-based matching
    const originalSearch = recommender.search;
    recommender.search = async function({ query, filters = {}, limit = 10 }) {
      console.log(`🔍 DEMO SEARCH: "${query}" with filters:`, filters);

      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(' ');

      // First apply filters, then text search
      let filteredExperiences = this.experiences;

      // Apply city/country filters first (most important) - case insensitive
      if (filters.city) {
        console.log(`   📍 Filtering by city: ${filters.city}`);
        const cityLower = filters.city.toLowerCase();
        filteredExperiences = filteredExperiences.filter(exp =>
          exp.city && exp.city.toLowerCase() === cityLower
        );
      }

      if (filters.country) {
        console.log(`   🌍 Filtering by country: ${filters.country}`);
        const countryLower = filters.country.toLowerCase();
        filteredExperiences = filteredExperiences.filter(exp =>
          exp.country && exp.country.toLowerCase() === countryLower
        );
      }

      console.log(`   After location filters: ${filteredExperiences.length} experiences`);

      // Then apply text matching
      const results = filteredExperiences
        .filter(experience => {
          // If no query text, match all (just use filters)
          if (!query || queryWords.length === 0) return true;

          const text = [
            experience.name,
            experience.description,
            experience.cultural_significance,
            ...experience.preference_tags,
            ...experience.inclusion_tags
          ].join(' ').toLowerCase();

          const hasTextMatch = queryWords.some(word => text.includes(word));
          return hasTextMatch;
        })
        .filter(experience => this.matchesFilters(experience, filters))
        .slice(0, limit)
        .map(experience => ({
          experience,
          score: Math.random() * 0.5 + 0.5 // Random score between 0.5-1.0
        }))
        .sort((a, b) => b.score - a.score);

      console.log(`✅ Found ${results.length} results for ${filters.city || filters.country || query}`);
      return results;
    };

    await recommender.initialize();

    // Share the recommender instance with tripRoutes (so they use the demo mode overrides)
    setRecommenderFactory(() => recommender);
    console.log('✅ Recommender factory shared with tripRoutes');

    console.log('🤖 Initializing Conversation Manager...');
    conversationManager = new ConversationManager(recommender);

    // Initialize flight search
    console.log('✈️  Initializing Flight Search...');
    flightSearch = new FlightSearch();
    console.log('✅ Flight search ready\n');

    // Initialize checklist generator
    console.log('📋 Initializing Checklist Generator...');
    checklistGenerator = new ChecklistGenerator();
    console.log('✅ Checklist generator ready\n');

    // Initialize itinerary generator
    console.log('🗺️  Initializing Itinerary Generator...');
    itineraryGenerator = new ItineraryGenerator(recommender);
    console.log('✅ Itinerary generator ready\n');

    // Initialize wellness manager
    console.log('☀️  Initializing Wellness Manager...');
    wellnessManager = new WellnessManager(itineraryGenerator);
    console.log('✅ Wellness manager ready\n');

    // Initialize daily checklist manager
    console.log('📅 Initializing Daily Checklist Manager...');
    dailyChecklistManager = new DailyChecklistManager();
    console.log('✅ Daily checklist manager ready\n');

    // Initialize hotel search
    console.log('🏨 Initializing Hotel Search...');
    hotelSearch = new HotelSearch();
    console.log('✅ Hotel search ready\n');

    // Initialize Booking.com hotel search
    console.log('🏨 Initializing Booking.com Hotel Search...');
    bookingComHotelSearch = new BookingComHotelSearch();
    console.log('✅ Booking.com hotel search ready\n');

    // Initialize trip planner service
    console.log('🌟 Initializing Trip Planner Service...');
    tripPlannerService = new TripPlannerService(recommender);
    console.log('✅ Trip planner service ready\n');

    // Initialize trip assistant chatbot
    console.log('💬 Initializing Trip Assistant Chatbot...');
    tripAssistantChatbot = new TripAssistantChatbot(recommender);
    console.log('✅ Trip assistant chatbot ready\n');

    isInitialized = true;
    console.log('✅ ALL SERVICES INITIALIZED - Server ready for requests!');
    console.log(`📊 Available endpoints:`);
    console.log(`   POST /api/recommend - Get recommendations`);
    console.log(`   POST /api/chat - Chat with Journey AI`);
    console.log(`   GET  /api/experiences - List experiences`);
    console.log(`   GET  /api/experiences/:id - Get single experience`);
    console.log(`   GET  /api/stats - Get database statistics`);
    console.log(`   POST /api/flights/search - Search flights`);
    console.log(`   GET  /api/airports/search - Search airports`);
    console.log(`   POST /api/checklist/generate - Generate travel checklist`);
    console.log(`   POST /api/wellness/checkin - Morning wellness check-in`);
    console.log(`   GET  /api/wellness/trend/:session_id - Get wellness trend`);
    console.log(`   POST /api/checklist/daily - Generate daily checklist`);
    console.log(`   PATCH /api/checklist/daily/:session_id/:day/:item_id - Update item`);
    console.log(`   GET  /api/checklist/daily/:session_id/:day - Get daily checklist`);
    console.log(`   POST /api/itinerary/generate - Generate trip itinerary`);
    console.log(`   POST /api/user/profile - Save/update user profile`);
    console.log(`   GET  /api/user/profile/:user_id - Get user profile`);
    console.log(`   POST /api/hotels/search - Search hotels`);
    console.log(`   POST /api/bookingcom/hotels/search - Booking.com hotel search`);
    console.log(`   POST /api/trip/plan - Complete trip planning (flights+hotels+itinerary)`);
    console.log(`   GET  /api/user/:user_id/trips - Get user's trips`);
    console.log(`   POST /api/health-reminders/complete - Save health reminder completion`);
    console.log(`   GET  /api/health-reminders/:trip_id - Get health reminder states`);
    console.log(`   GET  /api/health - Health check`);

  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    initializationError = error;
    // Don't exit - let health check endpoint still work
  }
}

// Start initialization in background
initializeServices();
