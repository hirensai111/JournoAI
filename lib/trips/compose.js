/**
 * Itinerary Composer
 * Orchestrates API calls, ranking, and day-by-day planning
 * @module lib/trips/compose
 */

import { searchFlights } from './adapters/amadeus.js';
import { searchHotels } from './adapters/booking.js';
import { searchExperiences } from './adapters/experiences.js';
import { scoreFlight, scoreHotel, scoreExperience } from './ranking.js';

/**
 * Main composition function
 * @param {import('./types.js').TripPrefs} prefs
 * @returns {Promise<import('./types.js').Plan>}
 */
export async function composePlan(prefs) {
  console.log('Composing plan for:', prefs.destination);
  
  const warnings = [];
  
  const [flightsResult, hotelsResult, experiencesResult] = await Promise.allSettled([
    searchFlights(prefs),
    searchHotels(prefs),
    searchExperiences(prefs)
  ]);
  
  const flights = flightsResult.status === 'fulfilled' ? flightsResult.value : [];
  const hotels = hotelsResult.status === 'fulfilled' ? hotelsResult.value : [];
  const experiences = experiencesResult.status === 'fulfilled' ? experiencesResult.value : [];
  
  if (flightsResult.status === 'rejected') {
    console.error('Flight search failed:', flightsResult.reason);
    warnings.push('Flight data unavailable. Showing estimated options.');
  }
  if (hotelsResult.status === 'rejected') {
    console.error('Hotel search failed:', hotelsResult.reason);
    warnings.push('Hotel data unavailable. Showing estimated options.');
  }
  if (experiencesResult.status === 'rejected') {
    console.error('Experience search failed:', experiencesResult.reason);
    warnings.push('Activity data unavailable. Showing estimated options.');
  }
  
  flights.forEach(f => f.score = scoreFlight(f, prefs));
  hotels.forEach(h => h.score = scoreHotel(h, prefs));
  experiences.forEach(x => x.score = scoreExperience(x, prefs));
  
  const rankedFlights = flights.sort((a, b) => b.score - a.score);
  const rankedHotels = hotels.sort((a, b) => b.score - a.score);
  const rankedExperiences = experiences.sort((a, b) => b.score - a.score);
  
  const selectedFlight = rankedFlights[0] || null;
  const selectedHotel = rankedHotels[0] || null;
  
  const days = buildDailyItinerary(prefs, rankedExperiences);
  const tips = generateAccessibilityTips(prefs, selectedHotel, rankedExperiences.slice(0, 10));
  const estCost = calculateEstimatedCost(selectedFlight, selectedHotel, rankedExperiences.slice(0, 10), prefs);
  
  const plan = {
    title: `${prefs.destination} Personalized Trip`,
    subtitle: formatSubtitle(prefs),
    flight: selectedFlight,
    hotel: selectedHotel,
    days,
    tips,
    estCost,
    warnings: warnings.length > 0 ? warnings : undefined
  };
  
  console.log('Plan composed successfully');
  return plan;
}

/**
 * Build day-by-day itinerary with accessibility considerations
 * @param {import('./types.js').TripPrefs} prefs
 * @param {import('./types.js').ExperienceOption[]} experiences
 * @returns {import('./types.js').DailyPlan[]}
 */
function buildDailyItinerary(prefs, experiences) {
  const days = [];
  const totalDays = calculateDays(prefs.startDate, prefs.endDate);
  
  const needsMobilityBreaks = prefs.travelersProfiles.some(t => 
    t.accessibilityNeeds.includes('wheelchair_access') || 
    t.accessibilityNeeds.includes('step_free') ||
    t.mobilityLevel === 'wheelchair' ||
    t.mobilityLevel === 'assisted'
  );
  
  const needsDiabeticBreaks = prefs.travelersProfiles.some(t =>
    t.accessibilityNeeds.includes('diabetes_support') ||
    t.dietaryNeeds?.includes('diabetic')
  );
  
  const activitiesPerDay = needsMobilityBreaks ? 2 : 3;
  
  for (let day = 1; day <= totalDays; day++) {
    const isArrivalDay = day === 1;
    const isDepartureDay = day === totalDays;
    
    const dayStartIdx = (day - 1) * activitiesPerDay;
    const dayActivities = experiences.slice(dayStartIdx, dayStartIdx + activitiesPerDay);
    
    const items = [];
    
    if (isArrivalDay) {
      items.push({
        kind: 'free_time',
        label: 'Check-in & settle into accessible hotel'
      });
      
      if (dayActivities[0]) {
        items.push({
          kind: 'experience',
          refId: dayActivities[0].id,
          label: dayActivities[0].title,
          start: '15:00'
        });
      }
      
      items.push({
        kind: 'free_time',
        label: 'Dinner & rest'
      });
    } else if (isDepartureDay) {
      items.push({
        kind: 'free_time',
        label: 'Breakfast & hotel checkout'
      });
      
      if (dayActivities[0]) {
        items.push({
          kind: 'experience',
          refId: dayActivities[0].id,
          label: dayActivities[0].title,
          start: '10:00'
        });
      }
      
      items.push({
        kind: 'free_time',
        label: 'Departure preparations'
      });
    } else {
      dayActivities.forEach((exp, idx) => {
        const startTime = idx === 0 ? '09:30' : idx === 1 ? '14:00' : '17:00';
        
        items.push({
          kind: 'experience',
          refId: exp.id,
          label: exp.title,
          start: startTime
        });
        
        if (needsMobilityBreaks && idx < dayActivities.length - 1) {
          items.push({
            kind: 'free_time',
            label: 'Rest break at accessible café'
          });
        }
        
        if (needsDiabeticBreaks && idx === 0) {
          items.push({
            kind: 'free_time',
            label: 'Lunch break (diabetic-friendly options)'
          });
        }
      });
    }
    
    days.push({
      day,
      title: getDayTitle(day, isArrivalDay, isDepartureDay, prefs),
      items
    });
  }
  
  return days;
}

