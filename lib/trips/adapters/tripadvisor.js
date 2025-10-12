/**
 * TripAdvisor API Adapter
 * Fetches real attractions, restaurants, and activities with reviews and timings
 */

import dotenv from 'dotenv';

dotenv.config();

const TRIPADVISOR_API_KEY = process.env.TRIPADVISOR_API_KEY;
const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';

// Location ID mapping for major cities
const LOCATION_IDS = {
  // Europe
  'paris': '187147',      // Paris, France
  'rome': '187791',       // Rome, Italy
  'london': '186338',     // London, UK
  'barcelona': '187497',  // Barcelona, Spain
  'amsterdam': '188590',  // Amsterdam, Netherlands
  'venice': '187870',     // Venice, Italy
  'florence': '187895',   // Florence, Italy
  'milan': '187849',      // Milan, Italy
  'madrid': '187514',     // Madrid, Spain
  'lisbon': '189158',     // Lisbon, Portugal
  'berlin': '187323',     // Berlin, Germany
  'munich': '187309',     // Munich, Germany
  'vienna': '190454',     // Vienna, Austria
  'prague': '274707',     // Prague, Czech Republic

  // North America
  'new york': '60763',    // New York City, USA
  'los angeles': '32655', // Los Angeles, USA
  'chicago': '35805',     // Chicago, USA
  'miami': '34438',       // Miami, USA
  'las vegas': '45963',   // Las Vegas, USA
  'san francisco': '60713', // San Francisco, USA
  'boston': '60745',      // Boston, USA
  'washington': '28970',  // Washington DC, USA
  'austin': '30196',      // Austin, USA
  'seattle': '60878',     // Seattle, USA

  // Asia
  'tokyo': '298184',      // Tokyo, Japan
  'bangkok': '293916',    // Bangkok, Thailand
  'singapore': '294265',  // Singapore
  'hong kong': '294217',  // Hong Kong
  'dubai': '295424',      // Dubai, UAE
  'seoul': '294197',      // Seoul, South Korea

  // Others
  'sydney': '255060',     // Sydney, Australia
  'melbourne': '255100',  // Melbourne, Australia
  'toronto': '155019',    // Toronto, Canada
  'vancouver': '154943'   // Vancouver, Canada
};

/**
 * Search attractions in a city
 */
export async function searchAttractions(destination, category = 'attractions') {
  if (!TRIPADVISOR_API_KEY) {
    console.log('⚠️  TripAdvisor API not configured');
    return [];
  }

  const locationId = LOCATION_IDS[destination.toLowerCase()];

  if (!locationId) {
    console.log(`⚠️  No TripAdvisor location ID for ${destination}`);
    return [];
  }

  try {
    const url = `${TRIPADVISOR_BASE_URL}/location/${locationId}/${category}?language=en`;

    console.log('🔍 Fetching TripAdvisor attractions:', destination);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-tripadvisor-api-key': TRIPADVISOR_API_KEY
      }
    });

    if (!response.ok) {
      console.error('TripAdvisor API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('No attractions found');
      return [];
    }

    console.log(`✅ Found ${data.data.length} attractions from TripAdvisor`);

    // Get details for each attraction
    const attractions = await Promise.all(
      data.data.slice(0, 15).map(async (item) => {
        const details = await getLocationDetails(item.location_id);
        return {
          id: item.location_id,
          name: item.name,
          description: details?.description || item.description || '',
          rating: parseFloat(item.rating || 0),
          num_reviews: item.num_reviews || 0,
          ranking: item.ranking_data?.ranking_string || '',
          address: details?.address_obj?.address_string || '',
          latitude: parseFloat(item.latitude || 0),
          longitude: parseFloat(item.longitude || 0),
          hours: details?.hours || null,
          phone: details?.phone || '',
          website: details?.website || '',
          price_level: details?.price_level || '',
          category: inferCategory(item),
          image: item.photo?.images?.large?.url || '',
          accessibility: extractAccessibility(details)
        };
      })
    );

    return attractions.filter(a => a.name);

  } catch (error) {
    console.error('TripAdvisor API error:', error.message);
    return [];
  }
}

