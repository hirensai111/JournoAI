import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';
import FlightSearch from './flightModule.js';
import HotelSearch from './hotelModule.js';

dotenv.config();

/**
 * Conversational AI Trip Assistant
 * Helps users customize their trip by suggesting alternatives
 * for flights, hotels, and experiences
 */
class TripAssistantChatbot {
  constructor(recommender) {
    this.recommender = recommender;
    this.flightSearch = new FlightSearch();
    this.hotelSearch = new HotelSearch();
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Store conversation history per user/session
    this.conversations = new Map();
  }

  /**
   * Initialize a new conversation session
   */
  initConversation(sessionId, tripContext) {
    const systemPrompt = `You are Mari, a friendly and knowledgeable AI travel assistant. You help users customize their trips by:

1. **Understanding their preferences** - Listen to what they like or don't like about their current trip plan
2. **Suggesting alternatives** - Offer different flights, hotels, or experiences based on their feedback
3. **Providing details** - Give helpful information about prices, accessibility, ratings, and amenities
4. **Being health-aware** - Always consider the user's health conditions and accessibility needs
5. **Being conversational** - Chat naturally and ask clarifying questions when needed

Current Trip Context:
- Destination: ${tripContext.destination}
- Duration: ${tripContext.duration} days
- Start Date: ${tripContext.startDate}
- Health Conditions: ${tripContext.conditions?.join(', ') || 'None'}
- Selected Flight: ${tripContext.currentFlight?.airline || 'Not selected'}
- Selected Hotel: ${tripContext.currentHotel?.name || 'Not selected'}
- Selected Experiences: ${tripContext.selectedExperiences?.length || 0} experiences

Important guidelines:
- Always be empathetic and understanding
- Offer 2-3 alternatives when suggesting changes
- Explain the differences between options (price, duration, accessibility, etc.)
- Ask follow-up questions to better understand their needs
- Use natural, conversational language
- When suggesting changes, format your response with clear options

When the user wants to make a change, you should:
1. Understand what they want to change and why
2. Suggest specific alternatives with details
3. Ask if they'd like to see more options or make the change`;

    this.conversations.set(sessionId, {
      history: [new SystemMessage(systemPrompt)],
      tripContext,
      lastUpdate: Date.now()
    });
  }

  /**
   * Process user message and generate response
   */
  async chat(sessionId, userMessage, tripContext) {
    // Initialize conversation if not exists
    if (!this.conversations.has(sessionId)) {
      this.initConversation(sessionId, tripContext);
    }

    const conversation = this.conversations.get(sessionId);

    // Update trip context
    conversation.tripContext = { ...conversation.tripContext, ...tripContext };
    conversation.lastUpdate = Date.now();

    // Detect intent from user message
    const intent = await this.detectIntent(userMessage, conversation.tripContext);

    let response;
    let suggestions = null;

    // Handle different intents
    switch (intent.type) {
      case 'change_flight':
        suggestions = await this.suggestFlightAlternatives(conversation.tripContext, intent.preferences);
        response = await this.generateResponseWithSuggestions(
          sessionId,
          userMessage,
          suggestions,
          'flight'
        );
        break;

      case 'change_hotel':
        suggestions = await this.suggestHotelAlternatives(conversation.tripContext, intent.preferences);
        response = await this.generateResponseWithSuggestions(
          sessionId,
          userMessage,
          suggestions,
          'hotel'
        );
        break;

      case 'change_experience':
        suggestions = await this.suggestExperienceAlternatives(conversation.tripContext, intent.preferences);
        response = await this.generateResponseWithSuggestions(
          sessionId,
          userMessage,
          suggestions,
          'experience'
        );
        break;

      case 'change_itinerary':
        response = await this.handleItineraryChange(sessionId, userMessage, intent);
        break;

      default:
        // General conversation
        response = await this.generateGeneralResponse(sessionId, userMessage);
    }

    // Add to conversation history
    conversation.history.push(new HumanMessage(userMessage));
    conversation.history.push(new AIMessage(response.text));

    return {
      text: response.text,
      suggestions: suggestions || response.suggestions,
      intent: intent.type,
      actions: response.actions || []
    };
  }

