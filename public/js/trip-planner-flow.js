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

  // Parse the message
  const prefs = parseTripMessage(text);

  if (!prefs.origin || !prefs.destination) {
    addChatMessage('I need more details! Please tell me where you\'re traveling FROM and TO. For example: "Book me a budget trip for 2 people from Austin to Rome"', 'assistant');
    return;
  }

  planningState.preferences = prefs;

  // Confirm and show flight options
  addChatMessage(`Perfect! Planning a ${prefs.budget} trip for ${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''} from ${prefs.origin} to ${prefs.destination}.\n\nSearching for flights...`, 'assistant');

  // Fetch flights
  await fetchAndDisplayFlights(prefs);
}

/**
 * Parse natural language trip request
 */
function parseTripMessage(text) {
  const lower = text.toLowerCase();

  const prefs = {
    origin: null,
    destination: null,
    travelers: 2,
    budget: 'mid',
    startDate: null,
    endDate: null
  };

  // Extract origin (from X)
  const fromMatch = lower.match(/from\s+([a-z\s]+?)(?:\s+to|\s+for|\s+in|$)/i);
  if (fromMatch) {
    prefs.origin = fromMatch[1].trim();
  }

  // Extract destination (to X)
  const toMatch = lower.match(/to\s+([a-z\s]+?)(?:\s+for|\s+in|\s+on|$)/i);
  if (toMatch) {
    prefs.destination = toMatch[1].trim();
  }

  // Extract travelers
  const travelersMatch = lower.match(/(\d+)\s*(?:people|person|traveler|pax)/);
  if (travelersMatch) {
    prefs.travelers = parseInt(travelersMatch[1]);
  }

  // Extract budget
  if (/budget|cheap|affordable|economy/i.test(lower)) {
    prefs.budget = 'budget';
  } else if (/premium|luxury|business|first\s*class/i.test(lower)) {
    prefs.budget = 'premium';
  }

  // Extract dates if provided (format: Oct 31 to Nov 6 or 2025-10-31 to 2025-11-06)
  const dateMatch = text.match(/(\w+\s+\d+|\d{4}-\d{2}-\d{2})\s+to\s+(\w+\s+\d+|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    prefs.startDate = dateMatch[1];
    prefs.endDate = dateMatch[2];
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

    const response = await fetch('http://localhost:3001/api/trips/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: prefs.origin,
        destination: prefs.destination,
        startDate,
        endDate,
        travelers: prefs.travelers,
        budget: prefs.budget,
        vibe: ['mixed'],
        travelersProfiles: []
      })
    });

    const plan = await response.json();

    if (!plan || !plan.flight) {
      addChatMessage('Sorry, I couldn\'t find flights. Please try again with different details.', 'assistant');
      return;
    }

    // Store flight data (in real scenario, we'd get multiple flights from API)
    planningState.allFlights = generateFlightOptions(plan.flight, prefs);
    planningState.step = 'flights';

    // Display flight selection UI
    displayFlightSelection(planningState.allFlights);

    addChatMessage(`Found ${planningState.allFlights.length} flights! Choose your preferred option:`, 'assistant');

  } catch (error) {
    console.error('Error fetching flights:', error);
    addChatMessage('Oops! Something went wrong. Please try again.', 'assistant');
  }
}

/**
 * Generate multiple flight options (mock for now, will be replaced with real API data)
 */
function generateFlightOptions(baseFlight, prefs) {
  const flights = [];
  const carriers = ['American Airlines', 'United Airlines', 'Delta', 'Southwest'];
  const cabins = prefs.budget === 'premium' ? ['BUSINESS', 'FIRST'] : ['ECONOMY', 'PREMIUM_ECONOMY'];

  for (let i = 0; i < 5; i++) {
    const price = baseFlight.priceTotal + (Math.random() * 400 - 200);
    const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;

    flights.push({
      id: `flight-${i}`,
      carrier: carriers[i % carriers.length],
      cabin: cabins[Math.floor(Math.random() * cabins.length)],
      stops,
      priceTotal: Math.round(price),
      currency: 'USD',
      departureAirport: baseFlight.segments[0]?.from || 'AUS',
      arrivalAirport: baseFlight.segments[baseFlight.segments.length - 1]?.to || 'FCO',
      duration: baseFlight.segments.reduce((sum, seg) => sum + (seg.durationMinutes || 120), 0) + stops * 60
    });
  }

  return flights.sort((a, b) => a.priceTotal - b.priceTotal);
}