/**
 * Get detailed information about a location
 */
async function getLocationDetails(locationId) {
  try {
    const url = `${TRIPADVISOR_BASE_URL}/location/${locationId}/details?language=en`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-tripadvisor-api-key': TRIPADVISOR_API_KEY
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching location details:', error.message);
    return null;
  }
}

/**
 * Extract accessibility information
 */
function extractAccessibility(details) {
  const accessibility = [];

  if (!details) return accessibility;

  // Check for wheelchair accessibility
  if (details.features && Array.isArray(details.features)) {
    for (const feature of details.features) {
      if (feature.toLowerCase().includes('wheelchair')) {
        accessibility.push('wheelchair_access');
      }
      if (feature.toLowerCase().includes('elevator')) {
        accessibility.push('elevator_required');
      }
      if (feature.toLowerCase().includes('accessible bathroom')) {
        accessibility.push('step_free');
      }
    }
  }

  return accessibility;
}

/**
 * Infer category from TripAdvisor data
 */
function inferCategory(item) {
  const name = item.name?.toLowerCase() || '';
  const subcategory = item.subcategory?.map(s => s.name?.toLowerCase()).join(' ') || '';

  if (subcategory.includes('museum') || name.includes('museum')) return 'museum';
  if (subcategory.includes('church') || subcategory.includes('cathedral')) return 'church';
  if (subcategory.includes('market')) return 'market';
  if (subcategory.includes('park') || subcategory.includes('garden')) return 'park';
  if (subcategory.includes('restaurant')) return 'restaurant';
  if (subcategory.includes('cafe') || subcategory.includes('coffee')) return 'cafe';
  if (subcategory.includes('tour')) return 'tour';

  return 'cultural_site';
}

/**
 * Search restaurants
 */
export async function searchRestaurants(destination) {
  return searchAttractions(destination, 'restaurants');
}

/**
 * Generate enhanced itinerary using OpenAI with destination context
 * Since TripAdvisor attractions API may not be available, we'll use OpenAI
 * to generate realistic itineraries with actual places
 */
export async function generateEnhancedItinerary(destination, startDate, endDate, preferences, flightInfo = null) {
  // Calculate trip duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Try to get city details from TripAdvisor for context
  const locationId = LOCATION_IDS[destination.toLowerCase()];
  let destinationContext = '';

  if (locationId) {
    try {
      const details = await getLocationDetails(locationId);
      if (details && details.description) {
        destinationContext = details.description;
      }
    } catch (error) {
      console.log('Could not fetch destination context:', error.message);
    }
  }

  // Use OpenAI to create a structured itinerary with real places and timings
  const itinerary = await generateItineraryWithAI(
    destination,
    startDate,
    endDate,
    days,
    destinationContext,
    preferences,
    flightInfo
  );

  return itinerary;
}

/**
 * Generate itinerary using OpenAI with destination knowledge
 */
