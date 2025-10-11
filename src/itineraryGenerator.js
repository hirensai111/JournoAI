import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

class ItineraryGenerator {
  constructor(recommender) {
    this.recommender = recommender;
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Fatigue thresholds for different conditions
    this.fatigueThresholds = {
      wheelchair_user: {
        low: 30,
        moderate: 50,
        high: 70,
        critical: 85
      },
      type_1_diabetes: {
        low: 35,
        moderate: 55,
        high: 75,
        critical: 90
      },
      default: {
        low: 40,
        moderate: 60,
        high: 80,
        critical: 95
      }
    };

    // Activity intensity scoring
    this.activityIntensity = {
      sedentary: 5,
      low: 15,
      moderate: 35,
      high: 60,
      extreme: 90
    };
  }

  /**
   * Generate a personalized multi-day itinerary
   */
  async generateItinerary({
    conditions = [],
    destination = '',
    city = '',
    tripDuration = 7,
    startDate = null,
    preferences = [],
    accessibility_needs = [],
    dietary = [],
    soloTravel = false
  }) {
    try {
      console.log(`📅 Generating ${tripDuration}-day itinerary for ${city || destination}`);

      // Get relevant experiences from destination
      const experiences = await this.getDestinationExperiences({
        destination,
        city,
        preferences,
        accessibility_needs,
        dietary
      });

      if (experiences.length === 0) {
        throw new Error(`No experiences found for ${city || destination}`);
      }

      console.log(`✅ Found ${experiences.length} suitable experiences`);

      // Generate day-by-day itinerary
      const itinerary = this.buildItinerary({
        experiences,
        tripDuration,
        startDate,
        conditions,
        preferences,
        soloTravel
      });

      // Add medical safety and fatigue tracking
      const enrichedItinerary = this.addHealthTracking(itinerary, conditions);

      console.log(`✅ Generated ${enrichedItinerary.days.length}-day itinerary`);

      return enrichedItinerary;

    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw error;
    }
  }

  /**
   * Get experiences suitable for destination and user needs
   */
  async getDestinationExperiences({ destination, city, preferences, accessibility_needs, dietary }) {
    const filters = {};

    if (city) filters.city = city;
    if (destination && !city) filters.country = destination;
    if (accessibility_needs?.length > 0) filters.accessibility_needs = accessibility_needs;
    if (dietary?.length > 0) filters.dietary = dietary;
    if (preferences?.length > 0) filters.preferences = preferences;

    // Get recommendations from the recommender
    const query = `${preferences.join(' ')} ${city || destination}`;

    try {
      const results = await this.recommender.search({
        query,
        filters,
        limit: 50 // Get more experiences to choose from
      });

      return results.map(r => r.experience);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      return [];
    }
  }

  /**
   * Build day-by-day itinerary with smart pacing
   */
  buildItinerary({ experiences, tripDuration, startDate, conditions, preferences, soloTravel }) {
    const days = [];
    let cumulativeFatigue = 0;
    const experiencesUsed = new Set();

    // Day 1 is always arrival/rest day
    const arrivalDate = startDate ? new Date(startDate) : new Date();

    days.push(this.createArrivalDay(arrivalDate, conditions));
    cumulativeFatigue += 20; // Arrival day baseline fatigue

    // Generate remaining days
    for (let dayNum = 2; dayNum <= tripDuration; dayNum++) {
      const currentDate = new Date(arrivalDate);
      currentDate.setDate(arrivalDate.getDate() + dayNum - 1);

      // Determine if this should be a rest day
      const needsRestDay = this.shouldBeRestDay(cumulativeFatigue, dayNum, tripDuration, conditions);

      if (needsRestDay) {
        days.push(this.createRestDay(currentDate, dayNum, cumulativeFatigue, conditions));
        cumulativeFatigue = Math.max(20, cumulativeFatigue - 30); // Rest reduces fatigue
      } else {
        // Create activity day
        const availableExperiences = experiences.filter(exp => !experiencesUsed.has(exp.id));
        const day = this.createActivityDay({
          currentDate,
          dayNum,
          availableExperiences,
          cumulativeFatigue,
          conditions,
          preferences,
          soloTravel
        });

        // Mark experiences as used
        day.activities.forEach(activity => {
          if (activity.experience_id) {
            experiencesUsed.add(activity.experience_id);
          }
        });

        days.push(day);
        cumulativeFatigue += day.fatigue_added;
      }
    }

    return {
      destination: experiences[0]?.city || experiences[0]?.country,
      trip_duration: tripDuration,
      start_date: arrivalDate.toISOString().split('T')[0],
      traveler_profile: {
        conditions,
        preferences,
        solo_travel: soloTravel
      },
      days,
      summary: this.generateSummary(days, conditions)
    };
  }

