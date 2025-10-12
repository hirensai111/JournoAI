/**
 * Enhanced Trip Planner Flow
 * Handles step-by-step trip planning: Parse → Flights → Hotels → Itinerary → Save
 */

// Global state
let planningState = {
  step: 'initial', // initial, flights, hotels, itinerary, saved
  preferences: null,
  selectedFlight: null,
  selectedHotel: null,
  allFlights: [],
  allHotels: [],
  itinerary: null
};

/**
 * Main function to handle chat message submission
 */
async function handleChatSubmit() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();

  if (!text) {
    alert('Please enter your trip details');
    return;
  }

  // Add user message to chat
  addChatMessage(text, 'user');
  input.value = '';

  // Handle follow-up responses based on current step
  if (planningState.step === 'awaiting_travelers') {
    const numMatch = text.match(/(\d+)/);
    if (numMatch) {
      planningState.preferences.travelers = parseInt(numMatch[1]);
      planningState.preferences.travelersProvided = true;

      // Now ask for dates
      planningState.step = 'awaiting_dates';
      addChatMessage(`Great! Planning for ${numMatch[1]} traveler${numMatch[1] > 1 ? 's' : ''}.\n\nWhen would you like to travel? (e.g., "November 15th" or "15th Nov")`, 'assistant');
      return;
    } else {
      addChatMessage('Please specify the number of travelers (e.g., "2 people" or just "2")', 'assistant');
      return;
    }
  }

  if (planningState.step === 'awaiting_dates') {
    const dateInfo = parseDateFromMessage(text);
    if (dateInfo.startDate) {
      planningState.preferences.startDate = dateInfo.startDate;
      planningState.preferences.endDate = dateInfo.endDate;

      // Now ask for budget
      planningState.step = 'awaiting_budget';
      addChatMessage(`Perfect! Dates set to ${dateInfo.startDate} - ${dateInfo.endDate}.\n\nWhat's your budget? (budget/mid/premium)`, 'assistant');
      return;
    } else {
      addChatMessage('Please provide a travel date (e.g., "November 15th", "15th Nov", or "Nov 15")', 'assistant');
      return;
    }
  }

  if (planningState.step === 'awaiting_budget') {
    const lower = text.toLowerCase();
    if (/budget|cheap|affordable|economy/i.test(lower)) {
      planningState.preferences.budget = 'budget';
      planningState.preferences.budgetProvided = true;
    } else if (/premium|luxury|business|first/i.test(lower)) {
      planningState.preferences.budget = 'premium';
      planningState.preferences.budgetProvided = true;
    } else if (/mid|medium|moderate/i.test(lower)) {
      planningState.preferences.budget = 'mid';
      planningState.preferences.budgetProvided = true;
    } else {
      addChatMessage('Please choose: budget, mid, or premium', 'assistant');
      return;
    }

    // All info collected - now fetch flights
    const prefs = planningState.preferences;
    addChatMessage(`Perfect! Planning a ${prefs.budget} trip for ${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''} from ${prefs.origin} to ${prefs.destination}.\n\nDates: ${prefs.startDate} to ${prefs.endDate}\n\nSearching for flights...`, 'assistant');
    planningState.step = 'searching';
    await fetchAndDisplayFlights(prefs);
    return;
  }

  // Parse the message for initial trip request
  const prefs = parseTripMessage(text);

  if (!prefs.origin || !prefs.destination) {
    addChatMessage('I need more details! Please tell me where you\'re traveling FROM and TO. For example: "Book me a trip from New York to Paris"', 'assistant');
    return;
  }

  // Store partial preferences
  planningState.preferences = prefs;

  // Check if travelers provided
  if (!prefs.travelersProvided) {
    planningState.step = 'awaiting_travelers';
    addChatMessage(`Great! Planning a trip from ${prefs.origin} to ${prefs.destination}.\n\nHow many people are traveling?`, 'assistant');
    return;
  }

  // Check if dates provided
  if (!prefs.startDate) {
    planningState.step = 'awaiting_dates';
    addChatMessage(`Great! Planning a trip from ${prefs.origin} to ${prefs.destination} for ${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''}.\n\nWhen would you like to travel? (e.g., "November 15th" or "15th Nov")`, 'assistant');
    return;
  }

  // Check if budget provided
  if (!prefs.budgetProvided) {
    planningState.step = 'awaiting_budget';
    addChatMessage(`Great! Planning a trip from ${prefs.origin} to ${prefs.destination} for ${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''}.\n\nDates: ${prefs.startDate} to ${prefs.endDate}\n\nWhat's your budget? (budget/mid/premium)`, 'assistant');
    return;
  }

  // All info provided - fetch flights
  addChatMessage(`Perfect! Planning a ${prefs.budget} trip for ${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''} from ${prefs.origin} to ${prefs.destination}.\n\nDates: ${prefs.startDate} to ${prefs.endDate}\n\nSearching for flights...`, 'assistant');
  planningState.step = 'searching';
  await fetchAndDisplayFlights(prefs);
}

/**
 * Parse date from message (for follow-up date specifications)
 */
function parseDateFromMessage(text) {
  const result = {
    startDate: null,
    endDate: null
  };

  // Handle formats like "11th nov", "Nov 11", "November 11th", "11 November"
  const months = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  // Try to match date ranges in multiple formats:
  // Format 1: "June 12-18" or "June 12 to 18"
  const rangePattern1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to)\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/i;
  const rangeMatch1 = text.toLowerCase().match(rangePattern1);

  if (rangeMatch1) {
    const monthName = rangeMatch1[1].toLowerCase();
    const month = months[monthName];
    const startDay = rangeMatch1[2].padStart(2, '0');
    const endDay = rangeMatch1[3].padStart(2, '0');
    const year = rangeMatch1[4] || new Date().getFullYear();

    result.startDate = `${year}-${month}-${startDay}`;
    result.endDate = `${year}-${month}-${endDay}`;
    return result;
  }

  // Format 2: "20th Oct to 31st Oct" or "20 Oct to 31 Oct"
  const rangePattern2 = /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:to|-)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
  const rangeMatch2 = text.toLowerCase().match(rangePattern2);

  if (rangeMatch2) {
    const startDay = rangeMatch2[1].padStart(2, '0');
    const startMonthName = rangeMatch2[2].toLowerCase();
    const startMonth = months[startMonthName];
    const endDay = rangeMatch2[3].padStart(2, '0');
    const endMonthName = rangeMatch2[4].toLowerCase();
    const endMonth = months[endMonthName];
    const year = rangeMatch2[5] || new Date().getFullYear();

    result.startDate = `${year}-${startMonth}-${startDay}`;
    result.endDate = `${year}-${endMonth}-${endDay}`;
    return result;
  }

  // Try to match single date: "11th nov" or "nov 11" or "november 11th"
  const datePattern = /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
  const match = text.toLowerCase().match(datePattern);

  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    const month = months[monthName];
    const year = match[3] || new Date().getFullYear();

    result.startDate = `${year}-${month}-${day}`;
    // Default to 7 days later for end date
    const endDate = new Date(result.startDate);
    endDate.setDate(endDate.getDate() + 7);
    result.endDate = endDate.toISOString().split('T')[0];
  }

  return result;
}