async function generateItineraryWithAI(destination, startDate, endDate, days, destinationContext, preferences, flightInfo) {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.log('⚠️  OpenAI API key not found - returning basic itinerary');
    return createBasicItinerary(destination, days, [], []);
  }

  try {
    // Extract flight timing information
    let arrivalTime = '';
    let departureTime = '';
    let tripType = 'one-way';

    if (flightInfo) {
      tripType = flightInfo.tripType || 'round-trip';

      if (flightInfo.arrivalTime) {
        arrivalTime = new Date(flightInfo.arrivalTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      if (flightInfo.departureTime && tripType === 'round-trip') {
        departureTime = new Date(flightInfo.departureTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    }

    const accessibilityContext = preferences?.accessibility?.length > 0
      ? `\n\nIMPORTANT ACCESSIBILITY REQUIREMENTS:\n- ${preferences.accessibility.join('\n- ')}\n- Ensure all recommended places are wheelchair accessible\n- Include step-free routes and elevator availability\n- Mention accessible transportation options`
      : '';

    const vibeContext = preferences?.vibe?.length > 0
      ? `\n\nVIBE PREFERENCES: ${preferences.vibe.join(', ')}`
      : '';

    const budgetContext = preferences?.budget
      ? `\n\nBUDGET LEVEL: ${preferences.budget}`
      : '';

    // Calculate actual dates for each day
    const startDateObj = new Date(startDate);
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDateObj);
      date.setDate(date.getDate() + i);
      dates.push(date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }));
    }

    const flightConstraints = arrivalTime || departureTime
      ? `\n\nFLIGHT CONSTRAINTS:
${arrivalTime ? `- Day 1 (${dates[0]}): Flight arrives at ${arrivalTime}. Start activities AFTER arrival time + 2 hours for baggage/hotel check-in.` : ''}
${departureTime ? `- Day ${days} (${dates[days-1]}): ${tripType === 'round-trip' ? `Return flight departs at ${departureTime}. END all activities at least 3 hours before departure for airport check-in.` : ''}` : ''}
${!arrivalTime && !departureTime ? '- Day 1: Assume early morning arrival, can start activities from 9:00 AM' : ''}`
      : '';

    const prompt = `Create a detailed ${days}-day itinerary for ${destination}.

DATES: ${dates.join(' → ')}
${flightConstraints}

${destinationContext ? `DESTINATION INFO:\n${destinationContext}\n` : ''}
${vibeContext}${budgetContext}${accessibilityContext}

Requirements:
1. Use REAL, SPECIFIC attractions, museums, restaurants, and landmarks in ${destination}
2. Include exact street addresses or neighborhood names
3. Schedule activities with realistic timing (e.g., "2:00 PM - 4:30 PM: Visit Louvre Museum")
4. Match timings to actual venue opening hours (museums typically 10am-6pm, restaurants 12pm-10pm)
5. Plan realistic travel time between locations (15-30 min)
6. Include breakfast, lunch, and dinner at real restaurants
7. Balance activity types (museums, outdoor, dining, rest)
8. Add Google Maps-ready location names
9. IMPORTANT: Include the actual date for each day from the DATES list above
10. For each activity, include:
   - Exact time slot
   - Duration
   - Full name of location
   - Brief description (1-2 sentences)
   - Activity type (museum/restaurant/park/landmark/etc)

Return JSON format:
{
  "days": [
    {
      "day": 1,
      "date": "${dates[0] || 'Date'}",
      "title": "Day title",
      "highlight": "Main activity",
      "activities": [
        {
          "time": "2:00 PM",
          "name": "Exact attraction name",
          "description": "What to do there",
          "duration": "2 hours",
          "type": "museum/restaurant/park/etc"
        }
      ]
    }
  ]
}`;

    // Create abort controller for timeout - increased for longer itineraries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          { role: 'system', content: 'You are a travel itinerary planner. Create detailed, realistic itineraries using real attraction names and operating hours. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,  // Increased for longer trips
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return createBasicItinerary(destination, days, [], []);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('Empty response from OpenAI');
      return createBasicItinerary(destination, days, [], []);
    }

    console.log('✅ Received response from OpenAI');
    console.log('Response length:', content.length, 'characters');

    // Parse JSON response - try direct parsing first since we're using json_object mode
    try {
      const itinerary = JSON.parse(content);

      if (!itinerary.days || !Array.isArray(itinerary.days)) {
        console.error('Invalid itinerary structure - missing days array');
        return createBasicItinerary(destination, days, [], []);
      }

      console.log(`✅ Successfully parsed itinerary with ${itinerary.days.length} days`);

      // Enhance with Google Maps links
      return enhanceItineraryWithMapsLinks(itinerary, destination);

    } catch (parseError) {
      console.error('Failed to parse JSON directly:', parseError.message);
      console.log('Attempting to clean and fix JSON...');

      // Try to clean the JSON - remove trailing commas, fix common issues
      let cleanedContent = content
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/\n/g, ' ')  // Remove newlines
        .replace(/\r/g, '')   // Remove carriage returns
        .trim();

      try {
        const itinerary = JSON.parse(cleanedContent);

        if (!itinerary.days || !Array.isArray(itinerary.days)) {
          console.error('Invalid itinerary structure - missing days array');
          return createBasicItinerary(destination, days, [], []);
        }

        console.log(`✅ Successfully parsed cleaned itinerary with ${itinerary.days.length} days`);

        // Enhance with Google Maps links
        return enhanceItineraryWithMapsLinks(itinerary, destination);

      } catch (cleanError) {
        console.error('Cleaned JSON parsing also failed:', cleanError.message);
        console.log('⚠️  Falling back to basic itinerary generation');
        return createBasicItinerary(destination, days, [], []);
      }
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenAI request timed out after 30 seconds');
    } else {
      console.error('Error generating AI itinerary:', error.message);
    }
    return createBasicItinerary(destination, days, [], []);
  }
}