  /**
   * Create arrival day (Day 1)
   */
  createArrivalDay(date, conditions) {
    return {
      day_number: 1,
      date: date.toISOString().split('T')[0],
      title: 'Arrival & Rest',
      theme: 'Recovery from travel',
      fatigue_risk: 20,
      fatigue_level: 'Low (20/100) ✓',
      medical_safety_score: 5,
      medical_safety_display: '⭐⭐⭐⭐⭐',
      activities: [
        {
          time: '09:00',
          type: 'arrival',
          title: 'Arrive at Airport',
          description: 'Wheelchair assistance pre-booked, accessible transportation confirmed',
          duration_hours: '2',
          accessibility: ['wheelchair_accessible', 'medical_assistance_available'],
          estimated_steps: 500,
          medical_notes: 'Take time with customs, don\'t rush'
        },
        {
          time: '11:00',
          type: 'accommodation',
          title: 'Check into Hotel',
          description: 'Accessible room with medical equipment storage, English-speaking staff',
          duration_hours: '1',
          accessibility: ['wheelchair_accessible', 'roll_in_shower', 'mini_fridge_for_medication'],
          medical_safety_features: [
            'Hospital within 1 mile',
            '24-hour English reception',
            'Elevator access',
            'Emergency call button in room'
          ]
        },
        {
          time: '12:30',
          type: 'meal',
          title: 'Lunch at Hotel Restaurant',
          description: 'Dietary needs pre-communicated, familiar foods to ease into local cuisine',
          duration_hours: '1',
          dietary_accommodations: conditions.includes('type_1_diabetes') ?
            ['diabetic_friendly', 'carb_counting_available'] : []
        },
        {
          time: '14:00',
          type: 'rest',
          title: 'Afternoon Rest & Recovery',
          description: 'Unpack, organize medications, set up room, nap if needed',
          duration_hours: '3',
          importance: 'CRITICAL',
          medical_notes: 'Store insulin properly, set up blood glucose monitor, adjust medication timing for timezone'
        },
        {
          time: '18:00',
          type: 'meal',
          title: 'Light Dinner Nearby',
          description: 'Easy walk to nearby accessible restaurant, early bedtime for jet lag',
          duration_hours: '1.5',
          estimated_steps: 300
        }
      ],
      daily_steps_estimate: 800,
      fatigue_added: 20,
      rest_periods: 1,
      medical_notes: conditions.includes('type_1_diabetes') ?
        ['Adjust insulin timing for timezone', 'Monitor blood sugar closely', 'Stay hydrated'] :
        ['Rest is priority', 'Don\'t overdo it on day 1'],
      tips: [
        'Early bedtime recommended (jet lag management)',
        'Keep medications accessible',
        'Save emergency contacts in phone'
      ]
    };
  }

