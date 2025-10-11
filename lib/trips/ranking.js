/**
 * Ranking & Personalization Engine
 * Scores options based on accessibility needs, preferences, and price
 * @module lib/trips/ranking
 */

const NORMALIZATION_BASE = 1000;

/**
 * Score flight options
 * @param {import('./types.js').FlightOption} flight
 * @param {import('./types.js').TripPrefs} prefs
 * @returns {number}
 */
export function scoreFlight(flight, prefs) {
  let score = 2.0;
  
  const priceScore = -normalize(flight.priceTotal, NORMALIZATION_BASE);
  score += priceScore * 0.8;
  
  const stops = flight.segments.length - 1;
  const stopsPenalty = -(stops * 0.6);
  score += stopsPenalty;
  
  const totalDuration = flight.segments.reduce((sum, seg) => sum + seg.durationMinutes, 0);
  const durationPenalty = -normalize(totalDuration, 600) * 0.4;
  score += durationPenalty;
  
  if (prefs.budget === 'premium' && (flight.cabin === 'BUSINESS' || flight.cabin === 'FIRST')) {
    score += 1.5;
  } else if (prefs.budget === 'mid' && flight.cabin === 'PREMIUM_ECONOMY') {
    score += 0.5;
  }
  
  const hasAccessibilityNeeds = prefs.travelersProfiles.some(t => t.accessibilityNeeds.length > 0);
  if (hasAccessibilityNeeds && stops === 0) {
    score += 1.0;
  }
  
  return round2(score);
}

/**
 * Score hotel options with comprehensive accessibility matching
 * @param {import('./types.js').HotelOption} hotel
 * @param {import('./types.js').TripPrefs} prefs
 * @returns {number}
 */
export function scoreHotel(hotel, prefs) {
  let score = 2.0;
  
  const requiredNeeds = new Set(
    prefs.travelersProfiles.flatMap(t => t.accessibilityNeeds)
  );
  
  let accessibilityScore = 0;
  
  requiredNeeds.forEach(need => {
    const hasFeature = hotel.accessibility.includes(need);
    
    if (need === 'wheelchair_access' || need === 'step_free' || need === 'elevator_required') {
      if (hasFeature) {
        accessibilityScore += 2.0;
      } else {
        accessibilityScore -= 1.5;
      }
    } else if (need === 'diabetes_support' || need === 'service_animal_friendly') {
      if (hasFeature) {
        accessibilityScore += 1.2;
      } else {
        accessibilityScore -= 0.8;
      }
    } else {
      if (hasFeature) {
        accessibilityScore += 0.8;
      } else {
        accessibilityScore -= 0.3;
      }
    }
  });
  
  score += accessibilityScore;
  
  if (hotel.rating) {
    const ratingScore = (hotel.rating / 10) * 1.5;
    score += ratingScore;
  }
  
  if (hotel.pricePerNight) {
    if (prefs.budget === 'budget') {
      const priceScore = -normalize(hotel.pricePerNight, 200) * 1.0;
      score += priceScore;
    } else if (prefs.budget === 'premium') {
      const priceBonus = normalize(hotel.pricePerNight, 400) * 0.3;
      score += priceBonus;
    }
  }
  
  if (hotel.accessibility.length >= 4) {
    score += 1.0;
  }
  
  if (prefs.notes && hotel.neighborhood) {
    const notesLower = prefs.notes.toLowerCase();
    const neighborhoodLower = hotel.neighborhood.toLowerCase();
    if (notesLower.includes(neighborhoodLower) || neighborhoodLower.includes('center')) {
      score += 0.5;
    }
  }
  
  return round2(score);
}

/**
 * Score experience/activity options
 * @param {import('./types.js').ExperienceOption} exp
 * @param {import('./types.js').TripPrefs} prefs
 * @returns {number}
 */
