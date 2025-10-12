/**
 * Experiences API Adapter
 * @module lib/trips/adapters/experiences
 */

import axios from 'axios';

const experienceCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds only for development

/**
 * Search experiences/activities
 * @param {import('../types.js').TripPrefs} prefs
 * @returns {Promise<import('../types.js').ExperienceOption[]>}
 */
export async function searchExperiences(prefs) {
  const cacheKey = `${prefs.destination}-${prefs.origin}-${prefs.startDate}-${prefs.vibe.join(',')}-${prefs.budget}`;

  const cached = experienceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('⚡ Returning cached experience results (cache expires in', Math.round((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000), 'seconds)');
    return cached.data;
  }

  console.log('🔍 Fetching fresh experience results for:', prefs.destination);

  const apiKey = process.env.EXPERIENCES_API_KEY;
  
  if (!apiKey) {
    console.log('Experiences API key not configured. Using curated local data.');
    const experiences = await generateExperiences(prefs);
    experienceCache.set(cacheKey, { data: experiences, timestamp: Date.now() });
    return experiences;
  }

  try {
    const response = await axios.get('https://api.getyourguide.com/1/activities', {
      params: {
        location: prefs.destination,
        start_date: prefs.startDate,
        end_date: prefs.endDate,
        currency: 'USD',
        limit: 40
      },
      headers: {
        'X-API-Key': apiKey
      },
      timeout: 10000
    });

    const experiences = response.data.activities.map(a => normalizeExperience(a, prefs));
    
    experienceCache.set(cacheKey, { data: experiences, timestamp: Date.now() });
    return experiences;
    
  } catch (error) {
    console.error('Experiences API error:', error.message);
    const experiences = await generateExperiences(prefs);
    return experiences;
  }
}

function normalizeExperience(activity, prefs) {
  return {
    id: activity.id || `exp-${Date.now()}-${Math.random()}`,
    title: activity.title || 'Activity',
    description: activity.description || undefined,
    durationMinutes: activity.duration ? parseInt(activity.duration) * 60 : undefined,
    startTimes: activity.times || [],
    priceFrom: activity.price?.from || undefined,
    currency: activity.price?.currency || 'USD',
    wheelchairAccessible: activity.accessibility?.wheelchair || false,
    hearingAssist: activity.accessibility?.hearing || false,
    visualAssist: activity.accessibility?.visual || false,
    suitableForDiabetes: activity.duration < 240,
    location: activity.location || undefined,
    deeplink: activity.url || undefined,
    score: 0
  };
}