  /**
   * Create rest day
   */
  createRestDay(date, dayNum, currentFatigue, conditions) {
    return {
      day_number: dayNum,
      date: date.toISOString().split('T')[0],
      title: 'Complete Rest Day',
      theme: 'Self-Care & Recovery',
      fatigue_risk: Math.max(20, currentFatigue - 30),
      fatigue_level: `Low (${Math.max(20, currentFatigue - 30)}/100)`,
      medical_safety_score: 5,
      medical_safety_display: '⭐⭐⭐⭐⭐',
      is_rest_day: true,
      activities: [
        {
          time: 'ALL DAY',
          type: 'rest',
          title: 'Restorative Rest Day',
          description: 'No scheduled activities - focus on recovery and recharging',
          suggestions: [
            'Sleep in, no alarm',
            'Light breakfast in room',
            'Gentle activities: reading, journaling, video calls',
            'Optional: Hotel spa treatment (accessible)',
            'Local neighborhood stroll at own pace (optional)',
            'Room service or casual dining'
          ],
          importance: 'CRITICAL',
          purpose: 'Prevent fatigue buildup, maintain health for remaining days'
        }
      ],
      daily_steps_estimate: 1000,
      fatigue_added: -30, // Rest day reduces fatigue
      medical_notes: [
        'Rest days are PART of the adventure',
        'Listen to your body',
        'Maintain medication schedule'
      ],
      tips: [
        'Use this day to catch up on rest',
        'Light movement is okay but optional',
        'Prepare for next active day'
      ]
    };
  }

  /**
   * Create activity day
   */
  createActivityDay({ currentDate, dayNum, availableExperiences, cumulativeFatigue, conditions, preferences, soloTravel }) {
    const maxFatigueForDay = 45; // Conservative limit
    let dayFatigue = 0;
    const activities = [];

    // Morning activity (main attraction)
    const morningExp = this.selectExperience(availableExperiences, preferences, 'morning', dayFatigue);
    if (morningExp) {
      activities.push({
        time: '09:30',
        type: 'experience',
        experience_id: morningExp.id,
        title: morningExp.name,
        description: morningExp.description,
        duration_hours: morningExp.duration_hours || '2',
        activity_level: morningExp.activity_level,
        accessibility: morningExp.inclusion_tags || [],
        accessibility_notes: morningExp.accessibility_notes,
        estimated_steps: this.estimateSteps(morningExp.activity_level, morningExp.duration_hours),
        medical_safety_features: this.extractMedicalFeatures(morningExp),
        dietary_accommodations: morningExp.dietary_accommodations || [],
        local_tip: morningExp.local_tip
      });

      dayFatigue += this.activityIntensity[morningExp.activity_level] || 20;
    }

    // Mandatory rest break
    activities.push({
      time: '11:45',
      type: 'rest',
      title: 'SCHEDULED REST BREAK',
      description: 'Mandatory break to check health, hydrate, and recover',
      duration_hours: '0.5',
      importance: 'CRITICAL',
      medical_checklist: conditions.includes('type_1_diabetes') ?
        ['Check blood glucose', 'Hydrate', 'Snack if needed', 'Monitor energy levels'] :
        ['Hydrate', 'Rest', 'Assess energy']
    });

    // Lunch
    const lunchExp = this.selectRestaurant(availableExperiences);
    if (lunchExp) {
      activities.push({
        time: '12:30',
        type: 'meal',
        experience_id: lunchExp.id,
        title: `Lunch at ${lunchExp.name}`,
        description: lunchExp.description,
        duration_hours: '1.5',
        dietary_accommodations: lunchExp.dietary_accommodations || [],
        accessibility: lunchExp.inclusion_tags || []
      });
    }

    // Afternoon rest (mandatory)
    activities.push({
      time: '14:00',
      type: 'rest',
      title: 'Return to Hotel - Mandatory Rest Period',
      description: 'You\'ve done enough for today! Relax and recharge.',
      duration_hours: '2-3',
      importance: 'CRITICAL',
      purpose: 'Prevent fatigue buildup, allow body to recover'
    });

    // Optional evening activity (only if fatigue is low)
    if (dayFatigue < 35) {
      activities.push({
        time: '18:00',
        type: 'optional',
        title: 'Optional Evening Activity',
        description: 'Gentle neighborhood stroll or dinner at nearby restaurant',
        duration_hours: '1-2',
        estimated_steps: 800,
        note: 'Only if you feel energized. Perfectly fine to skip!'
      });
    }

    return {
      day_number: dayNum,
      date: currentDate.toISOString().split('T')[0],
      title: morningExp ? `${this.getDayTheme(morningExp)}` : 'Exploration Day',
      theme: morningExp?.type || 'Cultural exploration',
      fatigue_risk: Math.min(100, cumulativeFatigue + dayFatigue),
      fatigue_level: this.getFatigueLevel(cumulativeFatigue + dayFatigue),
      medical_safety_score: this.calculateMedicalSafetyScore(activities),
      medical_safety_display: this.getStarRating(this.calculateMedicalSafetyScore(activities)),
      activities,
      daily_steps_estimate: activities.reduce((sum, act) => sum + (act.estimated_steps || 0), 0),
      fatigue_added: dayFatigue,
      rest_periods: activities.filter(a => a.type === 'rest').length,
      medical_notes: this.generateMedicalNotes(conditions, dayFatigue),
      fatigue_warning: dayFatigue > 40 ? 'If fatigue score >60 by noon, skip evening activity' : null
    };
  }

