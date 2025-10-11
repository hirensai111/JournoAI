import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Health Check
async function testHealthCheck() {
  logSection('TEST 1: Health Check');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    logSuccess('Health check passed');
    logInfo(`Status: ${response.data.status}`);
    logInfo(`Uptime: ${Math.floor(response.data.uptime)}s`);
    return true;
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

// Test 2: Database Statistics
async function testDatabaseStats() {
  logSection('TEST 2: Database Statistics');
  try {
    const response = await axios.get(`${API_BASE}/stats`);
    logSuccess('Database stats retrieved');
    console.log(JSON.stringify(response.data, null, 2));
    logInfo(`Total Experiences: ${response.data.total_experiences}`);
    logInfo(`Countries: ${response.data.countries}`);
    logInfo(`Cities: ${response.data.cities}`);
    return true;
  } catch (error) {
    logError(`Stats retrieval failed: ${error.message}`);
    return false;
  }
}

// Test 3: Search Experiences by Country
async function testExperiencesByCountry() {
  logSection('TEST 3: Filter Experiences by Country (France)');
  try {
    const response = await axios.get(`${API_BASE}/experiences`, {
      params: { country: 'France' }
    });
    logSuccess('Experience filtering by country works');
    logInfo(`Found ${response.data.total} experiences in France`);

    // Check if experiences exist and is an array
    if (response.data.experiences && Array.isArray(response.data.experiences) && response.data.experiences.length > 0) {
      log('\nSample Experience:', 'yellow');
      const sample = response.data.experiences[0];
      console.log(`  Name: ${sample.name}`);
      console.log(`  City: ${sample.city}`);
      console.log(`  Type: ${sample.type}`);
      console.log(`  Description: ${sample.description.substring(0, 150)}...`);
    } else {
      logInfo('No experiences array in response or empty array');
    }
    return true;
  } catch (error) {
    logError(`Experience filtering failed: ${error.message}`);
    console.error('Response data:', error.response?.data);
    return false;
  }
}

// Test 4: Get Specific Experience
async function testGetSpecificExperience() {
  logSection('TEST 4: Get Specific Experience Details');
  try {
    // First get list of experiences
    const listResponse = await axios.get(`${API_BASE}/experiences`, {
      params: { country: 'France', city: 'Paris' }
    });

    // Check if experiences array exists and has items
    // The response might be an array directly or wrapped in {experiences: []}
    let experiences = listResponse.data;
    if (listResponse.data.experiences && Array.isArray(listResponse.data.experiences)) {
      experiences = listResponse.data.experiences;
    } else if (!Array.isArray(experiences)) {
      logError('Unexpected response format');
      console.error('Response structure:', JSON.stringify(listResponse.data, null, 2));
      return false;
    }

    if (experiences.length === 0) {
      logError('No experiences found to test with');
      return false;
    }

    const experienceId = experiences[0].id;
    const response = await axios.get(`${API_BASE}/experiences/${experienceId}`);

    if (!response.data) {
      logError('Failed to retrieve experience details - no data');
      return false;
    }

    // Handle both response formats: { experience: {...} } or {...} directly
    let exp;
    if (response.data.experience) {
      exp = response.data.experience;
    } else if (response.data.id) {
      // Response is the experience object directly
      exp = response.data;
    } else {
      logError('Failed to retrieve experience details - unexpected format');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }

    logSuccess('Retrieved specific experience');
    console.log(`\nExperience Details:`);
    console.log(`  ID: ${exp.id}`);
    console.log(`  Name: ${exp.name}`);
    console.log(`  Location: ${exp.city}, ${exp.country}`);
    console.log(`  Type: ${exp.type}`);
    console.log(`  Price Range: ${exp.price_range || 'N/A'}`);
    console.log(`  Duration: ${exp.duration_hours || 'N/A'}`);
    console.log(`  Accessibility: ${exp.inclusion_tags?.join(', ') || 'N/A'}`);
    console.log(`  Dietary: ${exp.dietary_accommodations?.join(', ') || 'N/A'}`);
    return true;
  } catch (error) {
    logError(`Get specific experience failed: ${error.message}`);
    console.error('Error details:', error.response?.data);
    return false;
  }
}

// Test 5: Semantic Recommendation Search
async function testSemanticRecommendations() {
  logSection('TEST 5: AI-Powered Semantic Search for Paris Experiences');
  try {
    const response = await axios.post(`${API_BASE}/recommend`, {
      query: 'romantic dining with authentic French cuisine and art galleries',
      filters: {
        country: 'France',
        city: 'Paris',
        accessibility_needs: ['wheelchair_accessible'],
        preferences: ['food_culinary', 'art_culture', 'romantic']
      },
      limit: 5
    });

    logSuccess('Semantic search completed');
    logInfo(`Query time: ${response.data.query_time_ms}ms`);
    logInfo(`Found ${response.data.total_results} recommendations`);

    log('\nTop Recommendations:', 'yellow');
    response.data.recommendations.forEach((rec, index) => {
      const exp = rec.experience;
      console.log(`\n${index + 1}. ${exp.name} (Score: ${rec.score.toFixed(3)})`);
      console.log(`   ${exp.city}, ${exp.country}`);
      console.log(`   ${exp.description.substring(0, 150)}...`);
      console.log(`   Tags: ${exp.preference_tags.join(', ')}`);
      console.log(`   Price: ${exp.price_range || 'N/A'} | Duration: ${exp.duration_hours || 'N/A'}`);
    });

    return true;
  } catch (error) {
    logError(`Semantic search failed: ${error.message}`);
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 6: Conversational AI Chat
async function testConversationalAI() {
  logSection('TEST 6: Conversational AI Trip Planning');
  const sessionId = `test-session-${Date.now()}`;

  const conversation = [
    "Hi! I'm planning a trip to Paris",
    "I'm interested in art, food, and romantic experiences",
    "I need wheelchair accessible places and I eat kosher food",
    "I prefer low to moderate activity levels"
  ];

  try {
    for (const message of conversation) {
      log(`\nUser: ${message}`, 'yellow');

      const response = await axios.post(`${API_BASE}/chat`, {
        message: message,
        session_id: sessionId
      });

      log(`AI: ${response.data.reply}\n`, 'green');

      if (response.data.preferences && Object.keys(response.data.preferences).length > 0) {
        logInfo('Extracted Preferences:');
        console.log(JSON.stringify(response.data.preferences, null, 2));
      }

      // Small delay between messages
      await delay(1000);
    }

    logSuccess('Conversational AI test completed');
    return true;
  } catch (error) {
    logError(`Conversational AI failed: ${error.message}`);
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 7: Airport Search
async function testAirportSearch() {
  logSection('TEST 7: Airport Search for Paris');
  try {
    const response = await axios.get(`${API_BASE}/airports/search`, {
      params: { q: 'Paris' }
    });

    logSuccess('Airport search completed');
    logInfo(`Found ${response.data.airports.length} airports`);

    log('\nAirports matching "Paris":', 'yellow');
    response.data.airports.forEach(airport => {
      console.log(`  ${airport.iataCode} - ${airport.name}`);
      console.log(`    ${airport.city}, ${airport.country}`);
    });

    return response.data.airports;
  } catch (error) {
    logError(`Airport search failed: ${error.message}`);
    return [];
  }
}

// Test 8: Flight Search (Main Test - 2 People to Paris on Nov 11)
async function testFlightSearch() {
  logSection('TEST 8: Flight Search - 2 People to Paris on November 11th');

  try {
    // First search for origin airport (assuming user is in US)
    log('\nSearching for departure airport (New York)...', 'blue');
    const originSearch = await axios.get(`${API_BASE}/airports/search`, {
      params: { q: 'New York JFK' }
    });
    const originAirport = originSearch.data.airports[0];
    logInfo(`Origin: ${originAirport.iataCode} - ${originAirport.name}`);

    // Search for destination airport (Paris)
    log('\nSearching for destination airport (Paris)...', 'blue');
    const destSearch = await axios.get(`${API_BASE}/airports/search`, {
      params: { q: 'Paris CDG' }
    });
    const destAirport = destSearch.data.airports[0];
    logInfo(`Destination: ${destAirport.iataCode} - ${destAirport.name}`);

    // Search for flights
    log('\nSearching for flights...', 'blue');
    const flightResponse = await axios.post(`${API_BASE}/flights/search`, {
      origin: originAirport.iataCode,
      destination: destAirport.iataCode,
      departureDate: '2025-11-11',
      returnDate: '2025-11-18',
      adults: 2,
      accessibility: ['wheelchair_accessible']
    });

    logSuccess('Flight search completed');
    logInfo(`Found ${flightResponse.data.total} flight options for 2 passengers`);

    log('\nFlight Options:', 'yellow');
    flightResponse.data.flights.forEach((flight, index) => {
      console.log(`\n${index + 1}. Flight ${flight.id}`);
      console.log(`   Price: ${flight.price.currency} ${flight.price.total} (for 2 passengers)`);
      console.log(`   Base: ${flight.price.base} + Fees`);

      flight.itineraries.forEach((itinerary, itinIndex) => {
        console.log(`\n   Itinerary ${itinIndex + 1}:`);
        console.log(`   Duration: ${itinerary.duration}`);

        itinerary.segments.forEach((segment, segIndex) => {
          console.log(`     Segment ${segIndex + 1}:`);
          console.log(`       ${segment.departure.airport} → ${segment.arrival.airport}`);
          console.log(`       Departure: ${segment.departure.time}`);
          console.log(`       Arrival: ${segment.arrival.time}`);
          console.log(`       Carrier: ${segment.carrier} | Aircraft: ${segment.aircraft}`);
        });
      });

      if (flight.accessibility && flight.accessibility.length > 0) {
        console.log(`   Accessibility: ${flight.accessibility.join(', ')}`);
      }
    });

    // Select best flight
    if (flightResponse.data.flights.length > 0) {
      const bestFlight = flightResponse.data.flights[0];
      log('\n' + '─'.repeat(70), 'cyan');
      log('RECOMMENDED FLIGHT BOOKING:', 'bright');
      log('─'.repeat(70), 'cyan');
      console.log(`Flight ID: ${bestFlight.id}`);
      console.log(`Route: ${originAirport.city} (${originAirport.iataCode}) → ${destAirport.city} (${destAirport.iataCode})`);
      console.log(`Date: November 11, 2025`);
      console.log(`Passengers: 2 adults`);
      console.log(`Total Price: ${bestFlight.price.currency} ${bestFlight.price.total}`);
      console.log(`Per Person: ${bestFlight.price.currency} ${(parseFloat(bestFlight.price.total) / 2).toFixed(2)}`);
      console.log(`Accessibility: ${bestFlight.accessibility.join(', ') || 'Standard'}`);
      log('─'.repeat(70), 'cyan');
    }

    return true;
  } catch (error) {
    logError(`Flight search failed: ${error.message}`);
    if (error.response?.data) {
      console.error(error.response.data);
    }
    return false;
  }
}

// Test 9: Complete Trip Planning (Integration Test)
async function testCompleteTripPlanning() {
  logSection('TEST 9: Complete Trip Planning - Paris November 11-18, 2025');

  try {
    log('Planning a complete trip for 2 people to Paris...', 'blue');

    // Step 1: Find experiences
    log('\n1. Finding Paris experiences...', 'yellow');
    const expResponse = await axios.post(`${API_BASE}/recommend`, {
      query: 'romantic dining, art museums, local markets, authentic French experiences',
      filters: {
        country: 'France',
        city: 'Paris',
        accessibility_needs: ['wheelchair_accessible'],
        preferences: ['food_culinary', 'art_culture', 'local_authentic'],
        activity_level: 'moderate'
      },
      limit: 5
    });

    logSuccess(`Found ${expResponse.data.total_results} experiences`);

    // Step 2: Search flights
    log('\n2. Searching for flights...', 'yellow');
    const flightResponse = await axios.post(`${API_BASE}/flights/search`, {
      origin: 'JFK',
      destination: 'CDG',
      departureDate: '2025-11-11',
      returnDate: '2025-11-18',
      accessibility: ['wheelchair_accessible']
    });

    logSuccess(`Found ${flightResponse.data.total} flight options`);

    // Create trip summary
    log('\n' + '═'.repeat(70), 'cyan');
    log('COMPLETE TRIP PLAN SUMMARY', 'bright');
    log('═'.repeat(70), 'cyan');

    console.log('\n📅 DATES: November 11-18, 2025 (7 nights, 8 days)');
    console.log('👥 TRAVELERS: 2 adults');
    console.log('📍 DESTINATION: Paris, France\n');

    // Flight details
    if (flightResponse.data.flights.length > 0) {
      const flight = flightResponse.data.flights[0];
      console.log('✈️  FLIGHTS:');
      console.log(`   Total Cost: ${flight.price.currency} ${flight.price.total} (${flight.price.currency} ${(parseFloat(flight.price.total) / 2).toFixed(2)} per person)`);
      console.log(`   Route: JFK → CDG`);
      console.log(`   Accessibility: Wheelchair accessible\n`);
    }

    // Experience details
    console.log('🎭 RECOMMENDED EXPERIENCES:');
    expResponse.data.recommendations.slice(0, 5).forEach((rec, index) => {
      const exp = rec.experience;
      console.log(`\n   ${index + 1}. ${exp.name}`);
      console.log(`      ${exp.description.substring(0, 120)}...`);
      console.log(`      Type: ${exp.type} | Price: ${exp.price_range || 'N/A'}`);
      console.log(`      Duration: ${exp.duration_hours || 'Flexible'}`);
      console.log(`      Tags: ${exp.preference_tags.slice(0, 3).join(', ')}`);
    });

    log('\n' + '═'.repeat(70), 'cyan');
    logSuccess('Complete trip planning test finished!');

    return true;
  } catch (error) {
    logError(`Complete trip planning failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('\n\n' + '█'.repeat(70), 'bright');
  log('  JOURNEY AI - COMPREHENSIVE CAPABILITY TEST SUITE', 'bright');
  log('  Testing flight booking to Paris for 2 people on November 11th', 'bright');
  log('█'.repeat(70) + '\n', 'bright');

  const results = [];

  // Run all tests
  results.push({ name: 'Health Check', passed: await testHealthCheck() });
  await delay(1000);

  results.push({ name: 'Database Statistics', passed: await testDatabaseStats() });
  await delay(1000);

  results.push({ name: 'Experience Filtering', passed: await testExperiencesByCountry() });
  await delay(1000);

  results.push({ name: 'Get Specific Experience', passed: await testGetSpecificExperience() });
  await delay(2000);

  results.push({ name: 'Semantic Recommendations', passed: await testSemanticRecommendations() });
  await delay(2000);

  results.push({ name: 'Conversational AI', passed: await testConversationalAI() });
  await delay(2000);

  results.push({ name: 'Airport Search', passed: await testAirportSearch() });
  await delay(2000);

  results.push({ name: 'Flight Search (2 PPL to Paris Nov 11)', passed: await testFlightSearch() });
  await delay(3000);

  results.push({ name: 'Complete Trip Planning', passed: await testCompleteTripPlanning() });

  // Summary
  logSection('TEST RESULTS SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}: PASSED`);
    } else {
      logError(`${result.name}: FAILED`);
    }
  });

  log('\n' + '═'.repeat(70), 'cyan');
  log(`Total Tests: ${results.length}`, 'bright');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`, 'bright');
  log('═'.repeat(70) + '\n', 'cyan');

  if (failed === 0) {
    log('🎉 ALL TESTS PASSED! Journey AI is fully functional!', 'green');
  } else {
    log('⚠️  Some tests failed. Please check the errors above.', 'yellow');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Start tests
(async () => {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    logError('Server is not running at http://localhost:3001');
    logInfo('Please start the server first:');
    console.log('  node server-production.js');
    console.log('  OR');
    console.log('  npm start\n');
    process.exit(1);
  }

  await runAllTests();
})();