/**
 * Display flight selection cards in the plan preview
 */
function displayFlightSelection(flights) {
  const preview = document.getElementById('plan-preview');

  const flightsHTML = flights.map(flight => `
    <div class="flight-option" onclick="selectFlight('${flight.id}')" style="border: 2px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
        <div>
          <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">${flight.carrier}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${flight.departureAirport} → ${flight.arrivalAirport}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">$${flight.priceTotal}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">per person</div>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; font-size: 0.813rem; color: var(--text-secondary);">
        <span>✈️ ${flight.cabin}</span>
        <span>⏱️ ${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m</span>
        <span>${flight.stops === 0 ? '🎯 Direct' : `🔄 ${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
      </div>
    </div>
  `).join('');

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

    // For now, generate mock hotels (replace with real API call)
    planningState.allHotels = generateHotelOptions(prefs);

    displayHotelSelection(planningState.allHotels);

  } catch (error) {
    console.error('Error fetching hotels:', error);
    addChatMessage('Oops! Couldn\'t load hotels. Please try again.', 'assistant');
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

  // Generate mock itinerary (replace with real API call)
  const itinerary = generateMockItinerary(prefs.destination);

  const itineraryHTML = `
    <div style="padding: 1.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 700;">Your ${prefs.destination} Adventure</h2>
        <p style="margin: 0; color: var(--text-secondary);">${prefs.travelers} traveler${prefs.travelers > 1 ? 's' : ''} • 7 days</p>
      </div>

      <!-- Selected Flight & Hotel Summary -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">✈️ ${flight.carrier}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${flight.departureAirport} → ${flight.arrivalAirport}</div>
          <div style="font-size: 0.875rem; color: var(--primary); font-weight: 600; margin-top: 0.25rem;">$${flight.priceTotal}</div>
        </div>
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">🏨 ${hotel.name}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary);">${hotel.neighborhood} • ${hotel.rating}/10</div>
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
          <div style="position: relative; width: 100%; height: 180px; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
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
 * Generate mock itinerary
 */
function generateMockItinerary(destination) {
  return [
    {
      title: 'Arrival & Welcome',
      highlight: `Welcome to ${destination}`,
      activities: [
        { icon: '✈️', name: 'Airport Arrival', time: '10:00 AM', description: 'Land and clear customs' },
        { icon: '🏨', name: 'Hotel Check-in', time: '12:00 PM', description: 'Settle into your accessible room' },
        { icon: '🍽️', name: 'Welcome Dinner', time: '7:00 PM', description: 'Local cuisine at nearby restaurant' }
      ]
    },
    {
      title: 'Cultural Exploration',
      highlight: 'Discover the city\'s rich history',
      activities: [
        { icon: '🏛️', name: 'Museum Visit', time: '9:30 AM', description: 'Guided accessible tour' },
        { icon: '☕', name: 'Café Break', time: '12:00 PM', description: 'Rest and refreshments' },
        { icon: '🎭', name: 'Art Gallery', time: '3:00 PM', description: 'Contemporary art exhibition' }
      ]
    },
    {
      title: 'Local Experiences',
      highlight: 'Authentic local adventures',
      activities: [
        { icon: '🛍️', name: 'Market Tour', time: '10:00 AM', description: 'Local crafts and souvenirs' },
        { icon: '🍕', name: 'Cooking Class', time: '2:00 PM', description: 'Learn traditional recipes' },
        { icon: '🌆', name: 'Sunset Views', time: '6:00 PM', description: 'Accessible viewpoint' }
      ]
    }
  ];
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

    const tripData = {
      user_id: currentUser.uid,
      destination: planningState.preferences.destination,
      start_date: planningState.preferences.startDate || new Date().toISOString().split('T')[0],
      duration: 7,
      conditions: [],
      preferences: [],
      solo_travel: planningState.preferences.travelers === 1,
      flights: {
        outbound: [planningState.selectedFlight]
      },
      hotels: [planningState.selectedHotel],
      status: 'confirmed'
    };

    addChatMessage('Saving your trip...', 'assistant');

    const response = await fetch('/api/trip/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData)
    });

    const result = await response.json();

    if (result.success) {
      addChatMessage('🎉 Trip saved successfully! You can view it in your trips dashboard.', 'assistant');
      planningState.step = 'saved';

      // Refresh trips list
      setTimeout(() => {
        loadUserTrips();
        closeTripWizard();
      }, 2000);
    } else {
      addChatMessage('Oops! Couldn\'t save the trip. Please try again.', 'assistant');
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