/**
 * Parse natural language trip request
 */
function parseTripMessage(text) {
  const lower = text.toLowerCase();

  const prefs = {
    origin: null,
    destination: null,
    travelers: null,
    travelersProvided: false,
    budget: null,
    budgetProvided: false,
    startDate: null,
    endDate: null
  };

  // Extract origin and destination - handle multiple formats
  // Format 1: "from Boston to Paris"
  let fromMatch = lower.match(/from\s+([a-z\s]+?)\s+(?:to|going to)\s+([a-z\s]+?)(?:\s|,|$)/i);
  if (fromMatch) {
    prefs.origin = fromMatch[1].trim();
    prefs.destination = fromMatch[2].trim();
  } else {
    // Format 2: "from X" alone
    fromMatch = lower.match(/from\s+([a-z\s]+?)(?:\s+for|\s+in|,|$)/i);
    if (fromMatch) {
      prefs.origin = fromMatch[1].trim();
    }

    // Format 3: "to X" or "going to X"
    const toMatch = lower.match(/(?:to|going to)\s+([a-z\s]+?)(?:\s+for|\s+in|\s+on|,|$)/i);
    if (toMatch) {
      prefs.destination = toMatch[1].trim();
    }
  }

  // Extract travelers
  const travelersMatch = lower.match(/(\d+)\s*(?:people|person|traveler|pax)/);
  if (travelersMatch) {
    prefs.travelers = parseInt(travelersMatch[1]);
    prefs.travelersProvided = true;
  }

  // Extract budget (check mid-range first to avoid matching 'budget' substring)
  if (/mid[\s-]?range|mid|medium|moderate|middle/i.test(lower)) {
    prefs.budget = 'mid';
    prefs.budgetProvided = true;
  } else if (/premium|luxury|business|first\s*class|high[\s-]?end/i.test(lower)) {
    prefs.budget = 'premium';
    prefs.budgetProvided = true;
  } else if (/\bbudget\b|cheap|affordable|economy|low[\s-]?cost/i.test(lower)) {
    prefs.budget = 'budget';
    prefs.budgetProvided = true;
  }

  // Try to parse dates using the new function
  const dateInfo = parseDateFromMessage(text);
  if (dateInfo.startDate) {
    prefs.startDate = dateInfo.startDate;
    prefs.endDate = dateInfo.endDate;
  }

  return prefs;
}

/**
 * Fetch and display flight options
 */
async function fetchAndDisplayFlights(prefs) {
  try {
    // Calculate dates if not provided (7 days from today)
    const startDate = prefs.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = prefs.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch('http://localhost:3001/api/trips/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: prefs.origin,
        destination: prefs.destination,
        startDate,
        endDate,
        travelers: prefs.travelers || 1,
        budget: prefs.budget || 'mid',
        travelersProfiles: []
      })
    });

    const data = await response.json();

    if (!data || !data.flights || data.flights.length === 0) {
      addChatMessage('Sorry, I couldn\'t find flights. Please try again with different details.', 'assistant');
      return;
    }

    // Store flight data directly from API
    planningState.allFlights = data.flights;
    planningState.step = 'flights';
    planningState.preferences = { ...planningState.preferences, startDate, endDate };

    // Display flight selection UI
    displayFlightSelection(planningState.allFlights);

    addChatMessage(`Found ${planningState.allFlights.length} flights! Choose your preferred option:`, 'assistant');

  } catch (error) {
    console.error('Error fetching flights:', error);
    addChatMessage('Oops! Something went wrong. Please try again.', 'assistant');
  }
}

/**
 * Convert city name to airport code (simplified - replace with real API call)
 */
function cityToAirportCode(cityName) {
  const airports = {
    'austin': 'AUS',
    'boston': 'BOS',
    'rome': 'FCO',
    'paris': 'CDG',
    'london': 'LHR',
    'new york': 'JFK',
    'los angeles': 'LAX',
    'chicago': 'ORD',
    'san francisco': 'SFO',
    'miami': 'MIA',
    'seattle': 'SEA',
    'tokyo': 'HND',
    'dubai': 'DXB',
    'singapore': 'SIN',
    'sydney': 'SYD',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'berlin': 'BER',
    'amsterdam': 'AMS',
    'bangkok': 'BKK',
    'hong kong': 'HKG',
    'toronto': 'YYZ',
    'vancouver': 'YVR',
    'france': 'CDG', // Default to Paris
    'italy': 'FCO', // Default to Rome
    'spain': 'MAD', // Default to Madrid
    'germany': 'BER', // Default to Berlin
    'uk': 'LHR', // Default to London
    'usa': 'JFK' // Default to New York
  };

  const normalized = cityName.toLowerCase().trim();
  return airports[normalized] || 'XXX';
}

/**
 * Generate multiple flight options (mock for now, will be replaced with real API data)
 */
