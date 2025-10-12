/**
 * Booking.com Hotel API Adapter
 * @module lib/trips/adapters/booking
 */

import axios from 'axios';

const hotelCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds only for development

/**
 * Search hotels using Booking.com API or fallback to mock data
 * @param {import('../types.js').TripPrefs} prefs
 * @returns {Promise<import('../types.js').HotelOption[]>}
 */
export async function searchHotels(prefs) {
  const cacheKey = `${prefs.destination}-${prefs.origin}-${prefs.startDate}-${prefs.endDate}-${prefs.travelers}-${prefs.budget}`;

  const cached = hotelCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('⚡ Returning cached hotel results (cache expires in', Math.round((CACHE_TTL - (Date.now() - cached.timestamp)) / 1000), 'seconds)');
    return cached.data;
  }

  console.log('🔍 Fetching fresh hotel results for:', prefs.destination);

  const apiKey = process.env.BOOKING_API_KEY;
  
  if (!apiKey) {
    console.log('Booking.com API key not configured. Using mock data.');
    const mockHotels = await generateMockHotels(prefs);
    hotelCache.set(cacheKey, { data: mockHotels, timestamp: Date.now() });
    return mockHotels;
  }

  try {
    const response = await axios.get('https://distribution-xml.booking.com/2.7/json/hotels', {
      params: {
        city: prefs.destination,
        checkin: prefs.startDate,
        checkout: prefs.endDate,
        guest_qty: prefs.travelers,
        room_qty: Math.ceil(prefs.travelers / 2),
        currency: 'USD',
        extras: 'hotel_info,hotel_facilities'
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      },
      timeout: 10000
    });

    const hotels = response.data.result.map(h => normalizeBookingHotel(h, prefs));
    const filtered = filterByAccessibility(hotels, prefs);
    
    hotelCache.set(cacheKey, { data: filtered, timestamp: Date.now() });
    return filtered;
    
  } catch (error) {
    console.error('Booking.com API error:', error.message);
    const mockHotels = await generateMockHotels(prefs);
    return mockHotels;
  }
}

function normalizeBookingHotel(hotel, prefs) {
  const accessibility = [];
  
  const facilities = hotel.facilities || [];
  const facilityTexts = facilities.map(f => f.name?.toLowerCase() || '');
  
  if (facilityTexts.some(f => f.includes('wheelchair') || f.includes('accessible'))) {
    accessibility.push('wheelchair_access');
  }
  if (facilityTexts.some(f => f.includes('elevator') || f.includes('lift'))) {
    accessibility.push('elevator_required');
  }
  if (facilityTexts.some(f => f.includes('step-free') || f.includes('ground floor'))) {
    accessibility.push('step_free');
  }
  if (facilityTexts.some(f => f.includes('refrigerator') || f.includes('fridge') || f.includes('minibar'))) {
    accessibility.push('diabetes_support');
  }
  if (facilityTexts.some(f => f.includes('service animal') || f.includes('pets allowed'))) {
    accessibility.push('service_animal_friendly');
  }
  
  return {
    id: hotel.hotel_id || `hotel-${Date.now()}-${Math.random()}`,
    name: hotel.hotel_name || 'Unknown Hotel',
    neighborhood: hotel.district || hotel.city || undefined,
    rating: hotel.review_score ? parseFloat(hotel.review_score) : undefined,
    pricePerNight: hotel.min_total_price ? parseFloat(hotel.min_total_price) / calculateNights(prefs) : undefined,
    currency: hotel.currency || 'USD',
    photos: hotel.photos?.map(p => p.url_max300) || [],
    deeplink: hotel.url || `https://www.booking.com/hotel/`,
    accessibility,
    amenities: facilities.map(f => f.name).filter(Boolean),
    score: 0
  };
}

function filterByAccessibility(hotels, prefs) {
  const requiredNeeds = new Set(
    prefs.travelersProfiles.flatMap(t => t.accessibilityNeeds)
  );
  
  const criticalNeeds = ['wheelchair_access', 'step_free', 'elevator_required'];
  const hasCriticalNeeds = Array.from(requiredNeeds).some(n => criticalNeeds.includes(n));
  
  if (hasCriticalNeeds) {
    return hotels.filter(h => {
      return h.accessibility.length > 0 || h.amenities?.some(a => 
        a.toLowerCase().includes('accessible') || 
        a.toLowerCase().includes('wheelchair')
      );
    });
  }
  
  return hotels;
}

function calculateNights(prefs) {
  const start = new Date(prefs.startDate);
  const end = new Date(prefs.endDate);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function generateMockHotels(prefs) {
  const hotels = [];
  
  const hotelTemplates = [
    { name: 'Grand Plaza Hotel', rating: 8.5, accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'diabetes_support'], neighborhood: 'City Center' },
    { name: 'Comfort Inn Downtown', rating: 7.8, accessibility: ['elevator_required', 'diabetes_support'], neighborhood: 'Downtown' },
    { name: 'Accessible Suites', rating: 9.1, accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'diabetes_support', 'service_animal_friendly', 'hearing_assist'], neighborhood: 'Financial District' },
    { name: 'Budget Stay Hotel', rating: 7.2, accessibility: ['elevator_required'], neighborhood: 'Suburbs' },
    { name: 'Luxury Heights', rating: 9.4, accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'diabetes_support', 'service_animal_friendly'], neighborhood: 'Uptown' },
    { name: 'Historic Inn', rating: 8.0, accessibility: ['diabetes_support'], neighborhood: 'Old Town' },
    { name: 'Modern Boutique Hotel', rating: 8.7, accessibility: ['wheelchair_access', 'elevator_required', 'diabetes_support'], neighborhood: 'Arts District' },
    { name: 'Riverside Resort', rating: 8.3, accessibility: ['step_free', 'diabetes_support', 'service_animal_friendly'], neighborhood: 'Waterfront' },
    { name: 'City View Apartments', rating: 7.9, accessibility: ['elevator_required', 'diabetes_support'], neighborhood: 'Midtown' },
    { name: 'Premium Accessible Hotel', rating: 9.2, accessibility: ['wheelchair_access', 'elevator_required', 'step_free', 'diabetes_support', 'service_animal_friendly', 'hearing_assist', 'visual_assist'], neighborhood: 'Central Business District' }
  ];
  
  const basePrice = prefs.budget === 'budget' ? 80 : prefs.budget === 'mid' ? 150 : 280;
  
  for (let i = 0; i < hotelTemplates.length; i++) {
    const template = hotelTemplates[i];
    const priceVariation = (Math.random() - 0.5) * 40;
    
    hotels.push({
      id: `mock-hotel-${i}`,
      name: template.name,
      neighborhood: template.neighborhood,
      rating: template.rating,
      pricePerNight: Math.round(basePrice + priceVariation),
      currency: 'USD',
      photos: [
        `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300`,
        `https://images.unsplash.com/photo-1582719508461-905c673771fd?w=300`
      ],
      deeplink: `https://www.booking.com/hotel/search?dest=${encodeURIComponent(prefs.destination)}`,
      accessibility: template.accessibility,
      amenities: [
        'Free WiFi',
        'Breakfast included',
        'Air conditioning',
        ...(template.accessibility.includes('wheelchair_access') ? ['Wheelchair accessible'] : []),
        ...(template.accessibility.includes('diabetes_support') ? ['In-room refrigerator'] : []),
        ...(template.accessibility.includes('service_animal_friendly') ? ['Service animals welcome'] : [])
      ],
      score: 0
    });
  }
  
  return hotels;
}