function generateAccessibilityTips(prefs, hotel, topExperiences) {
  const tips = [];
  
  const allNeeds = new Set(prefs.travelersProfiles.flatMap(t => t.accessibilityNeeds));
  
  if (allNeeds.has('wheelchair_access') || allNeeds.has('step_free') || allNeeds.has('elevator_required')) {
    tips.push('Call hotel 24-48 hours before arrival to confirm wheelchair access, step-free rooms, and elevator functionality.');
    tips.push('Download local accessible transit apps and mark step-free stations on your route.');
    tips.push('Request airport assistance in advance for smoother boarding and transfers.');
  }
  
  if (allNeeds.has('diabetes_support')) {
    if (hotel && hotel.accessibility.includes('diabetes_support')) {
      tips.push('Hotel provides in-room refrigerator for medication storage. Confirm upon check-in.');
    } else {
      tips.push('Request a medication mini-fridge at hotel check-in (often available upon request).');
    }
    tips.push('Pack extra diabetes supplies and carry glucose snacks during activities.');
    tips.push('Identify nearby pharmacies in case emergency supplies are needed.');
  }
  
  if (allNeeds.has('hearing_assist')) {
    tips.push('Contact tour providers to request hearing assistance devices or sign language interpreters.');
  }
  
  if (allNeeds.has('visual_assist')) {
    tips.push('Ask museums and attractions about audio guides and tactile exhibits.');
  }
  
  if (allNeeds.has('service_animal_friendly')) {
    tips.push('Carry service animal documentation and vaccination records for all activities.');
    tips.push('Identify pet relief areas near hotel and major attractions in advance.');
  }
  
  const accessibleCount = topExperiences.filter(e => e.wheelchairAccessible).length;
  const totalCount = topExperiences.length;
  
  if (accessibleCount < totalCount * 0.7) {
    tips.push('Some activities have limited accessibility info. Call ahead to confirm ramps, rest points, and assistance availability.');
  }
  
  tips.push('Use accessible ride-share services (Uber WAV, Lyft Access) for easier transportation between locations.');
  
  if (prefs.budget === 'budget') {
    tips.push('Many museums offer free or discounted admission for visitors with disabilities and companions.');
  }
  
  return tips;
}

function calculateEstimatedCost(flight, hotel, topExperiences, prefs) {
  let total = 0;
  let currency = 'USD';
  
  if (flight) {
    total += flight.priceTotal * prefs.travelers;
    currency = flight.currency;
  }
  
  if (hotel && hotel.pricePerNight) {
    const nights = calculateDays(prefs.startDate, prefs.endDate) - 1;
    const roomsNeeded = Math.ceil(prefs.travelers / 2);
    total += hotel.pricePerNight * nights * roomsNeeded;
    currency = hotel.currency;
  }
  
  const avgActivitiesCount = Math.min(7, topExperiences.length);
  const avgActivityCost = topExperiences
    .slice(0, avgActivitiesCount)
    .reduce((sum, exp) => sum + (exp.priceFrom || 50), 0) / avgActivitiesCount;
  
  total += avgActivityCost * avgActivitiesCount * prefs.travelers;
  
  total *= 1.15;
  
  return `~${currency} ${Math.round(total).toLocaleString()} (${prefs.travelers} travelers)`;
}

function getDayTitle(day, isArrival, isDeparture, prefs) {
  if (isArrival) return 'Arrival & Welcome';
  if (isDeparture) return 'Departure Day';
  
  if (prefs.specialOccasion === 'birthday' && day === Math.ceil(calculateDays(prefs.startDate, prefs.endDate) / 2)) {
    return '🎉 Birthday Celebration Day';
  }
  if (prefs.specialOccasion === 'anniversary' && day === 2) {
    return '💕 Anniversary Celebration';
  }
  
  const vibes = prefs.vibe;
  if (vibes.includes('cultural')) return `Day ${day}: Cultural Exploration`;
  if (vibes.includes('luxury')) return `Day ${day}: Luxury Experience`;
  if (vibes.includes('relaxed')) return `Day ${day}: Leisure & Relaxation`;
  if (vibes.includes('party')) return `Day ${day}: Nightlife & Entertainment`;
  
  return `Day ${day}: Explore & Enjoy`;
}

function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function formatSubtitle(prefs) {
  const start = new Date(prefs.startDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const end = new Date(prefs.endDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  return `${prefs.travelers} ${prefs.travelers === 1 ? 'traveler' : 'travelers'} • ${start} → ${end}`;
}