function generateFlightOptions(baseFlight, prefs) {
  const flights = [];
  const carriers = ['American Airlines', 'United Airlines', 'Delta', 'Southwest'];
  const cabins = prefs.budget === 'premium' ? ['BUSINESS', 'FIRST'] : ['ECONOMY', 'PREMIUM_ECONOMY'];

  // Convert city names to airport codes
  const departureAirport = cityToAirportCode(prefs.origin);
  const arrivalAirport = cityToAirportCode(prefs.destination);

  // Base duration varies by route
  const baseDuration = 660; // 11 hours as default

  // Generate departure times (morning, afternoon, evening, red-eye)
  const departureHours = [8, 11, 16, 22]; // 8am, 11am, 4pm, 10pm

  for (let i = 0; i < 5; i++) {
    const price = baseFlight.priceTotal + (Math.random() * 400 - 200);
    const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;

    // Calculate realistic duration based on stops
    // Direct: 11-12 hours
    // 1 stop: 13-15 hours (add 2-3 hours layover)
    // 2 stops: 16-18 hours (add 4-6 hours total layover)
    let duration = baseDuration + (Math.random() * 60); // Add 0-60 min variance
    if (stops === 1) {
      duration += 120 + (Math.random() * 60); // Add 2-3 hours
    } else if (stops === 2) {
      duration += 300 + (Math.random() * 60); // Add 5-6 hours
    }

    // Generate departure and arrival times
    const departureHour = departureHours[i % departureHours.length];
    const departureMinute = Math.floor(Math.random() * 60);
    const departureTime = `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`;

    // Calculate arrival time (departure + duration + timezone difference)
    const durationInMinutes = Math.round(duration); // Ensure integer
    const timezoneOffset = 360; // +6 hours for Boston to Paris
    const arrivalTotalMinutes = (departureHour * 60 + departureMinute + durationInMinutes + timezoneOffset) % (24 * 60);
    const arrivalHour = Math.floor(arrivalTotalMinutes / 60);
    const arrivalMinute = Math.floor(arrivalTotalMinutes % 60); // Ensure integer
    const arrivalTime = `${arrivalHour.toString().padStart(2, '0')}:${arrivalMinute.toString().padStart(2, '0')}`;

    flights.push({
      id: `flight-${i}`,
      carrier: carriers[i % carriers.length],
      cabin: cabins[Math.floor(Math.random() * cabins.length)],
      stops,
      priceTotal: Math.round(price),
      currency: 'USD',
      departureAirport,
      arrivalAirport,
      duration: Math.round(duration),
      departureTime,
      arrivalTime
    });
  }

  return flights.sort((a, b) => a.priceTotal - b.priceTotal);
}

/**
 * Format date and time from ISO string
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date: dateStr, time: timeStr };
}

/**
 * Display flight selection cards in the plan preview
 */
function displayFlightSelection(flights) {
  const preview = document.getElementById('plan-preview');

  const flightsHTML = flights.map(flight => {
    // Get outbound flight details
    const outbound = flight.segments && flight.segments.length > 0 ? flight.segments[0] : null;
    const outboundLast = flight.segments && flight.segments.length > 0 ? flight.segments[flight.segments.length - 1] : null;

    let departureInfo = '';
    let arrivalInfo = '';
    let stopsInfo = '';
    let durationInfo = '';

    if (outbound && outboundLast) {
      const depDateTime = formatDateTime(outbound.dep);
      const arrDateTime = formatDateTime(outboundLast.arr);

      departureInfo = `${outbound.from} ${depDateTime.time}`;
      arrivalInfo = `${outboundLast.to} ${arrDateTime.time}`;

      const stops = flight.segments.length - 1;
      stopsInfo = stops === 0 ? '🎯 Direct' : `🔄 ${stops} stop${stops > 1 ? 's' : ''}`;

      // Calculate total duration
      const totalDuration = flight.segments.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0);
      durationInfo = `⏱️ ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`;
    } else if (flight.departureAirport && flight.arrivalAirport) {
      // Fallback to old format
      departureInfo = `${flight.departureAirport} ${flight.departureTime || ''}`;
      arrivalInfo = `${flight.arrivalAirport} ${flight.arrivalTime || ''}`;
      stopsInfo = flight.stops === 0 ? '🎯 Direct' : `🔄 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;
      durationInfo = `⏱️ ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m`;
    }

    return `
    <div class="flight-option" onclick="selectFlight('${flight.id}')" style="border: 2px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.5rem;">${flight.carrier}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            <div style="margin-bottom: 0.25rem;">
              <strong>Departure:</strong> ${departureInfo}
            </div>
            <div style="margin-bottom: 0.25rem;">
              <strong>Arrival:</strong> ${arrivalInfo}
            </div>
          </div>
          <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); flex-wrap: wrap;">
            <span>✈️ ${flight.cabin}</span>
            <span>${durationInfo}</span>
            <span>${stopsInfo}</span>
          </div>
        </div>
        <div style="text-align: right; margin-left: 1rem;">
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">$${Math.round(flight.priceTotal)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">per person</div>
        </div>
      </div>
    </div>
  `;
  }).join('');

  preview.innerHTML = `
    <div style="padding: 1rem;">
      <h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">✈️ Select Your Flight</h3>
      ${flightsHTML}
    </div>
  `;
}

/**
 * Handle flight selection
 */
window.selectFlight = async function(flightId) {
  const flight = planningState.allFlights.find(f => f.id === flightId);
  if (!flight) return;

  planningState.selectedFlight = flight;
  planningState.step = 'hotels';

  // Highlight selected flight
  document.querySelectorAll('.flight-option').forEach(el => {
    el.style.borderColor = 'var(--border)';
    el.style.background = 'white';
  });
  event.target.closest('.flight-option').style.borderColor = 'var(--primary)';
  event.target.closest('.flight-option').style.background = 'var(--primary-light)';

  addChatMessage(`Great choice! ${flight.carrier} flight selected. Now let's find a hotel...`, 'assistant');

  // Fetch and display hotels
  await fetchAndDisplayHotels();
};

/**
 * Fetch and display hotel options
 */
async function fetchAndDisplayHotels() {
  try {
    const prefs = planningState.preferences;
    const startDate = prefs.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = prefs.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch real hotels from Hotelbeds API
    const response = await fetch('http://localhost:3001/api/trips/hotels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: prefs.destination,
        startDate,
        endDate,
        travelers: prefs.travelers || 1,
        budget: prefs.budget || 'mid'
      })
    });

    const data = await response.json();

    if (!data || !data.hotels || data.hotels.length === 0) {
      addChatMessage('Sorry, I couldn\'t find hotels. Using demo options...', 'assistant');
      planningState.allHotels = generateHotelOptions(prefs);
    } else {
      // Store real hotel data from API
      planningState.allHotels = data.hotels;
      console.log('Loaded', data.hotels.length, 'hotels from Hotelbeds');
    }

    displayHotelSelection(planningState.allHotels);

  } catch (error) {
    console.error('Error fetching hotels:', error);
    addChatMessage('Oops! Couldn\'t load hotels. Using demo options...', 'assistant');
    planningState.allHotels = generateHotelOptions(prefs);
    displayHotelSelection(planningState.allHotels);
  }
}

/**
 * Generate hotel options (mock data)
 */