async function generateExperiences(prefs) {
  const experiences = [];
  
  const baseActivities = [
    {
      title: 'Accessible City Walking Tour',
      description: 'Wheelchair-friendly guided tour of main attractions with rest stops',
      durationMinutes: 180,
      priceFrom: 45,
      wheelchairAccessible: true,
      hearingAssist: true,
      suitableForDiabetes: true,
      location: 'City Center'
    },
    {
      title: 'Museum Visit with Audio Guide',
      description: 'Step-free museum access with assistive technology',
      durationMinutes: 150,
      priceFrom: 25,
      wheelchairAccessible: true,
      hearingAssist: true,
      visualAssist: true,
      suitableForDiabetes: true,
      location: 'Museum District'
    },
    {
      title: 'Food Tasting Tour',
      description: 'Accessible route through local markets and restaurants',
      durationMinutes: 210,
      priceFrom: 75,
      wheelchairAccessible: true,
      suitableForDiabetes: true,
      location: 'Food District'
    },
    {
      title: 'Panoramic Bus Tour',
      description: 'Hop-on hop-off tour with wheelchair accessible buses',
      durationMinutes: 120,
      priceFrom: 35,
      wheelchairAccessible: true,
      hearingAssist: true,
      suitableForDiabetes: true,
      location: 'Various stops'
    },
    {
      title: 'Accessible Boat Cruise',
      description: 'Step-free boarding with onboard accessibility facilities',
      durationMinutes: 90,
      priceFrom: 50,
      wheelchairAccessible: true,
      suitableForDiabetes: true,
      location: 'Harbor/River'
    }
  ];
  
  const vibeActivities = {
    cultural: [
      {
        title: 'Art Gallery Private Tour',
        description: 'Intimate accessible tour with expert guide',
        durationMinutes: 120,
        priceFrom: 60,
        wheelchairAccessible: true,
        hearingAssist: true,
        visualAssist: true,
        suitableForDiabetes: true
      },
      {
        title: 'Historical Walking Tour',
        description: 'Accessible route through historic sites',
        durationMinutes: 180,
        priceFrom: 40,
        wheelchairAccessible: true,
        hearingAssist: true,
        suitableForDiabetes: true
      },
      {
        title: 'Local Craft Workshop',
        description: 'Hands-on accessible workshop',
        durationMinutes: 150,
        priceFrom: 55,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      }
    ],
    luxury: [
      {
        title: 'Private Accessible Spa Experience',
        description: 'Full-service spa with accessibility accommodations',
        durationMinutes: 180,
        priceFrom: 200,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      },
      {
        title: 'Fine Dining Experience',
        description: 'Michelin-star restaurant with accessibility',
        durationMinutes: 150,
        priceFrom: 150,
        wheelchairAccessible: true,
        suitableForDiabetes: false
      },
      {
        title: 'Private Tour with Chauffeur',
        description: 'Luxury accessible vehicle with personal guide',
        durationMinutes: 240,
        priceFrom: 300,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      }
    ],
    relaxed: [
      {
        title: 'Park Picnic Experience',
        description: 'Accessible park with assisted picnic setup',
        durationMinutes: 120,
        priceFrom: 30,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      },
      {
        title: 'Accessible Beach Day',
        description: 'Beach with wheelchair mats and assistance',
        durationMinutes: 180,
        priceFrom: 25,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      },
      {
        title: 'Scenic Drive Tour',
        description: 'Comfortable accessible vehicle tour',
        durationMinutes: 150,
        priceFrom: 45,
        wheelchairAccessible: true,
        suitableForDiabetes: true
      }
    ],
    party: [
      {
        title: 'Accessible Bar Crawl',
        description: 'Curated route through accessible venues',
        durationMinutes: 240,
        priceFrom: 65,
        wheelchairAccessible: true,
        suitableForDiabetes: false
      },
      {
        title: 'Live Music Venue Access',
        description: 'Priority accessible seating at local venues',
        durationMinutes: 180,
        priceFrom: 55,
        wheelchairAccessible: true,
        hearingAssist: true,
        suitableForDiabetes: true
      }
    ]
  };
  
  const allActivities = [...baseActivities];
  prefs.vibe.forEach(v => {
    if (vibeActivities[v]) {
      allActivities.push(...vibeActivities[v]);
    }
  });
  
  allActivities.forEach((template, idx) => {
    experiences.push({
      id: `exp-${idx}`,
      title: template.title || 'Activity',
      description: template.description,
      durationMinutes: template.durationMinutes,
      startTimes: ['09:00', '11:00', '14:00', '16:00'],
      priceFrom: template.priceFrom,
      currency: 'USD',
      wheelchairAccessible: template.wheelchairAccessible ?? false,
      hearingAssist: template.hearingAssist ?? false,
      visualAssist: template.visualAssist ?? false,
      suitableForDiabetes: template.suitableForDiabetes ?? true,
      serviceAnimalFriendly: true,
      location: template.location || prefs.destination,
      deeplink: `https://www.getyourguide.com/s/?q=${encodeURIComponent(template.title || 'tour')}`,
      score: 0
    });
  });
  
  if (prefs.specialOccasion === 'birthday') {
    experiences.unshift({
      id: 'exp-birthday-special',
      title: 'Birthday Celebration Package',
      description: 'Accessible venue with private celebration setup',
      durationMinutes: 180,
      priceFrom: 120,
      currency: 'USD',
      wheelchairAccessible: true,
      hearingAssist: true,
      suitableForDiabetes: true,
      serviceAnimalFriendly: true,
      location: prefs.destination,
      deeplink: undefined,
      score: 0
    });
  }
  
  return experiences;
}