  /**
   * Detect user intent from their message
   */
  async detectIntent(message, tripContext) {
    const lowerMessage = message.toLowerCase();

    // Flight intent
    if (lowerMessage.includes('flight') || lowerMessage.includes('airline') ||
        lowerMessage.includes('departure') || lowerMessage.includes('arrival')) {
      return {
        type: 'change_flight',
        preferences: this.extractFlightPreferences(message)
      };
    }

    // Hotel intent
    if (lowerMessage.includes('hotel') || lowerMessage.includes('accommodation') ||
        lowerMessage.includes('stay') || lowerMessage.includes('room')) {
      return {
        type: 'change_hotel',
        preferences: this.extractHotelPreferences(message)
      };
    }

    // Experience intent
    if (lowerMessage.includes('experience') || lowerMessage.includes('activity') ||
        lowerMessage.includes('restaurant') || lowerMessage.includes('attraction') ||
        lowerMessage.includes('visit') || lowerMessage.includes('do')) {
      return {
        type: 'change_experience',
        preferences: this.extractExperiencePreferences(message)
      };
    }

    // Itinerary intent
    if (lowerMessage.includes('itinerary') || lowerMessage.includes('schedule') ||
        lowerMessage.includes('day') || lowerMessage.includes('plan')) {
      return {
        type: 'change_itinerary',
        preferences: {}
      };
    }

    return { type: 'general', preferences: {} };
  }

  /**
   * Extract flight preferences from message
   */
  extractFlightPreferences(message) {
    const prefs = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('affordable')) {
      prefs.priority = 'price';
    }
    if (lowerMessage.includes('direct') || lowerMessage.includes('non-stop') || lowerMessage.includes('nonstop')) {
      prefs.direct = true;
    }
    if (lowerMessage.includes('morning')) {
      prefs.timeOfDay = 'morning';
    }
    if (lowerMessage.includes('evening') || lowerMessage.includes('night')) {
      prefs.timeOfDay = 'evening';
    }