function generateHotelOptions(prefs) {
  const hotels = [
    { name: 'Grand Plaza Hotel', neighborhood: 'City Center', rating: 9.2, pricePerNight: 180, accessibility: ['wheelchair_access', 'elevator_required', 'step_free'] },
    { name: 'Comfort Inn Downtown', neighborhood: 'Downtown', rating: 8.5, pricePerNight: 120, accessibility: ['wheelchair_access', 'step_free'] },
    { name: 'Luxury Heights Resort', neighborhood: 'Uptown', rating: 9.4, pricePerNight: 250, accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'service_animal_friendly', 'diabetes_support'] },
    { name: 'Budget Stay Central', neighborhood: 'City Center', rating: 7.8, pricePerNight: 85, accessibility: ['wheelchair_access'] },
    { name: 'Boutique Hotel Roma', neighborhood: 'Historic District', rating: 8.9, pricePerNight: 160, accessibility: ['wheelchair_access', 'step_free', 'hearing_assist'] }
  ];

  return hotels.map((h, i) => ({ ...h, id: `hotel-${i}` }));
}

/**
 * Display hotel selection cards
 */
function displayHotelSelection(hotels) {
  const preview = document.getElementById('plan-preview');

  const hotelsHTML = hotels.map(hotel => `
    <div class="hotel-option" onclick="selectHotel('${hotel.id}')" style="border: 2px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
        <div>
          <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">${hotel.name}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${hotel.neighborhood} • ⭐ ${hotel.rating}/10</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">$${hotel.pricePerNight}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">per night</div>
        </div>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
        ${hotel.accessibility.map(a => {
          const icons = { wheelchair_access: '♿', step_free: '🚶', elevator_required: '🛗', service_animal_friendly: '🐕‍🦺', diabetes_support: '🏥', hearing_assist: '🔊' };
          const labels = { wheelchair_access: 'Wheelchair', step_free: 'Step-free', elevator_required: 'Elevator', service_animal_friendly: 'Service Animals', diabetes_support: 'Fridge', hearing_assist: 'Hearing' };
          return `<span class="badge" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: #d1fae5; color: #065f46;">${icons[a]} ${labels[a]}</span>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  preview.innerHTML = `
    <div style="padding: 1rem;">
      <h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">🏨 Select Your Hotel</h3>
      ${hotelsHTML}
    </div>
  `;
}

/**
 * Handle hotel selection
 */
window.selectHotel = async function(hotelId) {
  const hotel = planningState.allHotels.find(h => h.id === hotelId);
  if (!hotel) return;

  planningState.selectedHotel = hotel;
  planningState.step = 'itinerary';

  // Highlight selected hotel
  document.querySelectorAll('.hotel-option').forEach(el => {
    el.style.borderColor = 'var(--border)';
    el.style.background = 'white';
  });
  event.target.closest('.hotel-option').style.borderColor = 'var(--primary)';
  event.target.closest('.hotel-option').style.background = 'var(--primary-light)';

  addChatMessage(`Perfect! ${hotel.name} selected. Creating your detailed itinerary...`, 'assistant');

  // Generate and display visual itinerary
  await generateAndDisplayItinerary();
};

/**
 * Generate and display the final itinerary
 */
async function generateAndDisplayItinerary() {
  const preview = document.getElementById('plan-preview');
  const prefs = planningState.preferences;
  const flight = planningState.selectedFlight;
  const hotel = planningState.selectedHotel;

  // Generate enhanced itinerary using TripAdvisor + OpenAI
  const itinerary = await generateEnhancedItinerary(prefs.destination, prefs.startDate, prefs.endDate, prefs);

  // Store itinerary in planning state for later saving
  planningState.itinerary = itinerary;

  // Calculate trip duration
  const start = new Date(prefs.startDate);
  const end = new Date(prefs.endDate);
  const tripDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

  const itineraryHTML = `
    <div style="padding: 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 700;">Your ${prefs.destination} Adventure</h2>
        <p style="margin: 0; color: var(--text-secondary);">${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''} • ${tripDays} day${tripDays > 1 ? 's' : ''}</p>
      </div>

      <!-- Selected Flight & Hotel Summary -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">✈️ ${flight.carrier}</div>
          ${flight.segments && flight.segments.length > 0 ? `
          <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
            <div><strong>Departure:</strong> ${flight.segments[0].from} ${formatDateTime(flight.segments[0].dep).date} ${formatDateTime(flight.segments[0].dep).time}</div>
            <div><strong>Arrival:</strong> ${flight.segments[flight.segments.length - 1].to} ${formatDateTime(flight.segments[flight.segments.length - 1].arr).date} ${formatDateTime(flight.segments[flight.segments.length - 1].arr).time}</div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">⏱️ ${Math.floor(flight.segments.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0) / 60)}h ${flight.segments.reduce((sum, seg) => sum + (seg.durationMinutes || 0), 0) % 60}m • ${flight.segments.length - 1 === 0 ? 'Direct' : `${flight.segments.length - 1} stop${flight.segments.length - 1 > 1 ? 's' : ''}`}</div>
          ` : `
          <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
            ${prefs.startDate} • ${flight.departureAirport} ${flight.departureTime} → ${flight.arrivalAirport} ${flight.arrivalTime}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">⏱️ ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m • ${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
          `}
          <div style="font-size: 0.875rem; color: var(--primary); font-weight: 600; margin-top: 0.25rem;">$${Math.round(flight.priceTotal)}</div>
        </div>
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">🏨 ${hotel.name}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${hotel.neighborhood} • ${hotel.rating}/10</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${prefs.startDate} to ${prefs.endDate} • ${tripDays} nights</div>
          <div style="font-size: 0.875rem; color: var(--primary); font-weight: 600; margin-top: 0.25rem;">$${hotel.pricePerNight}/night</div>
        </div>
      </div>

      <!-- Daily Itinerary -->
      <h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">📅 Your Itinerary</h3>
      ${itinerary.map((day, idx) => `
        <div style="border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; background: white;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.125rem;">${idx + 1}</div>
            <div>
              <div style="font-weight: 600; font-size: 1rem;">${day.title}</div>
              <div style="font-size: 0.813rem; color: var(--text-secondary);">Day ${idx + 1}</div>
            </div>
          </div>
          <div style="position: relative; width: 100%; height: 180px; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; ${day.highlightImage ? `background: url('${day.highlightImage}') center/cover no-repeat;` : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'}">
            <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); color: white;">
              <div style="font-weight: 600;">${day.highlight}</div>
            </div>
          </div>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem;">
            ${day.activities.map(activity => `
              <li style="display: flex; gap: 0.75rem;">
                <span style="font-size: 1.25rem;">${activity.icon}</span>
                <div>
                  <div style="font-weight: 500; font-size: 0.875rem;">${activity.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">${activity.time} • ${activity.description}</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}

      <!-- Save Button -->
      <button class="btn btn-primary" onclick="saveTrip()" style="width: 100%; padding: 1rem; font-size: 1rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save This Trip
      </button>
    </div>
  `;

  preview.innerHTML = itineraryHTML;
  addChatMessage('Your personalized itinerary is ready! Review it and click "Save This Trip" when you\'re happy with it.', 'assistant');
}

/**
 * Generate enhanced itinerary using TripAdvisor + OpenAI
 */
async function generateEnhancedItinerary(destination, startDate, endDate, preferences) {
  try {
    console.log('🚀 Calling enhanced itinerary API...');

    // Extract flight arrival/departure times
    const selectedFlight = planningState.selectedFlight;
    let flightInfo = null;

    if (selectedFlight) {
      const tripType = planningState.preferences?.tripType || 'round-trip';

      // Get arrival time (last segment arrival)
      const arrivalSegment = selectedFlight.segments[selectedFlight.segments.length - 1];
      const arrivalTime = arrivalSegment?.arr;

      // Get departure time (first segment departure) if round-trip
      const departureSegment = selectedFlight.segments[0];
      const departureTime = tripType === 'round-trip' ? departureSegment?.dep : null;

      flightInfo = {
        tripType: tripType,
        arrivalTime: arrivalTime,
        departureTime: departureTime
      };

      console.log('Flight info extracted:', flightInfo);
    }

    const response = await fetch('http://localhost:3001/api/trips/itinerary/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: destination,
        startDate: startDate,
        endDate: endDate,
        preferences: {
          accessibility: preferences.travelersProfiles?.flatMap(t => t.accessibilityNeeds || []) || [],
          vibe: ['cultural'], // Default vibe
          budget: preferences.budget || 'mid'
        },
        flightInfo: flightInfo
      })
    });

    if (!response.ok) {
      console.error('Enhanced itinerary API failed:', response.status);
      console.log('⚠️  Falling back to basic itinerary generation');
      return await generateMockItinerary(destination, startDate, endDate);
    }

    const data = await response.json();

    if (!data.success || !data.itinerary || data.itinerary.length === 0) {
      console.error('Invalid itinerary response');
      console.log('⚠️  Falling back to basic itinerary generation');
      return await generateMockItinerary(destination, startDate, endDate);
    }

    console.log('✅ Received enhanced itinerary with', data.itinerary.length, 'days');

    // Transform the API response to match our UI format
    const itinerary = data.itinerary.map((day, idx) => {
      // Fetch image for the day's highlight
      const highlightImage = getCuratedImage(day.activities[0]?.name || destination, destination);

      return {
        title: day.title || `Day ${idx + 1}`,
        date: day.date || '', // Add date field
        highlight: day.highlight || day.activities[0]?.name || `Explore ${destination}`,
        highlightImage: highlightImage,
        activities: day.activities.map(activity => ({
          icon: activity.icon || '🎯',
          name: activity.name,
          time: activity.time || '10:00 AM',
          description: activity.description || '',
          type: activity.type || 'cultural_site',
          accessibility: activity.accessibility || [],
          mapsLink: activity.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.name + ', ' + destination)}`
        }))
      };
    });

    return itinerary;

  } catch (error) {
    console.error('Error generating enhanced itinerary:', error);
    console.log('⚠️  Falling back to basic itinerary generation');
    return await generateMockItinerary(destination, startDate, endDate);
  }
}

