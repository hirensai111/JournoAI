/**
 * Amadeus Flight API Adapter
 * @module lib/trips/adapters/amadeus
 */

import Amadeus from 'amadeus';

const flightCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds only for development

let amadeusClient = null;

function getAmadeusClient() {
  if (!amadeusClient) {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('Amadeus credentials not configured. Using mock data.');
      return null;
    }

    amadeusClient = new Amadeus({
      clientId,
      clientSecret,
      hostname: process.env.AMADEUS_HOSTNAME || 'test'
    });
  }
  return amadeusClient;
}

/**
 * Search flights using Amadeus API
 * @param {import('../types.js').TripPrefs} prefs
 * @returns {Promise<import('../types.js').FlightOption[]>}
 */
export async function searchFlights(prefs) {
  const cacheKey = `${prefs.origin}-${prefs.destination}-${prefs.startDate}-${prefs.endDate}-${prefs.travelers}-${prefs.budget}`;

  const cached = flightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('⚡ Returning cached flight results (cache expires in', Math.round((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000), 'seconds)');
    return cached.data;
  }

  console.log('🔍 Fetching fresh flight results:', prefs.origin, '→', prefs.destination);

  const client = getAmadeusClient();
  
  if (!client) {
    const mockFlights = generateMockFlights(prefs);
    flightCache.set(cacheKey, { data: mockFlights, timestamp: Date.now() });
    return mockFlights;
  }

  try {
    const cabinClass = getCabinClass(prefs.budget);
    
    const response = await client.shopping.flightOffersSearch.get({
      originLocationCode: extractIATACode(prefs.origin),
      destinationLocationCode: extractIATACode(prefs.destination),
      departureDate: prefs.startDate,
      returnDate: prefs.endDate,
      adults: prefs.travelers,
      travelClass: cabinClass,
      max: 10,
      currencyCode: 'USD'
    });

    const flights = response.data.map(offer => normalizeAmadeusOffer(offer));
    
    flightCache.set(cacheKey, { data: flights, timestamp: Date.now() });
    
    return flights;
  } catch (error) {
    console.error('Amadeus API error:', error.message);
    const mockFlights = generateMockFlights(prefs);
    return mockFlights;
  }
}

function normalizeAmadeusOffer(offer) {
  const itinerary = offer.itineraries[0];
  const segments = itinerary.segments.map(seg => ({
    from: seg.departure.iataCode,
    to: seg.arrival.iataCode,
    dep: seg.departure.at,
    arr: seg.arrival.at,
    durationMinutes: parseDuration(seg.duration),
    carrierCode: seg.carrierCode // Include carrier code in segments
  }));

  // Get carrier code from first segment or validating airline codes
  const carrierCode = itinerary.segments[0]?.carrierCode || offer.validatingAirlineCodes?.[0] || 'Unknown';
  const cabin = itinerary.segments[0]?.cabin || 'ECONOMY';

  return {
    id: offer.id || `flight-${Date.now()}-${Math.random()}`,
    carrier: getAirlineName(carrierCode),
    carrierCode: carrierCode, // Keep original code for reference
    segments,
    cabin: normalizeCabin(cabin),
    priceTotal: parseFloat(offer.price.total),
    currency: offer.price.currency,
    deeplink: offer.self?.href || undefined,
    score: 0
  };
}

function extractIATACode(location) {
  const match = location.match(/\(([A-Z]{3})\)/);
  if (match) return match[1];
  
  const cityToIATA = {
    'new york': 'JFK',
    'boston': 'BOS',
    'washington': 'IAD',
    'los angeles': 'LAX',
    'san francisco': 'SFO',
    'chicago': 'ORD',
    'miami': 'MIA',
    'paris': 'CDG',
    'london': 'LHR',
    'rome': 'FCO',
    'barcelona': 'BCN',
    'tokyo': 'NRT',
    'dubai': 'DXB',
    'singapore': 'SIN'
  };
  
  const normalized = location.toLowerCase().trim();
  return cityToIATA[normalized] || 'JFK';
}