    return prefs;
  }

  /**
   * Extract hotel preferences from message
   */
  extractHotelPreferences(message) {
    const prefs = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
      prefs.priority = 'price';
    }
    if (lowerMessage.includes('luxury') || lowerMessage.includes('5 star') || lowerMessage.includes('upscale')) {
      prefs.priority = 'rating';
      prefs.minRating = 4.5;
    }
    if (lowerMessage.includes('accessible') || lowerMessage.includes('wheelchair')) {
      prefs.accessible = true;
    }
    if (lowerMessage.includes('central') || lowerMessage.includes('downtown') || lowerMessage.includes('city center')) {
      prefs.location = 'central';
    }

    return prefs;
  }

  /**
   * Extract experience preferences from message
   */
  extractExperiencePreferences(message) {
    const prefs = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('eat')) {
      prefs.type = 'food_culinary';
    }
    if (lowerMessage.includes('museum') || lowerMessage.includes('art') || lowerMessage.includes('culture')) {
      prefs.type = 'art_museums';
    }
    if (lowerMessage.includes('outdoor') || lowerMessage.includes('nature') || lowerMessage.includes('park')) {
      prefs.type = 'nature_outdoors';
    }
    if (lowerMessage.includes('relax') || lowerMessage.includes('peaceful') || lowerMessage.includes('calm')) {
      prefs.activityLevel = 'sedentary';
    }

    return prefs;
  }

  /**
   * Suggest flight alternatives
   */
  async suggestFlightAlternatives(tripContext, preferences) {
    try {
      const { origin, destination, startDate, duration, conditions } = tripContext;

      // Get origin and destination codes
      let originCode = 'JFK';
      let destinationCode = 'FCO';

      if (origin) {
        const originResult = await this.flightSearch.searchAirports(origin);
        if (originResult.length > 0) originCode = originResult[0].iataCode;
      }

      const destResult = await this.flightSearch.searchAirports(destination.split(',')[0]);
      if (destResult.length > 0) destinationCode = destResult[0].iataCode;

      // Search for flights
      const returnDate = new Date(startDate);
      returnDate.setDate(returnDate.getDate() + duration);

      const flights = await this.flightSearch.searchFlights({
        origin: originCode,
        destination: destinationCode,
        departureDate: startDate,
        returnDate: returnDate.toISOString().split('T')[0],
        accessibility: conditions?.includes('wheelchair_user') ? ['wheelchair'] : []
      });

      // Filter based on preferences
      let filteredFlights = flights;
      if (preferences.priority === 'price') {
        filteredFlights.sort((a, b) => (a.price?.total || 999) - (b.price?.total || 999));
      }
      if (preferences.direct) {
        filteredFlights = filteredFlights.filter(f => f.stops === 0);
      }

      return filteredFlights.slice(0, 3).map(flight => ({
        type: 'flight',
        data: flight,
        summary: `${flight.airline} - ${flight.price?.total || 'N/A'} ${flight.price?.currency || 'EUR'} - ${flight.stops || 0} stops`
      }));
    } catch (error) {
      console.error('Error suggesting flight alternatives:', error);
      return [];
    }
  }

  /**
   * Suggest hotel alternatives
   */
  async suggestHotelAlternatives(tripContext, preferences) {
    try {
      const { destination, startDate, duration, conditions } = tripContext;
      const city = destination.split(',')[0].trim();

      const cityCode = await this.hotelSearch.getCityCode(city);
      const checkOutDate = new Date(startDate);
      checkOutDate.setDate(checkOutDate.getDate() + duration);

      const hotels = await this.hotelSearch.searchHotels({
        cityCode,
        checkInDate: startDate,
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        adults: 1,
        accessibility: conditions
      });

      // Filter based on preferences
      let filteredHotels = hotels;
      if (preferences.priority === 'price') {
        filteredHotels.sort((a, b) => (a.price || 999) - (b.price || 999));
      }
      if (preferences.priority === 'rating') {
        filteredHotels = filteredHotels.filter(h => h.rating >= (preferences.minRating || 4));
        filteredHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      return filteredHotels.slice(0, 3).map(hotel => ({
        type: 'hotel',
        data: hotel,
        summary: `${hotel.name} - ${hotel.rating || 'N/A'}⭐ - ${hotel.accessibility_score || 'N/A'}/5 accessibility`
      }));
    } catch (error) {
      console.error('Error suggesting hotel alternatives:', error);
      return [];
    }
  }

  /**
   * Suggest experience alternatives
   */
  async suggestExperienceAlternatives(tripContext, preferences) {
    try {
      const { destination, conditions } = tripContext;
      const [city, country] = destination.split(',').map(s => s.trim());

      // Build search query based on preferences
      let query = `authentic local experiences in ${city}`;
      if (preferences.type) {
        query = `${preferences.type.replace('_', ' ')} experiences in ${city}`;
      }

      const results = await this.recommender.search({
        query,
        filters: { country, city },
        limit: 10
      });

      // Filter based on preferences
      let experiences = results.map(r => r.experience);

      if (preferences.activityLevel) {
        experiences = experiences.filter(e => e.activity_level === preferences.activityLevel);
      }

      // Prioritize wheelchair accessible if needed
      if (conditions?.includes('wheelchair_user')) {
        experiences.sort((a, b) => {
          const aAccessible = a.inclusion_tags?.includes('wheelchair_accessible') ? 1 : 0;
          const bAccessible = b.inclusion_tags?.includes('wheelchair_accessible') ? 1 : 0;
          return bAccessible - aAccessible;
        });
      }

      return experiences.slice(0, 3).map(exp => ({
        type: 'experience',
        data: exp,
        summary: `${exp.name} - ${exp.type} - ${exp.activity_level} activity ${exp.inclusion_tags?.includes('wheelchair_accessible') ? '♿' : ''}`
      }));
    } catch (error) {
      console.error('Error suggesting experience alternatives:', error);
      return [];
    }
  }

  /**
   * Generate response with suggestions
   */
  async generateResponseWithSuggestions(sessionId, userMessage, suggestions, type) {
    const conversation = this.conversations.get(sessionId);

    // Create context for LLM
    const suggestionContext = suggestions.map((s, i) =>
      `Option ${i + 1}: ${s.summary}`
    ).join('\n');

    const prompt = `The user said: "${userMessage}"

I've found these ${type} alternatives:
${suggestionContext}

Generate a friendly, conversational response that:
1. Acknowledges their request
2. Presents these options in a clear, engaging way
3. Highlights key differences (price, features, accessibility)
4. Asks if they'd like to select one or see more options

Keep it natural and conversational, not robotic.`;

    const messages = [
      ...conversation.history.slice(-6), // Last 3 exchanges
      new HumanMessage(prompt)
    ];

    const response = await this.llm.invoke(messages);

    return {
      text: response.content,
      suggestions,
      actions: [{
        type: 'show_suggestions',
        data: suggestions
      }]
    };
  }

  /**
   * Generate general conversational response
   */
  async generateGeneralResponse(sessionId, userMessage) {
    const conversation = this.conversations.get(sessionId);

    const messages = [
      ...conversation.history.slice(-8), // Last 4 exchanges
      new HumanMessage(userMessage)
    ];

    const response = await this.llm.invoke(messages);

    return {
      text: response.content,
      suggestions: null,
      actions: []
    };
  }

  /**
   * Handle itinerary change requests
   */
  async handleItineraryChange(sessionId, userMessage, intent) {
    const conversation = this.conversations.get(sessionId);

    const prompt = `The user wants to modify their itinerary: "${userMessage}"

Current trip context:
- Destination: ${conversation.tripContext.destination}
- Duration: ${conversation.tripContext.duration} days

Provide a helpful response that:
1. Acknowledges their request
2. Asks clarifying questions about what they want to change
3. Suggests how they can customize their schedule

Be conversational and helpful.`;

    const messages = [
      ...conversation.history.slice(-6),
      new HumanMessage(prompt)
    ];

    const response = await this.llm.invoke(messages);

    return {
      text: response.content,
      suggestions: null,
      actions: []
    };
  }

  /**
   * Clean up old conversations
   */
  cleanupOldConversations() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, conversation] of this.conversations.entries()) {
      if (now - conversation.lastUpdate > maxAge) {
        this.conversations.delete(sessionId);
      }
    }
  }
}

export default TripAssistantChatbot;