/**
 * Generate itinerary with real experiences from the data folder
 */
async function generateMockItinerary(destination, startDate, endDate) {
  try {
    // Calculate number of days from date range
    const start = new Date(startDate || planningState.preferences?.startDate);
    const end = new Date(endDate || planningState.preferences?.endDate);
    const tripDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    console.log(`Generating itinerary for ${destination}: ${tripDays} days (${startDate} to ${endDate})`);

    // Fetch experiences for the destination
    let experiences = await fetchExperiencesForDestination(destination);

    console.log(`Fetched ${experiences?.length || 0} experiences for ${destination}`);

    if (!experiences || experiences.length === 0) {
      // Fallback to generic itinerary if no experiences found
      console.warn(`No experiences found for ${destination}, using fallback with ${tripDays} days`);
      return generateFallbackItinerary(destination, tripDays);
    }

    // Map activity type icons
    const typeIcons = {
      'market': '🛍️',
      'tour': '🚶',
      'restaurant': '🍽️',
      'trattoria': '🍝',
      'osteria': '🍷',
      'gelateria': '🍦',
      'cafe': '☕',
      'cultural_site': '🏛️',
      'museum': '🎨',
      'church': '⛪',
      'park': '🌳',
      'cultural_center': '🎭',
      'cinema': '🎬',
      'piazza': '🏰',
      'historic_site': '🏺'
    };

    // Get flight arrival time to adjust Day 1 schedule
    const flight = planningState.selectedFlight;
    const flightArrivalHour = flight?.arrivalTime ? parseInt(flight.arrivalTime.split(':')[0]) : 15;

    // Calculate activities per day (3 activities per day)
    const activitiesPerDay = 3;
    const totalActivities = tripDays * activitiesPerDay;

    // If we don't have enough experiences, generate more generic ones
    if (experiences.length < totalActivities) {
      console.log(`Only ${experiences.length} experiences available, need ${totalActivities}. Adding generic experiences...`);

      const additionalExperiences = generateGenericExperiences(
        destination,
        totalActivities - experiences.length
      );

      experiences = [...experiences, ...additionalExperiences];
      console.log(`Total experiences after adding generics: ${experiences.length}`);
    }

    // Select diverse experiences for the full trip
    const selectedExperiences = selectDiverseExperiences(experiences, totalActivities);

    // Group into days with smart timing
    const days = [];
    for (let dayIdx = 0; dayIdx < tripDays; dayIdx++) {
      const dayExperiences = selectedExperiences.slice(dayIdx * activitiesPerDay, (dayIdx + 1) * activitiesPerDay);

      // Fetch image for the day's highlight experience
      const highlightImage = await fetchImageForExperience(dayExperiences[0]?.name || destination, destination);

      // Generate realistic times based on day and activity type
      const activities = dayExperiences.map((exp, idx) => {
        let time;

        if (dayIdx === 0) {
          // Day 1: Adjust for flight arrival
          if (flightArrivalHour <= 12) {
            // Morning arrival: Start activities at 2 PM
            time = ['2:00 PM', '5:00 PM', '7:30 PM'][idx];
          } else if (flightArrivalHour <= 16) {
            // Afternoon arrival: Evening activities only
            time = ['6:00 PM', '8:00 PM', '9:30 PM'][idx];
          } else {
            // Evening arrival: Just dinner
            time = ['8:00 PM', '9:00 PM', '10:00 PM'][idx];
          }
        } else if (dayIdx === tripDays - 1) {
          // Last day: End by noon for checkout/departure
          time = ['8:00 AM', '10:00 AM', '11:30 AM'][idx];
        } else {
          // Regular days: Varied timing based on activity type
          if (exp.type === 'market') {
            time = ['8:30 AM', '9:00 AM', '9:30 AM'][idx];
          } else if (exp.type === 'restaurant' || exp.type === 'cafe') {
            time = ['12:30 PM', '7:00 PM', '8:00 PM'][idx];
          } else if (exp.type === 'museum' || exp.type === 'cultural_site') {
            time = ['10:00 AM', '2:00 PM', '3:30 PM'][idx];
          } else if (exp.type === 'tour') {
            time = ['9:00 AM', '2:30 PM', '4:00 PM'][idx];
          } else if (exp.type === 'park') {
            time = ['4:00 PM', '5:00 PM', '5:30 PM'][idx];
          } else {
            // Default times for other types
            time = ['10:00 AM', '2:00 PM', '6:00 PM'][idx];
          }
        }

        // Generate Google Maps link
        const mapsQuery = encodeURIComponent(`${exp.name}, ${destination}`);
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        return {
          icon: typeIcons[exp.type] || '🎯',
          name: exp.name,
          time: time || '10:00 AM',
          description: exp.description, // Full description, not truncated
          type: exp.type,
          accessibility: exp.accessibility_notes,
          mapsLink: mapsLink // Add Google Maps navigation link
        };
      });

      days.push({
        title: getDayTitle(dayIdx, tripDays),
        highlight: dayExperiences[0]?.name || `Explore ${destination}`,
        highlightImage: highlightImage,
        activities
      });
    }

    return days;
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return generateFallbackItinerary(destination, 3);
  }
}

