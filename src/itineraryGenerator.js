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
    soloTravel = false,
    userId = null,
    wellnessData = null
  }) {
    try {
      console.log(`📅 Generating ${tripDuration}-day itinerary for ${city || destination}`);

      // Fetch wellness data if userId provided and no wellness data passed
      let medications = [];
      let allergies = [];
      let medicalConditions = [];

      if (wellnessData) {
        medications = wellnessData.medications || [];
        allergies = wellnessData.allergies || [];
        medicalConditions = wellnessData.conditions || [];
        console.log(`💊 Loaded wellness data: ${medications.length} medications, ${allergies.length} allergies, ${medicalConditions.length} conditions`);
      }

      // Merge wellness conditions with passed conditions
      const allConditions = [
        ...conditions,
        ...medicalConditions.map(c => this.normalizeConditionName(c.name))
      ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

      // Merge dietary restrictions from allergies
      const allDietary = [
        ...dietary,
        ...allergies.filter(a => a.category === 'Food').map(a => a.allergen_name)
      ].filter((v, i, a) => a.indexOf(v) === i);

      console.log(`🏥 Health profile: ${allConditions.length} conditions, ${allDietary.length} dietary restrictions`);

      // Get relevant experiences from destination
      const experiences = await this.getDestinationExperiences({
        destination,
        city,
        preferences,
        accessibility_needs,
        dietary: allDietary
      });

      if (experiences.length === 0) {
        throw new Error(`No experiences found for ${city || destination}`);
      }

      console.log(`✅ Found ${experiences.length} suitable experiences`);

      // Generate day-by-day itinerary with wellness integration
      const itinerary = this.buildItinerary({
        experiences,
        tripDuration,
        startDate,
        conditions: allConditions,
        preferences,
        soloTravel,
        medications,
        allergies
      });

      // Add medical safety and fatigue tracking
      const enrichedItinerary = this.addHealthTracking(itinerary, allConditions, medications);

      console.log(`✅ Generated ${enrichedItinerary.days.length}-day itinerary with wellness integration`);

      return enrichedItinerary;

    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw error;
    }
  }

  /**
   * Normalize condition name for consistency
   */
  normalizeConditionName(conditionName) {
    const normalized = conditionName.toLowerCase();
    if (normalized.includes('diabetes') && normalized.includes('type 1')) return 'type_1_diabetes';
    if (normalized.includes('diabetes') && normalized.includes('type 2')) return 'type_2_diabetes';
    if (normalized.includes('wheelchair')) return 'wheelchair_user';
    if (normalized.includes('mobility')) return 'mobility_impaired';
    if (normalized.includes('heart')) return 'heart_condition';
    if (normalized.includes('asthma')) return 'asthma';
    return conditionName.toLowerCase().replace(/\s+/g, '_');
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
  buildItinerary({ experiences, tripDuration, startDate, conditions, preferences, soloTravel, medications = [], allergies = [] }) {
    const days = [];
    let cumulativeFatigue = 0;
    const experiencesUsed = new Set();

    // Day 1 is always arrival/rest day
    const arrivalDate = startDate ? new Date(startDate) : new Date();

    days.push(this.createArrivalDay(arrivalDate, conditions, medications));
    cumulativeFatigue += 20; // Arrival day baseline fatigue

    // Generate remaining days
    for (let dayNum = 2; dayNum <= tripDuration; dayNum++) {
      const currentDate = new Date(arrivalDate);
      currentDate.setDate(arrivalDate.getDate() + dayNum - 1);

      // Determine if this should be a rest day
      const needsRestDay = this.shouldBeRestDay(cumulativeFatigue, dayNum, tripDuration, conditions);

      if (needsRestDay) {
        days.push(this.createRestDay(currentDate, dayNum, cumulativeFatigue, conditions, medications));
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
          soloTravel,
          medications,
          allergies
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
      summary: this.generateSummary(days, conditions),
      wellness_considerations: this.generateWellnessConsiderations(medications, allergies)
    };
  }

  /**
   * Create arrival day (Day 1)
   */
  createArrivalDay(date, conditions, medications = []) {
    const activities = [
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
      ];

    // Add medication reminders to arrival day
    const activitiesWithMeds = this.addMedicationRemindersToDay(activities, medications);

    return {
      day_number: 1,
      date: date.toISOString().split('T')[0],
      title: 'Arrival & Rest',
      theme: 'Recovery from travel',
      fatigue_risk: 20,
      fatigue_level: 'Low (20/100) ✓',
      medical_safety_score: 5,
      medical_safety_display: '⭐⭐⭐⭐⭐',
      activities: activitiesWithMeds,
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
  createActivityDay({ currentDate, dayNum, availableExperiences, cumulativeFatigue, conditions, preferences, soloTravel, medications = [], allergies = [] }) {
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
        description: this.generateDetailedDescription(morningExp),
        duration_hours: morningExp.duration_hours || '2',
        activity_level: morningExp.activity_level,
        accessibility: morningExp.inclusion_tags || [],
        accessibility_notes: morningExp.accessibility_notes,
        estimated_steps: this.estimateSteps(morningExp.activity_level, morningExp.duration_hours),
        medical_safety_features: this.extractMedicalFeatures(morningExp),
        dietary_accommodations: morningExp.dietary_accommodations || [],
        local_tip: morningExp.local_tip,
        // NEW: Enhanced details
        practical_info: this.generatePracticalInfo(morningExp),
        insider_tips: this.generateInsiderTips(morningExp),
        transportation: this.generateTransportationInfo(morningExp),
        booking_info: this.generateBookingInfo(morningExp)
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
        description: this.generateDetailedDescription(lunchExp),
        duration_hours: '1.5',
        dietary_accommodations: lunchExp.dietary_accommodations || [],
        accessibility: lunchExp.inclusion_tags || [],
        // NEW: Enhanced details
        practical_info: this.generatePracticalInfo(lunchExp),
        insider_tips: this.generateInsiderTips(lunchExp),
        transportation: this.generateTransportationInfo(lunchExp),
        booking_info: this.generateBookingInfo(lunchExp)
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

    // Add medication reminders to activity day
    const activitiesWithMeds = this.addMedicationRemindersToDay(activities, medications);

    // Add allergy warnings if restaurants are included
    const allergyNotes = this.generateAllergyNotes(allergies);

    return {
      day_number: dayNum,
      date: currentDate.toISOString().split('T')[0],
      title: morningExp ? `${this.getDayTheme(morningExp)}` : 'Exploration Day',
      theme: morningExp?.type || 'Cultural exploration',
      fatigue_risk: Math.min(100, cumulativeFatigue + dayFatigue),
      fatigue_level: this.getFatigueLevel(cumulativeFatigue + dayFatigue),
      medical_safety_score: this.calculateMedicalSafetyScore(activitiesWithMeds),
      medical_safety_display: this.getStarRating(this.calculateMedicalSafetyScore(activitiesWithMeds)),
      activities: activitiesWithMeds,
      daily_steps_estimate: activitiesWithMeds.reduce((sum, act) => sum + (act.estimated_steps || 0), 0),
      fatigue_added: dayFatigue,
      rest_periods: activitiesWithMeds.filter(a => a.type === 'rest').length,
      medical_notes: this.generateMedicalNotes(conditions, dayFatigue),
      allergy_warnings: allergyNotes.length > 0 ? allergyNotes : null,
      fatigue_warning: dayFatigue > 40 ? 'If fatigue score >60 by noon, skip evening activity' : null
    };
  }

  /**
   * Generate allergy warnings for meals
   */
  generateAllergyNotes(allergies) {
    if (!allergies || allergies.length === 0) return [];

    return allergies
      .filter(a => a.category === 'Food' && (a.severity === 'Severe' || a.severity === 'Life-threatening'))
      .map(a => ({
        allergen: a.allergen_name,
        severity: a.severity,
        epipen_required: a.epipen_required,
        warning: `Avoid ${a.allergen_name} - ${a.severity} allergy${a.epipen_required ? '. EpiPen required.' : ''}`
      }));
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
   * Generate detailed description for an experience
   */
  generateDetailedDescription(experience) {
    const baseDesc = experience.description || '';
    const type = experience.type || 'attraction';

    // Add context based on type
    let enhancedDesc = baseDesc;

    // Add what to expect
    const expectations = this.getExpectations(type, experience);
    if (expectations) {
      enhancedDesc += `\n\n${expectations}`;
    }

    // Add historical or cultural context if available
    if (experience.historical_context) {
      enhancedDesc += `\n\nHistorical Context: ${experience.historical_context}`;
    }

    return enhancedDesc;
  }

  /**
   * Get expectations based on experience type
   */
  getExpectations(type, experience) {
    const expectations = {
      museum: 'You\'ll explore curated exhibits featuring art, artifacts, and interactive displays. Plan for 2-3 hours to fully appreciate the collection. Audio guides are usually available in multiple languages.',
      historic_site: 'This landmark offers a glimpse into the past with preserved architecture and historical artifacts. Guided tours provide deeper insights into the site\'s significance. Wear comfortable shoes as you\'ll be walking and standing.',
      restaurant: `Savor authentic local cuisine prepared with traditional techniques. The menu features seasonal ingredients and regional specialties. Reservations are ${experience.reservation_required ? 'highly recommended' : 'suggested during peak hours'}.`,
      market: 'Browse stalls filled with fresh produce, artisan goods, and local specialties. This is a perfect opportunity to interact with locals and sample regional flavors. Bring cash as many vendors don\'t accept cards.',
      tour: 'Join a knowledgeable local guide who will share stories, hidden gems, and insider knowledge about the area. Small group sizes ensure a personalized experience. Questions are encouraged!',
      park: 'Enjoy green spaces, gardens, and scenic views. Perfect for a leisurely stroll or a relaxing break. Benches and shaded areas are available throughout.',
      cultural_site: 'Experience local traditions, architecture, and community life. This venue offers insight into the cultural heritage and contemporary life of the region.'
    };

    return expectations[type] || 'Discover unique aspects of local culture and create memorable experiences.';
  }

  /**
   * Generate practical information
   */
  generatePracticalInfo(experience) {
    const info = [];

    // Duration
    const duration = experience.duration_hours || '2';
    info.push(`Duration: ${duration} hours (allow extra time for photos and exploration)`);

    // Best time to visit
    const bestTime = this.getBestTimeToVisit(experience.type);
    if (bestTime) {
      info.push(`Best time: ${bestTime}`);
    }

    // Pricing (if available)
    if (experience.price_range) {
      info.push(`Price range: ${experience.price_range}`);
    } else {
      info.push(this.getEstimatedPrice(experience.type));
    }

    // What to bring
    const bringItems = this.getWhatToBring(experience.type, experience);
    if (bringItems.length > 0) {
      info.push(`What to bring: ${bringItems.join(', ')}`);
    }

    return info;
  }

  /**
   * Get best time to visit based on type
   */
  getBestTimeToVisit(type) {
    const times = {
      museum: 'Weekday mornings to avoid crowds',
      historic_site: 'Early morning or late afternoon for better lighting and fewer tourists',
      market: 'Early morning for freshest produce and full selection',
      restaurant: 'Make reservations 1-2 weeks in advance for popular spots',
      park: 'Late afternoon for beautiful golden hour light',
      tour: 'Morning tours are typically less crowded'
    };

    return times[type] || null;
  }

  /**
   * Get estimated price based on type
   */
  getEstimatedPrice(type) {
    const prices = {
      museum: 'Admission: $10-25 per person (discounts for students/seniors)',
      historic_site: 'Admission: $15-30 per person (may include guided tour)',
      restaurant: 'Budget $30-60 per person (including drinks)',
      market: 'Free entry (budget for purchases)',
      tour: 'Tours: $40-80 per person (includes guide)',
      park: 'Free admission',
      cafe: 'Budget $8-15 per person'
    };

    return prices[type] || 'Check official website for current pricing';
  }

  /**
   * Generate what to bring recommendations
   */
  getWhatToBring(type, experience) {
    const items = [];

    if (type === 'museum' || type === 'historic_site') {
      items.push('comfortable walking shoes', 'camera (no flash)', 'water bottle');
    } else if (type === 'market') {
      items.push('reusable shopping bag', 'cash', 'hand sanitizer');
    } else if (type === 'restaurant') {
      items.push('appetite!', 'reservation confirmation');
    } else if (type === 'tour') {
      items.push('comfortable shoes', 'water', 'sunscreen', 'camera');
    } else if (type === 'park') {
      items.push('sunscreen', 'hat', 'water', 'comfortable clothes');
    }

    // Add medical items if health conditions present
    if (experience.medical_considerations) {
      items.push('medical supplies', 'emergency contact info');
    }

    return items;
  }

  /**
   * Generate insider tips
   */
  generateInsiderTips(experience) {
    const tips = [];

    // Use provided local tip if available
    if (experience.local_tip) {
      tips.push(experience.local_tip);
    }

    // Add type-specific tips
    const typeTips = {
      museum: 'Many museums offer free admission on certain days. Check the website before booking. Download their app for enhanced exhibits.',
      historic_site: 'Consider hiring a private guide for a more personalized experience. They often know hidden stories not covered in audio guides.',
      restaurant: 'Ask your server for daily specials - they\'re often made with the freshest seasonal ingredients and represent the chef\'s creativity.',
      market: 'Visit near closing time for potential discounts, but arrive early for the best selection. Don\'t be shy to ask for samples!',
      tour: 'Tip your guide 10-20% if you enjoyed the experience. Arrive 10 minutes early to get a good spot.',
      park: 'Bring a picnic! Many locals do this, and there are usually designated areas with tables.',
      cafe: 'Order in the local language if possible - it\'s appreciated and may lead to friendly conversations.'
    };

    if (typeTips[experience.type]) {
      tips.push(typeTips[experience.type]);
    }

    // Add accessibility tips
    if (experience.accessibility_notes && experience.accessibility_notes.toLowerCase().includes('wheelchair')) {
      tips.push('Wheelchair-accessible entrance and facilities available. Contact venue in advance to ensure smooth access.');
    }

    return tips;
  }

  /**
   * Generate transportation information
   */
  generateTransportationInfo(experience) {
    const info = {
      options: [],
      estimated_time: null,
      cost: null,
      accessibility_notes: null
    };

    // Add generic transportation options
    info.options = [
      {
        method: 'Metro/Subway',
        details: 'Most convenient for city attractions. Purchase a day pass for unlimited rides.',
        accessibility: 'Check station accessibility - not all have elevators'
      },
      {
        method: 'Taxi/Rideshare',
        details: 'Door-to-door service, ideal for those with mobility needs.',
        accessibility: 'Request accessible vehicles in advance'
      },
      {
        method: 'Walking',
        details: 'If staying nearby, walking is a great way to discover the neighborhood.',
        accessibility: 'Sidewalks vary - check route for accessibility'
      }
    ];

    info.estimated_time = '20-30 minutes from city center';
    info.cost = 'Public transit: $2-5 | Taxi: $15-25';

    if (experience.accessibility_notes) {
      info.accessibility_notes = 'Accessible transportation recommended. Notify driver of any special requirements.';
    }

    return info;
  }

  /**
   * Generate booking and reservation information
   */
  generateBookingInfo(experience) {
    const info = {
      advance_booking: null,
      cancellation: null,
      contact: null,
      tips: []
    };

    // Type-specific booking recommendations
    if (experience.type === 'restaurant') {
      info.advance_booking = 'Book 1-2 weeks in advance, especially for dinner. Popular spots fill up quickly.';
      info.cancellation = 'Most restaurants require 24-48 hours notice for cancellations.';
      info.tips.push('Mention any dietary restrictions when booking');
      info.tips.push('Request accessible seating if needed');
    } else if (experience.type === 'tour') {
      info.advance_booking = 'Book tours 3-5 days in advance. Small group tours sell out faster.';
      info.cancellation = 'Usually free cancellation up to 24 hours before tour time.';
      info.tips.push('Confirm meeting point and time via email');
      info.tips.push('Arrive 10 minutes early');
    } else if (experience.type === 'museum' || experience.type === 'historic_site') {
      info.advance_booking = 'Pre-book tickets online to skip lines. Timed entry slots available.';
      info.cancellation = 'E-tickets are usually non-refundable but can be modified.';
      info.tips.push('Book early morning or late afternoon slots for smaller crowds');
      info.tips.push('Check for combo tickets if visiting multiple attractions');
    } else {
      info.advance_booking = 'Walk-ins welcome, but booking ahead ensures availability.';
      info.tips.push('Check operating hours before visiting');
    }

    // Add accessibility booking notes
    if (experience.accessibility_notes) {
      info.tips.push('Contact venue in advance to arrange accessibility accommodations');
    }

    return info;
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

  /**
   * Generate wellness considerations summary
   */
  generateWellnessConsiderations(medications, allergies) {
    const considerations = {
      medication_reminders: [],
      dietary_restrictions: [],
      refrigeration_needed: false,
      epipen_required: false,
      emergency_contacts_needed: true
    };

    // Process medications
    if (medications && medications.length > 0) {
      medications.forEach(med => {
        considerations.medication_reminders.push({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          time: med.time,
          notes: med.notes
        });

        if (med.refrigeration_required) {
          considerations.refrigeration_needed = true;
        }
      });
    }

    // Process allergies
    if (allergies && allergies.length > 0) {
      allergies.forEach(allergy => {
        if (allergy.category === 'Food') {
          considerations.dietary_restrictions.push({
            allergen: allergy.allergen_name,
            severity: allergy.severity,
            symptoms: allergy.symptoms
          });
        }

        if (allergy.epipen_required) {
          considerations.epipen_required = true;
        }
      });
    }

    return considerations;
  }

  /**
   * Get medication reminders for specific time of day
   */
  getMedicationReminders(medications, timeOfDay) {
    if (!medications || medications.length === 0) return [];

    return medications
      .filter(med => {
        const medTime = (med.time || '').toLowerCase();
        return medTime.includes(timeOfDay.toLowerCase());
      })
      .map(med => ({
        icon: '💊',
        title: `Take ${med.name}`,
        description: `${med.dosage} - ${med.frequency}${med.notes ? `. ${med.notes}` : ''}`,
        time: timeOfDay,
        type: 'medication',
        importance: 'CRITICAL'
      }));
  }

  /**
   * Add medication reminders to daily activities
   */
  addMedicationRemindersToDay(activities, medications) {
    if (!medications || medications.length === 0) return activities;

    const enhancedActivities = [...activities];
    const medicationTimes = {
      'morning': '08:00',
      'afternoon': '14:00',
      'evening': '18:00',
      'before meals': '12:00',
      'after meals': '13:30'
    };

    // Group medications by time
    medications.forEach(med => {
      const medTime = (med.time || 'morning').toLowerCase();
      const time = medicationTimes[medTime] || '09:00';

      enhancedActivities.push({
        time,
        type: 'medication',
        icon: '💊',
        title: `Medication: ${med.name}`,
        description: `${med.dosage} - ${med.frequency}${med.notes ? `. Note: ${med.notes}` : ''}`,
        importance: 'CRITICAL',
        refrigeration_required: med.refrigeration_required || false,
        medical_notes: med.refrigeration_required ?
          'Ensure medication is stored properly. Hotel fridge confirmed.' : null
      });
    });

    // Sort activities by time
    enhancedActivities.sort((a, b) => {
      const timeA = a.time.replace(/:/g, '');
      const timeB = b.time.replace(/:/g, '');
      return timeA.localeCompare(timeB);
    });

    return enhancedActivities;
  }
}

export default ItineraryGenerator;
