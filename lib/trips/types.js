/**
 * @typedef {'wheelchair_access' | 'step_free' | 'elevator_required' | 'hearing_assist' | 'visual_assist' | 'diabetes_support' | 'service_animal_friendly'} AccessibilityNeed
 */

/**
 * @typedef {Object} TravelerProfile
 * @property {string} id
 * @property {string} [name]
 * @property {number} [age]
 * @property {'independent' | 'assisted' | 'wheelchair'} [mobilityLevel]
 * @property {AccessibilityNeed[]} accessibilityNeeds
 * @property {('diabetic' | 'gluten_free' | 'kosher' | 'halal' | 'vegan')[]} [dietaryNeeds]
 */

/**
 * @typedef {Object} TripPrefs
 * @property {string} destination
 * @property {string} origin
 * @property {number} travelers
 * @property {string} startDate - ISO date
 * @property {string} endDate - ISO date
 * @property {('relaxed' | 'luxury' | 'cultural' | 'party' | 'mixed')[]} vibe
 * @property {'budget' | 'mid' | 'premium'} budget
 * @property {string} [notes]
 * @property {'birthday' | 'anniversary' | 'none'} [specialOccasion]
 * @property {TravelerProfile[]} travelersProfiles
 */

/**
 * @typedef {Object} FlightSegment
 * @property {string} from
 * @property {string} to
 * @property {string} dep
 * @property {string} arr
 * @property {number} durationMinutes
 */

/**
 * @typedef {Object} FlightOption
 * @property {string} id
 * @property {string} carrier
 * @property {FlightSegment[]} segments
 * @property {'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'} cabin
 * @property {number} priceTotal
 * @property {string} currency
 * @property {string} [deeplink]
 * @property {number} score
 */

/**
 * @typedef {Object} HotelOption
 * @property {string} id
 * @property {string} name
 * @property {string} [neighborhood]
 * @property {number} [rating]
 * @property {number} [pricePerNight]
 * @property {string} currency
 * @property {string[]} [photos]
 * @property {string} [deeplink]
 * @property {AccessibilityNeed[]} accessibility
 * @property {string[]} [amenities]
 * @property {number} score
 */

/**
 * @typedef {Object} ExperienceOption
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {number} [durationMinutes]
 * @property {string[]} [startTimes]
 * @property {number} [priceFrom]
 * @property {string} currency
 * @property {boolean} [wheelchairAccessible]
 * @property {boolean} [hearingAssist]
 * @property {boolean} [visualAssist]
 * @property {boolean} [suitableForDiabetes]
 * @property {boolean} [serviceAnimalFriendly]
 * @property {string} [location]
 * @property {string} [deeplink]
 * @property {number} score
 */

/**
 * @typedef {Object} DailyPlanItem
 * @property {'experience' | 'free_time'} kind
 * @property {string} [refId]
 * @property {string} label
 * @property {string} [start]
 * @property {string} [end]
 */

/**
 * @typedef {Object} DailyPlan
 * @property {number} day
 * @property {string} title
 * @property {DailyPlanItem[]} items
 */

/**
 * @typedef {Object} Plan
 * @property {string} title
 * @property {string} [subtitle]
 * @property {FlightOption | null} flight
 * @property {HotelOption | null} hotel
 * @property {DailyPlan[]} days
 * @property {string[]} tips
 * @property {string} estCost
 * @property {string[]} [warnings]
 */

export {};