/**
 * Fetch an image for an experience using multiple sources
 */
async function fetchImageForExperience(experienceName, destination) {
  try {
    // Get curated images based on destination and activity type
    return getCuratedImage(experienceName, destination);
  } catch (error) {
    console.error('Error fetching image:', error);
    // Return a default beautiful travel image
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop';
  }
}

/**
 * Get curated high-quality images from Unsplash with variety to avoid repetition
 */
function getCuratedImage(experienceName, destination) {
  const name = experienceName.toLowerCase();
  const dest = destination.toLowerCase();

  // Create a seed from the experience name for consistent but varied images
  const seed = experienceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Curated collections organized by destination and activity type
  // Each category has multiple images to avoid repetition

  // ===== PARIS SPECIFIC IMAGES =====
  if (dest.includes('paris')) {
    if (name.includes('market') || name.includes('marché')) {
      const markets = [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop'
      ];
      return markets[seed % markets.length];
    } else if (name.includes('food') || name.includes('culinary') || name.includes('restaurant') || name.includes('bistro') || name.includes('cafe')) {
      const food = [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop'
      ];
      return food[seed % food.length];
    } else if (name.includes('walking') || name.includes('tour') || name.includes('lgbtq')) {
      const streets = [
        'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&h=400&fit=crop'
      ];
      return streets[seed % streets.length];
    } else if (name.includes('museum') || name.includes('gallery') || name.includes('louvre')) {
      const museums = [
        'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&h=400&fit=crop'
      ];
      return museums[seed % museums.length];
    } else if (name.includes('eiffel')) {
      return 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=400&fit=crop';
    } else {
      const generic = [
        'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=400&fit=crop'
      ];
      return generic[seed % generic.length];
    }
  }

  // ===== ROME SPECIFIC IMAGES =====
  if (dest.includes('rome') || dest.includes('roma')) {
    if (name.includes('market') || name.includes('mercato') || name.includes('testaccio')) {
      const markets = [
        'https://images.unsplash.com/photo-1585155803089-7037f7ab140c?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=400&fit=crop'
      ];
      return markets[seed % markets.length];
    } else if (name.includes('food') || name.includes('culinary') || name.includes('trattoria') || name.includes('osteria') || name.includes('restaurant')) {
      const food = [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=800&h=400&fit=crop'
      ];
      return food[seed % food.length];
    } else if (name.includes('colosseum') || name.includes('colosseo')) {
      const colosseum = [
        'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1548585744-6e6bf2c0b1c8?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&h=400&fit=crop'
      ];
      return colosseum[seed % colosseum.length];
    } else if (name.includes('vatican') || name.includes('church') || name.includes('cathedral') || name.includes('basilica')) {
      const churches = [
        'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1583103922203-7f8cbb413511?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1588453862014-cd1a9ad06a12?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1591786461346-9a4c98c48c9d?w=800&h=400&fit=crop'
      ];
      return churches[seed % churches.length];
    } else if (name.includes('walking') || name.includes('tour') || name.includes('trastevere') || name.includes('ghetto')) {
      const streets = [
        'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=800&h=400&fit=crop'
      ];
      return streets[seed % streets.length];
    } else if (name.includes('fountain') || name.includes('trevi')) {
      return 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&h=400&fit=crop';
    } else if (name.includes('park') || name.includes('garden') || name.includes('villa')) {
      const parks = [
        'https://images.unsplash.com/photo-1541480601022-2308c0f02487?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800&h=400&fit=crop'
      ];
      return parks[seed % parks.length];
    } else if (name.includes('museum') || name.includes('gallery')) {
      const museums = [
        'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=400&fit=crop'
      ];
      return museums[seed % museums.length];
    } else {
      const generic = [
        'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&h=400&fit=crop'
      ];
      return generic[seed % generic.length];
    }
  }

  // ===== GENERIC FALLBACKS BY ACTIVITY TYPE =====
  if (name.includes('market')) {
    const markets = [
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop'
    ];
    return markets[seed % markets.length];
  } else if (name.includes('food') || name.includes('restaurant') || name.includes('dining') || name.includes('cafe')) {
    const restaurants = [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=400&fit=crop'
    ];
    return restaurants[seed % restaurants.length];
  } else if (name.includes('museum') || name.includes('gallery')) {
    const museums = [
      'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&h=400&fit=crop'
    ];
    return museums[seed % museums.length];
  } else if (name.includes('park') || name.includes('garden')) {
    const parks = [
      'https://images.unsplash.com/photo-1541480601022-2308c0f02487?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1587974928442-77dc3e6dba72?w=800&h=400&fit=crop'
    ];
    return parks[seed % parks.length];
  } else if (name.includes('church') || name.includes('cathedral') || name.includes('basilica')) {
    const churches = [
      'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1583103922203-7f8cbb413511?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1588453862014-cd1a9ad06a12?w=800&h=400&fit=crop'
    ];
    return churches[seed % churches.length];
  } else if (name.includes('walking') || name.includes('tour')) {
    const tours = [
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800&h=400&fit=crop'
    ];
    return tours[seed % tours.length];
  } else {
    // Generic travel images
    const generic = [
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&h=400&fit=crop'
    ];
    return generic[seed % generic.length];
  }
}