function getCabinClass(budget) {
  const mapping = {
    budget: 'ECONOMY',
    mid: 'PREMIUM_ECONOMY',
    premium: 'BUSINESS'
  };
  return mapping[budget] || 'ECONOMY';
}

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return 0;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  return hours * 60 + minutes;
}

function normalizeCabin(cabin) {
  const upper = cabin.toUpperCase();
  if (upper.includes('FIRST')) return 'FIRST';
  if (upper.includes('BUSINESS')) return 'BUSINESS';
  if (upper.includes('PREMIUM')) return 'PREMIUM_ECONOMY';
  return 'ECONOMY';
}

function getAirlineName(code) {
  const airlines = {
    // North American Carriers
    'AA': 'American Airlines',
    'UA': 'United Airlines',
    'DL': 'Delta Air Lines',
    'AC': 'Air Canada',
    'WN': 'Southwest Airlines',
    'B6': 'JetBlue Airways',
    'AS': 'Alaska Airlines',
    'NK': 'Spirit Airlines',
    'F9': 'Frontier Airlines',

    // European Carriers
    'BA': 'British Airways',
    'AF': 'Air France',
    'LH': 'Lufthansa',
    'LX': 'Swiss International Air Lines',
    'KL': 'KLM Royal Dutch Airlines',
    'IB': 'Iberia',
    'AZ': 'ITA Airways',
    'OS': 'Austrian Airlines',
    'SN': 'Brussels Airlines',
    'TP': 'TAP Air Portugal',
    'AY': 'Finnair',
    'SK': 'Scandinavian Airlines',
    'LO': 'LOT Polish Airlines',

    // Middle Eastern Carriers
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'EY': 'Etihad Airways',
    'TK': 'Turkish Airlines',

    // Asian Carriers
    'SQ': 'Singapore Airlines',
    'ANA': 'All Nippon Airways',
    'JAL': 'Japan Airlines',
    'CX': 'Cathay Pacific',
    'NH': 'All Nippon Airways',
    'TG': 'Thai Airways',
    'KE': 'Korean Air',
    'CI': 'China Airlines',

    // Oceania Carriers
    'QF': 'Qantas',
    'NZ': 'Air New Zealand',

    // Latin American Carriers
    'LA': 'LATAM Airlines',
    'AM': 'Aeromexico',
    'AV': 'Avianca',
    'CM': 'Copa Airlines'
  };
  return airlines[code] || code;
}

function generateMockFlights(prefs) {
  const carriers = ['United Airlines', 'Delta Air Lines', 'American Airlines', 'British Airways'];
  const flights = [];
  
  const origin = extractIATACode(prefs.origin);
  const dest = extractIATACode(prefs.destination);
  
  for (let i = 0; i < 10; i++) {
    const stops = i % 3;
    const basePrice = prefs.budget === 'budget' ? 450 : prefs.budget === 'mid' ? 850 : 1500;
    const price = basePrice + Math.random() * 300;
    
    const segments = [];
    const totalDuration = 300 + stops * 120 + Math.random() * 240;
    
    if (stops === 0) {
      segments.push({
        from: origin,
        to: dest,
        dep: prefs.startDate + 'T08:00:00',
        arr: prefs.startDate + 'T14:30:00',
        durationMinutes: totalDuration
      });
    } else if (stops === 1) {
      const hub = 'ORD';
      segments.push({
        from: origin,
        to: hub,
        dep: prefs.startDate + 'T08:00:00',
        arr: prefs.startDate + 'T11:00:00',
        durationMinutes: 180
      });
      segments.push({
        from: hub,
        to: dest,
        dep: prefs.startDate + 'T13:30:00',
        arr: prefs.startDate + 'T20:00:00',
        durationMinutes: totalDuration - 180
      });
    }
    
    flights.push({
      id: `mock-flight-${i}`,
      carrier: carriers[i % carriers.length],
      segments,
      cabin: prefs.budget === 'premium' ? 'BUSINESS' : stops === 0 ? 'PREMIUM_ECONOMY' : 'ECONOMY',
      priceTotal: Math.round(price),
      currency: 'USD',
      deeplink: undefined, // Will be provided by Amadeus API when configured
      score: 0
    });
  }
  
  return flights;
}