  /**
   * Select appropriate experience based on criteria
   */
  selectExperience(experiences, preferences, timeOfDay, currentFatigue) {
    // Filter by activity level (only low-moderate for health conditions)
    const suitable = experiences.filter(exp =>
      ['sedentary', 'low', 'moderate'].includes(exp.activity_level)
    );

    if (suitable.length === 0) return null;

    // Prefer experiences matching preferences
    const preferred = suitable.filter(exp =>
      exp.preference_tags?.some(tag => preferences.includes(tag))
    );

    return preferred[0] || suitable[0];
  }

  /**
   * Select restaurant experience
   */
  selectRestaurant(experiences) {
    return experiences.find(exp => exp.type === 'restaurant' || exp.type === 'cafe');
  }

  /**
   * Determine if day should be a rest day
   */
  shouldBeRestDay(cumulativeFatigue, dayNum, tripDuration, conditions) {
    // Day 4 is always a rest day (mid-trip recovery)
    if (dayNum === Math.ceil(tripDuration / 2)) return true;

    // If fatigue is high, force rest day
    const threshold = this.getFatigueThreshold(conditions);
    if (cumulativeFatigue > threshold.moderate) return true;

    // Every 3-4 days, consider rest
    if (dayNum % 3 === 0 && cumulativeFatigue > threshold.low) return true;

    return false;
  }

  /**
   * Get fatigue threshold for conditions
   */
  getFatigueThreshold(conditions) {
    if (conditions.includes('wheelchair_user')) return this.fatigueThresholds.wheelchair_user;
    if (conditions.includes('type_1_diabetes')) return this.fatigueThresholds.type_1_diabetes;
    return this.fatigueThresholds.default;
  }

  /**
   * Add health tracking metrics to itinerary
   */
  addHealthTracking(itinerary, conditions) {
    itinerary.health_tracking = {
      fatigue_management: {
        total_rest_days: itinerary.days.filter(d => d.is_rest_day).length,
        scheduled_rest_breaks: itinerary.days.reduce((sum, d) =>
          sum + d.activities.filter(a => a.type === 'rest').length, 0
        ),
        average_daily_steps: Math.round(
          itinerary.days.reduce((sum, d) => sum + (d.daily_steps_estimate || 0), 0) / itinerary.days.length
        ),
        max_fatigue_day: Math.max(...itinerary.days.map(d => d.fatigue_risk))
      },
      medical_safety: {
        average_safety_score: (itinerary.days.reduce((sum, d) =>
          sum + (d.medical_safety_score || 0), 0) / itinerary.days.length).toFixed(1),
        accessible_accommodation: true,
        emergency_plan_included: true
      }
    };

    return itinerary;
  }