/**
 * Generate additional experiences using AI when database doesn't have enough
 */
async function generateAIExperiences(destination, count, preferences) {
  try {
    // Call backend API to generate experiences using AI
    const response = await fetch('/api/itinerary/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: destination,
        days: Math.ceil(count / 3), // Convert activity count to days
        preferences: {
          interests: ['museums', 'food'], // From user message "love museums and food"
          budget: preferences.budget || 'mid',
          accessibility_needs: []
        },
        travelers: preferences.travelers || 2
      })
    });

    if (!response.ok) {
      console.error('AI experience generation failed:', response.status);
      return generateGenericExperiences(destination, count);
    }

    const data = await response.json();

    // Transform API response to experience format
    const aiExperiences = [];
    if (data.itinerary && data.itinerary.days) {
      for (const day of data.itinerary.days) {
        for (const activity of day.activities) {
          aiExperiences.push({
            name: activity.title || activity.name,
            description: activity.description,
            type: inferTypeFromActivity(activity),
            city: destination,
            accessibility_notes: activity.accessibility_info || 'Please check with venue'
          });
        }
      }
    }

    return aiExperiences.slice(0, count);
  } catch (error) {
    console.error('Error generating AI experiences:', error);
    return generateGenericExperiences(destination, count);
  }
}

/**
 * Infer experience type from activity details
 */
function inferTypeFromActivity(activity) {
  const title = (activity.title || activity.name || '').toLowerCase();

  if (title.includes('museum') || title.includes('gallery')) return 'museum';
  if (title.includes('market')) return 'market';
  if (title.includes('restaurant') || title.includes('dining')) return 'restaurant';
  if (title.includes('cafe') || title.includes('coffee')) return 'cafe';
  if (title.includes('tour') || title.includes('walk')) return 'tour';
  if (title.includes('park') || title.includes('garden')) return 'park';
  if (title.includes('church') || title.includes('cathedral')) return 'church';

  return 'cultural_site';
}

/**
 * Generate generic experiences when AI fails
 */
function generateGenericExperiences(destination, count) {
  const genericTypes = [
    { name: `${destination} City Museum`, type: 'museum', description: 'Explore the city\'s rich history and culture through fascinating exhibits' },
    { name: `Local Food Market`, type: 'market', description: 'Browse fresh local produce and artisanal goods at the neighborhood market' },
    { name: `Traditional Restaurant`, type: 'restaurant', description: 'Enjoy authentic local cuisine at a family-owned restaurant' },
    { name: `Historic Walking Tour`, type: 'tour', description: 'Discover the city\'s historic landmarks with a knowledgeable local guide' },
    { name: `Art Gallery Visit`, type: 'cultural_site', description: 'Admire contemporary and classical art at the city\'s premier gallery' },
    { name: `City Park`, type: 'park', description: 'Relax in beautiful green spaces and gardens in the heart of the city' },
    { name: `Local Cafe`, type: 'cafe', description: 'Experience local coffee culture at a charming neighborhood cafe' },
    { name: `Cathedral Visit`, type: 'church', description: 'Marvel at stunning architecture at the city\'s historic cathedral' },
    { name: `Culinary Tour`, type: 'tour', description: 'Sample local specialties and learn about the city\'s food culture' },
    { name: `Contemporary Art Museum`, type: 'museum', description: 'Discover modern and contemporary art from local and international artists' },
    { name: `Botanical Garden`, type: 'park', description: 'Stroll through beautifully landscaped gardens featuring diverse plant collections' },
    { name: `Street Food Experience`, type: 'restaurant', description: 'Taste authentic street food and local snacks from popular vendors' }
  ];

  const experiences = [];
  for (let i = 0; i < count; i++) {
    const template = genericTypes[i % genericTypes.length];
    experiences.push({
      ...template,
      city: destination,
      accessibility_notes: 'Wheelchair accessible, please confirm with venue'
    });
  }

  return experiences;
}

/**
 * Fetch experiences from the backend for a given destination
 */
async function fetchExperiencesForDestination(destination) {
  try {
    // Normalize destination name
    const normalizedDest = destination.toLowerCase().trim();

    // Map to file names
    const cityMap = {
      'rome': { country: 'italy', city: 'rome', file: 'italy.json' },
      'paris': { country: 'france', city: 'paris', file: 'france.json' },
      'milan': { country: 'italy', city: 'milan', file: 'italy.json' },
      'florence': { country: 'italy', city: 'florence', file: 'italy.json' },
      'venice': { country: 'italy', city: 'venice', file: 'italy.json' },
      'naples': { country: 'italy', city: 'naples', file: 'italy.json' },
      'lyon': { country: 'france', city: 'lyon', file: 'france.json' },
      'marseille': { country: 'france', city: 'marseille', file: 'france.json' },
      'nice': { country: 'france', city: 'nice', file: 'france.json' }
    };

    const mapping = cityMap[normalizedDest];
    if (!mapping) {
      console.warn(`No experience data for ${destination}`);
      return [];
    }

    // Fetch the experiences JSON file
    const region = mapping.country === 'italy' || mapping.country === 'france' ? 'europe' : 'north-america';
    const response = await fetch(`/data/experiences/${region}/${mapping.file}`);

    if (!response.ok) {
      console.error(`Failed to fetch experiences: ${response.status}`);
      return [];
    }

    const allExperiences = await response.json();

    // Filter experiences for the specific city
    const cityExperiences = allExperiences.filter(exp =>
      exp.city?.toLowerCase() === mapping.city
    );

    return cityExperiences;
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return [];
  }
}