/**
 * Enhance AI-generated itinerary with Google Maps links
 */
function enhanceItineraryWithMapsLinks(itinerary, destination) {
  if (!itinerary || !itinerary.days) {
    console.error('Invalid itinerary structure');
    return [];
  }

  for (const day of itinerary.days) {
    if (!day.activities || !Array.isArray(day.activities)) {
      continue;
    }

    for (const activity of day.activities) {
      // Add Google Maps link
      const mapsQuery = encodeURIComponent(`${activity.name}, ${destination}`);
      activity.mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

      // Add icon based on type
      activity.icon = getActivityIcon(activity.type || 'cultural_site');

      // Ensure accessibility is an array
      if (!activity.accessibility) {
        activity.accessibility = [];
      }
    }
  }

  console.log(`✅ Enhanced ${itinerary.days.length}-day itinerary with maps links`);
  return itinerary.days;
}

/**
 * Create basic itinerary when AI is not available
 */
function createBasicItinerary(destination, days, attractions, restaurants) {
  const itinerary = [];

  for (let i = 0; i < days; i++) {
    const dayAttractions = attractions.slice(i * 3, (i + 1) * 3);
    const dayRestaurant = restaurants[i % restaurants.length];

    const activities = [];

    // Morning attraction
    if (dayAttractions[0]) {
      activities.push({
        time: '9:00 AM',
        name: dayAttractions[0].name,
        description: dayAttractions[0].description || 'Visit this popular attraction',
        duration: '2 hours',
        type: dayAttractions[0].category,
        icon: getActivityIcon(dayAttractions[0].category),
        address: dayAttractions[0].address,
        mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dayAttractions[0].name + ', ' + destination)}`
      });
    }

    // Lunch
    if (dayRestaurant) {
      activities.push({
        time: '12:30 PM',
        name: dayRestaurant.name,
        description: 'Enjoy local cuisine',
        duration: '1.5 hours',
        type: 'restaurant',
        icon: '🍽️',
        address: dayRestaurant.address,
        mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dayRestaurant.name + ', ' + destination)}`
      });
    }

    // Afternoon attraction
    if (dayAttractions[1]) {
      activities.push({
        time: '2:30 PM',
        name: dayAttractions[1].name,
        description: dayAttractions[1].description || 'Explore this location',
        duration: '2 hours',
        type: dayAttractions[1].category,
        icon: getActivityIcon(dayAttractions[1].category),
        address: dayAttractions[1].address,
        mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dayAttractions[1].name + ', ' + destination)}`
      });
    }

    itinerary.push({
      day: i + 1,
      title: i === 0 ? 'Arrival & Discovery' : `Day ${i + 1}`,
      highlight: dayAttractions[0]?.name || 'Explore the city',
      activities
    });
  }

  return itinerary;
}

/**
 * Format hours for display
 */
function formatHours(hours) {
  if (!hours || !hours.weekday_text) return 'Check website for hours';
  return hours.weekday_text[0] || 'Varies';
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type) {
  const icons = {
    museum: '🎨',
    church: '⛪',
    market: '🛒',
    park: '🌳',
    restaurant: '🍽️',
    cafe: '☕',
    tour: '🚶',
    cultural_site: '🏛️'
  };
  return icons[type] || '🎯';
}

export default {
  searchAttractions,
  searchRestaurants,
  generateEnhancedItinerary
};