export function scoreExperience(exp, prefs) {
  let score = 1.5;
  
  const needs = new Set(
    prefs.travelersProfiles.flatMap(t => t.accessibilityNeeds)
  );
  
  let accessibilityScore = 0;
  
  if (needs.has('wheelchair_access')) {
    accessibilityScore += exp.wheelchairAccessible ? 1.5 : -0.8;
  }
  
  if (needs.has('hearing_assist')) {
    accessibilityScore += exp.hearingAssist ? 0.8 : -0.2;
  }
  
  if (needs.has('visual_assist')) {
    accessibilityScore += exp.visualAssist ? 0.8 : -0.2;
  }
  
  if (needs.has('diabetes_support')) {
    if (exp.suitableForDiabetes) {
      accessibilityScore += 0.8;
    } else if (exp.durationMinutes && exp.durationMinutes > 240) {
      accessibilityScore -= 0.6;
    }
  }
  
  if (needs.has('service_animal_friendly')) {
    accessibilityScore += exp.serviceAnimalFriendly ? 0.8 : -0.4;
  }
  
  score += accessibilityScore;
  
  if (exp.durationMinutes) {
    const idealDuration = 150;
    const durationDiff = Math.abs(exp.durationMinutes - idealDuration);
    const durationScore = -normalize(durationDiff, 120) * 0.3;
    score += durationScore;
  }
  
  if (exp.priceFrom) {
    const priceScore = -normalize(exp.priceFrom, 100) * 0.2;
    score += priceScore;
  }
  
  const vibeBonus = calculateVibeMatch(exp, prefs.vibe);
  score += vibeBonus;
  
  if (prefs.specialOccasion === 'birthday' && exp.title.toLowerCase().includes('birthday')) {
    score += 2.0;
  } else if (prefs.specialOccasion === 'anniversary' && 
             (exp.title.toLowerCase().includes('romantic') || 
              exp.title.toLowerCase().includes('dinner'))) {
    score += 1.5;
  }
  
  return round2(score);
}

/**
 * Calculate vibe match bonus
 * @param {import('./types.js').ExperienceOption} exp
 * @param {string[]} vibes
 * @returns {number}
 */
function calculateVibeMatch(exp, vibes) {
  let bonus = 0.3;
  
  const titleLower = exp.title.toLowerCase();
  const descLower = exp.description?.toLowerCase() || '';
  
  vibes.forEach(vibe => {
    switch (vibe) {
      case 'cultural':
        if (titleLower.includes('museum') || titleLower.includes('art') || 
            titleLower.includes('historic') || titleLower.includes('culture')) {
          bonus += 0.5;
        }
        break;
      case 'luxury':
        if (titleLower.includes('private') || titleLower.includes('premium') || 
            titleLower.includes('spa') || titleLower.includes('fine dining')) {
          bonus += 0.5;
        }
        break;
      case 'relaxed':
        if (titleLower.includes('park') || titleLower.includes('beach') || 
            titleLower.includes('scenic') || titleLower.includes('leisurely')) {
          bonus += 0.5;
        }
        break;
      case 'party':
        if (titleLower.includes('bar') || titleLower.includes('nightlife') || 
            titleLower.includes('music') || titleLower.includes('dance')) {
          bonus += 0.5;
        }
        break;
      case 'mixed':
        bonus += 0.2;
        break;
    }
  });
  
  return bonus;
}

/**
 * Normalize a value to 0-1 range
 * @param {number} value
 * @param {number} [base]
 * @returns {number}
 */
function normalize(value, base = NORMALIZATION_BASE) {
  return Math.min(1, value / base);
}

/**
 * Round to 2 decimal places
 * @param {number} num
 * @returns {number}
 */
function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Rank and filter a list of options by score
 * @template T
 * @param {T[]} options
 * @param {number} [limit]
 * @returns {T[]}
 */
export function rankOptions(options, limit) {
  const sorted = [...options].sort((a, b) => b.score - a.score);
  return limit ? sorted.slice(0, limit) : sorted;
}