/**
 * Select diverse experiences (different types) for better itinerary
 */
function selectDiverseExperiences(experiences, count) {
  if (experiences.length <= count) {
    return experiences;
  }

  const selected = [];
  const usedTypes = new Set();

  // First pass: Pick one of each type
  for (const exp of experiences) {
    if (!usedTypes.has(exp.type)) {
      selected.push(exp);
      usedTypes.add(exp.type);
      if (selected.length >= count) break;
    }
  }

  // Second pass: Fill remaining slots with any experiences
  if (selected.length < count) {
    for (const exp of experiences) {
      if (!selected.includes(exp)) {
        selected.push(exp);
        if (selected.length >= count) break;
      }
    }
  }

  return selected;
}

/**
 * Get day title based on index and total days
 */
function getDayTitle(dayIdx, totalDays) {
  // For trips of any length, create appropriate titles
  if (dayIdx === 0) {
    return 'Arrival & Discovery';
  } else if (dayIdx === totalDays - 1) {
    return 'Final Day & Departure';
  } else if (dayIdx === 1) {
    return 'Cultural Immersion';
  } else if (dayIdx === 2) {
    return 'Local Experiences';
  } else if (dayIdx === 3) {
    return 'Hidden Gems';
  } else if (dayIdx === 4) {
    return 'Adventures Continue';
  } else {
    return `Day ${dayIdx + 1} Exploration`;
  }
}

/**
 * Fallback generic itinerary when no experiences available
 */
function generateFallbackItinerary(destination, tripDays = 3) {
  const genericActivities = [
    [
      { icon: '✈️', name: 'Airport Arrival', time: '10:00 AM', description: 'Land and clear customs' },
      { icon: '🏨', name: 'Hotel Check-in', time: '12:00 PM', description: 'Settle into your accessible room' },
      { icon: '🍽️', name: 'Welcome Dinner', time: '7:00 PM', description: 'Local cuisine at nearby restaurant' }
    ],
    [
      { icon: '🏛️', name: 'Museum Visit', time: '9:30 AM', description: 'Guided accessible tour' },
      { icon: '☕', name: 'Café Break', time: '12:00 PM', description: 'Rest and refreshments' },
      { icon: '🎭', name: 'Art Gallery', time: '3:00 PM', description: 'Contemporary art exhibition' }
    ],
    [
      { icon: '🛍️', name: 'Market Tour', time: '10:00 AM', description: 'Local crafts and souvenirs' },
      { icon: '🍕', name: 'Cooking Class', time: '2:00 PM', description: 'Learn traditional recipes' },
      { icon: '🌆', name: 'Sunset Views', time: '6:00 PM', description: 'Accessible viewpoint' }
    ],
    [
      { icon: '🎨', name: 'Art Workshop', time: '10:00 AM', description: 'Create local art' },
      { icon: '🍷', name: 'Wine Tasting', time: '2:00 PM', description: 'Sample local wines' },
      { icon: '🎵', name: 'Live Music', time: '7:00 PM', description: 'Experience local music scene' }
    ],
    [
      { icon: '🚶', name: 'Walking Tour', time: '9:00 AM', description: 'Explore historic neighborhoods' },
      { icon: '🍜', name: 'Food Tour', time: '1:00 PM', description: 'Taste local specialties' },
      { icon: '🌃', name: 'Night Views', time: '8:00 PM', description: 'City lights from scenic viewpoint' }
    ]
  ];

  const days = [];
  for (let i = 0; i < tripDays; i++) {
    days.push({
      title: getDayTitle(i, tripDays),
      highlight: `Explore ${destination}`,
      activities: genericActivities[i % genericActivities.length]
    });
  }

  return days;
}

/**
 * Save the trip
 */
window.saveTrip = async function() {
  try {
    if (!currentUser) {
      alert('Please sign in to save your trip');
      return;
    }

    const prefs = planningState.preferences;
    const selectedFlight = planningState.selectedFlight;
    const selectedHotel = planningState.selectedHotel;
    const itinerary = planningState.itinerary;

    if (!prefs || !selectedFlight || !selectedHotel) {
      alert('Please complete all trip planning steps before saving');
      return;
    }

    // Calculate duration from dates
    const start = new Date(prefs.startDate);
    const end = new Date(prefs.endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Generate itinerary from the displayed UI if not already stored
    const tripItinerary = itinerary || await generateEnhancedItinerary(prefs.destination, prefs.startDate, prefs.endDate, prefs);
    planningState.itinerary = tripItinerary;

    const tripData = {
      user_id: currentUser.uid,
      origin: prefs.origin,
      destination: prefs.destination,
      start_date: prefs.startDate,
      end_date: prefs.endDate,
      duration: duration,
      conditions: [],
      preferences: [],
      solo_travel: prefs.travelers === 1,

      // Save only the SELECTED flight (not all options)
      selected_flight: selectedFlight,

      // Save only the SELECTED hotel (not all options)
      selected_hotel: selectedHotel,

      // Save the complete day-by-day itinerary
      itinerary: tripItinerary,

      status: 'planned',
      created_at: new Date().toISOString()
    };

    addChatMessage('Saving your trip...', 'assistant');

    // Save directly to Firebase using the trips collection
    const response = await fetch('/api/trips/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData)
    });

    if (!response.ok) {
      throw new Error('Failed to save trip');
    }

    const result = await response.json();

    if (result.success || result.id) {
      addChatMessage('🎉 Trip saved successfully! You can view it in your trips dashboard.', 'assistant');
      planningState.step = 'saved';

      // Refresh trips list
      setTimeout(() => {
        loadUserTrips();
        closeTripWizard();
      }, 2000);
    } else {
      addChatMessage(`Oops! Couldn't save the trip: ${result.error || 'Unknown error'}`, 'assistant');
    }
  } catch (error) {
    console.error('Error saving trip:', error);
    addChatMessage('Error saving trip. Please try again.', 'assistant');
  }
};

/**
 * Helper: Add message to chat
 */
function addChatMessage(text, role) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    display: flex;
    justify-content: ${role === 'user' ? 'flex-start' : 'flex-end'};
    margin-bottom: 1rem;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    white-space: pre-line;
    line-height: 1.5;
    ${role === 'user'
      ? 'background: white; border: 1px solid var(--border); color: var(--text-primary);'
      : 'background: var(--primary); color: white;'}
  `;
  content.textContent = text;

  bubble.appendChild(content);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// Export for use in dashboard
window.handleChatSubmit = handleChatSubmit;