  /**
   * Calculate medical safety score (1-5 stars)
   */
  calculateMedicalSafetyScore(activities) {
    let score = 5;

    // Deduct points for high-intensity activities
    const hasHighIntensity = activities.some(a => a.activity_level === 'high' || a.activity_level === 'extreme');
    if (hasHighIntensity) score -= 2;

    // Deduct if no rest breaks
    const hasRest = activities.some(a => a.type === 'rest');
    if (!hasRest) score -= 1;

    return Math.max(1, Math.min(5, score));
  }

  /**
   * Get star rating display
   */
  getStarRating(score) {
    return '⭐'.repeat(Math.round(score));
  }

  /**
   * Get fatigue level display
   */
  getFatigueLevel(fatigue) {
    if (fatigue < 30) return `Low (${fatigue}/100) ✓`;
    if (fatigue < 50) return `Moderate (${fatigue}/100)`;
    if (fatigue < 70) return `High (${fatigue}/100) ⚠️`;
    return `Critical (${fatigue}/100) 🚨`;
  }

  /**
   * Generate medical notes for day
   */
  generateMedicalNotes(conditions, fatigue) {
    const notes = [];

    if (conditions.includes('type_1_diabetes')) {
      notes.push('Monitor blood sugar before/after activities');
      notes.push('Carry glucose tablets at all times');
      if (fatigue > 40) notes.push('Higher fatigue may affect blood sugar - check more frequently');
    }

    if (conditions.includes('wheelchair_user')) {
      notes.push('Check wheelchair battery/tire pressure');
      notes.push('Plan routes with accessible transportation');
    }

    if (fatigue > 50) {
      notes.push('High fatigue - consider shortening activities');
      notes.push('Listen to your body - it\'s okay to rest more');
    }

    return notes.length > 0 ? notes : ['Stay hydrated', 'Take breaks as needed'];
  }

  /**
   * Estimate steps for activity
   */
  estimateSteps(activityLevel, durationHours) {
    const hoursNum = parseFloat(durationHours) || 2;
    const stepsPerHour = {
      sedentary: 200,
      low: 500,
      moderate: 1000,
      high: 2000,
      extreme: 3000
    };

    return Math.round((stepsPerHour[activityLevel] || 500) * hoursNum);
  }

  /**
   * Extract medical safety features from experience
   */
  extractMedicalFeatures(experience) {
    const features = [];

    if (experience.accessibility_notes) {
      if (experience.accessibility_notes.toLowerCase().includes('medical')) {
        features.push('Medical services on-site');
      }
      if (experience.accessibility_notes.toLowerCase().includes('first aid')) {
        features.push('First aid available');
      }
    }

    return features.length > 0 ? features : ['Standard safety protocols'];
  }

  /**
   * Get day theme from experience
   */
  getDayTheme(experience) {
    if (experience.type === 'museum') return 'Museum & Art Day';
    if (experience.type === 'historic_site') return 'Ancient History Day';
    if (experience.type === 'cultural_site') return 'Cultural Exploration';
    if (experience.type === 'tour') return 'Guided Tour Day';
    return 'Discovery Day';
  }

  /**
   * Generate trip summary
   */
  generateSummary(days, conditions) {
    return {
      total_days: days.length,
      activity_days: days.filter(d => !d.is_rest_day).length,
      rest_days: days.filter(d => d.is_rest_day).length,
      total_experiences: days.reduce((sum, d) =>
        sum + d.activities.filter(a => a.type === 'experience').length, 0
      ),
      average_daily_steps: Math.round(
        days.reduce((sum, d) => sum + (d.daily_steps_estimate || 0), 0) / days.length
      ),
      total_rest_breaks: days.reduce((sum, d) => sum + (d.rest_periods || 0), 0),
      max_fatigue_level: Math.max(...days.map(d => d.fatigue_risk)),
      pacing: 'Conservative - optimized for health conditions'
    };
  }
}

export default ItineraryGenerator;
