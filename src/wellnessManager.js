import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * WellnessManager - Handles morning wellness check-ins and real-time itinerary adjustments
 *
 * For Sarah Mitchell (wheelchair user + Type 1 diabetes):
 * - Tracks sleep quality, energy level, pain assessment
 * - Adjusts daily itinerary based on wellness scores
 * - Suggests rest, postponement, or modification of activities
 * - Monitors cumulative fatigue across trip
 */
class WellnessManager {
  constructor(itineraryGenerator) {
    this.itineraryGenerator = itineraryGenerator;

    // Initialize LLM for intelligent adjustment suggestions
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo',
      temperature: 0.5,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Wellness score thresholds
    this.thresholds = {
      sleep: {
        poor: 2,      // ≤2: Significant impact on day
        fair: 3,      // 3: Moderate impact
        good: 4       // ≥4: Minimal impact
      },
      energy: {
        low: 2,       // ≤2: Consider postponing activities
        moderate: 3,  // 3: Reduce activity intensity
        high: 4       // ≥4: Proceed as planned
      },
      pain: {
        none: 0,
        minor: 1,     // Can proceed with caution
        concerning: 2 // Recommend rest/medical attention
      }
    };

    // Emoji mappings for UI
    this.emojis = {
      sleep: ['😫', '😕', '😐', '🙂', '😊'],
      energy: ['🔋', '🔋🔋', '🔋🔋🔋', '🔋🔋🔋🔋', '🔋🔋🔋🔋🔋'],
      pain: ['✅ None', '⚠️ Minor', '🚨 Concerning']
    };

    // Store wellness history for trend analysis
    this.wellnessHistory = new Map(); // session_id -> [{date, scores}]
  }

  /**
   * Process morning wellness check-in
   * @param {Object} checkIn - { session_id, trip_day, sleep_score, energy_score, pain_level, additional_notes }
   * @returns {Object} - { wellness_summary, recommendations, adjusted_itinerary, should_modify }
   */
  async processCheckIn(checkIn) {
    const {
      session_id,
      trip_day,
      date,
      sleep_score,    // 1-5
      energy_score,   // 1-5
      pain_level,     // 0 (none), 1 (minor), 2 (concerning)
      additional_notes = '',
      conditions = [],
      current_itinerary = null
    } = checkIn;

    console.log(`\n☀️ Processing wellness check-in for Day ${trip_day}...`);

    // Store in history
    this.addToHistory(session_id, { date, sleep_score, energy_score, pain_level });

    // Calculate overall wellness score (0-100)
    const wellnessScore = this.calculateWellnessScore({ sleep_score, energy_score, pain_level, conditions });

    // Determine if itinerary modification is needed
    const shouldModify = this.shouldModifyItinerary({ sleep_score, energy_score, pain_level, wellnessScore });

    // Generate wellness summary
    const summary = this.generateWellnessSummary({
      sleep_score,
      energy_score,
      pain_level,
      wellnessScore,
      trip_day
    });

    // Generate recommendations
    const recommendations = await this.generateRecommendations({
      sleep_score,
      energy_score,
      pain_level,
      wellnessScore,
      conditions,
      trip_day,
      additional_notes,
      current_itinerary
    });

    // Adjust itinerary if needed
    let adjusted_itinerary = null;
    if (shouldModify && current_itinerary) {
      adjusted_itinerary = await this.adjustItinerary({
        current_itinerary,
        sleep_score,
        energy_score,
        pain_level,
        wellnessScore,
        conditions,
        trip_day
      });
    }

    return {
      wellness_summary: summary,
      wellness_score: wellnessScore,
      recommendations,
      should_modify: shouldModify,
      adjusted_itinerary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall wellness score (0-100)
   */
  calculateWellnessScore({ sleep_score, energy_score, pain_level, conditions }) {
    // Base scoring
    let score = 0;

    // Sleep contributes 30%
    score += (sleep_score / 5) * 30;

    // Energy contributes 40% (most important for daily activities)
    score += (energy_score / 5) * 40;

    // Pain reduces score (contributes 30%)
    if (pain_level === 0) {
      score += 30;
    } else if (pain_level === 1) {
      score += 15; // Minor pain = half credit
    } else {
      score += 0;  // Concerning pain = no credit
    }

    // Condition-specific adjustments
    if (conditions.includes('type_1_diabetes')) {
      // Diabetes makes fatigue more impactful
      if (energy_score <= 2) {
        score -= 10;
      }
    }

    if (conditions.includes('wheelchair_user')) {
      // Physical pain more critical for mobility
      if (pain_level === 2) {
        score -= 15;
      }
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Determine if itinerary modification is recommended
   */
  shouldModifyItinerary({ sleep_score, energy_score, pain_level, wellnessScore }) {
    // Critical thresholds that require modification
    if (pain_level === 2) return true;  // Concerning pain
    if (energy_score <= 2) return true; // Very low energy
    if (wellnessScore < 50) return true; // Overall poor wellness
    if (sleep_score <= 2 && energy_score <= 3) return true; // Poor sleep + low energy combo

    return false;
  }

  /**
   * Generate human-readable wellness summary
   */
  generateWellnessSummary({ sleep_score, energy_score, pain_level, wellnessScore, trip_day }) {
    const sleepEmoji = this.emojis.sleep[sleep_score - 1] || '😐';
    const energyEmoji = this.emojis.energy[energy_score - 1] || '🔋🔋🔋';
    const painText = this.emojis.pain[pain_level] || 'Unknown';

    let overallStatus;
    if (wellnessScore >= 75) {
      overallStatus = '💚 Feeling Great!';
    } else if (wellnessScore >= 50) {
      overallStatus = '💛 Doing OK';
    } else if (wellnessScore >= 30) {
      overallStatus = '🧡 Need Extra Care';
    } else {
      overallStatus = '❤️ Rest Day Recommended';
    }

    return {
      day: trip_day,
      overall_status: overallStatus,
      wellness_score: wellnessScore,
      sleep: {
        score: sleep_score,
        emoji: sleepEmoji,
        text: sleep_score >= 4 ? 'Rested' : sleep_score >= 3 ? 'Adequate' : 'Poor'
      },
      energy: {
        score: energy_score,
        emoji: energyEmoji,
        text: energy_score >= 4 ? 'High' : energy_score >= 3 ? 'Moderate' : 'Low'
      },
      pain: {
        level: pain_level,
        text: painText
      }
    };
  }

  /**
   * Generate personalized recommendations based on wellness check-in
   */
  async generateRecommendations({
    sleep_score,
    energy_score,
    pain_level,
    wellnessScore,
    conditions,
    trip_day,
    additional_notes,
    current_itinerary
  }) {
    const recommendations = [];

    // Critical pain recommendations
    if (pain_level === 2) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'medical',
        icon: '🚨',
        title: 'Medical Attention Recommended',
        message: 'You reported concerning pain. Consider consulting with a local medical professional before continuing activities.',
        actions: ['Find Nearby Hospital', 'Call Emergency Contact', 'Rest Today']
      });

      recommendations.push({
        priority: 'HIGH',
        category: 'itinerary',
        icon: '🛏️',
        title: 'Convert to Rest Day',
        message: 'We recommend converting today to a complete rest day to allow recovery.',
        actions: ['View Rest Day Activities', 'Postpone to Tomorrow']
      });
    }

    // Low energy recommendations
    if (energy_score <= 2) {
      recommendations.push({
        priority: 'HIGH',
        category: 'itinerary',
        icon: '⚡',
        title: 'Low Energy Detected',
        message: 'Your energy is low today. Consider reducing activity intensity or postponing activities.',
        actions: ['Shorten Visit Duration', 'Add Extra Rest Breaks', 'Postpone Activity']
      });

      if (conditions.includes('type_1_diabetes')) {
        recommendations.push({
          priority: 'HIGH',
          category: 'medical',
          icon: '🩸',
          title: 'Check Blood Glucose',
          message: 'Low energy can indicate blood sugar issues. Check your glucose levels before activities.',
          actions: ['Log Blood Glucose', 'Review Meal Plan']
        });
      }
    }

    // Poor sleep recommendations
    if (sleep_score <= 2) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'wellness',
        icon: '😴',
        title: 'Sleep Recovery',
        message: 'Poor sleep detected. Start your day slower and avoid high-intensity activities.',
        actions: ['Delay Morning Start', 'Add Afternoon Nap', 'Reduce Walking']
      });
    }

    // Minor pain management
    if (pain_level === 1) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'wellness',
        icon: '💊',
        title: 'Pain Management',
        message: 'You reported minor pain. Take it easy today and monitor your condition.',
        actions: ['Take Pain Medication', 'Add More Rest Breaks', 'Reduce Activity Level']
      });
    }

    // Condition-specific recommendations
    if (conditions.includes('wheelchair_user')) {
      if (energy_score <= 3 || pain_level >= 1) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'mobility',
          icon: '♿',
          title: 'Mobility Support',
          message: 'Consider requesting additional mobility assistance or reducing walking distances today.',
          actions: ['Request Mobility Aid', 'Choose Wheelchair-Friendly Routes', 'Use Accessible Transport']
        });
      }
    }

    // Positive reinforcement for good wellness
    if (wellnessScore >= 75) {
      recommendations.push({
        priority: 'LOW',
        category: 'encouragement',
        icon: '🎉',
        title: 'You\'re Doing Great!',
        message: 'Your wellness score is excellent. Enjoy your day while staying mindful of your limits.',
        actions: ['View Today\'s Itinerary', 'Add Optional Activity']
      });
    }

    // Use AI for additional contextual recommendations if API key available
    if (process.env.OPENAI_API_KEY && additional_notes) {
      try {
        const aiRecommendation = await this.getAIRecommendation({
          sleep_score,
          energy_score,
          pain_level,
          conditions,
          additional_notes,
          current_itinerary
        });

        if (aiRecommendation) {
          recommendations.push(aiRecommendation);
        }
      } catch (error) {
        console.log('⚠️  AI recommendations unavailable, using template recommendations');
      }
    }

    return recommendations;
  }

  /**
   * Get AI-generated contextual recommendation
   */
  async getAIRecommendation({ sleep_score, energy_score, pain_level, conditions, additional_notes, current_itinerary }) {
    const prompt = `You are a travel wellness advisor for a traveler with health conditions. Based on their morning check-in, provide ONE specific, actionable recommendation.

Traveler Conditions: ${conditions.join(', ')}
Sleep Quality: ${sleep_score}/5
Energy Level: ${energy_score}/5
Pain Level: ${pain_level === 0 ? 'None' : pain_level === 1 ? 'Minor' : 'Concerning'}
Additional Notes: ${additional_notes}

Today's Activities: ${current_itinerary ? current_itinerary.activities?.map(a => a.name).join(', ') : 'Unknown'}

Provide ONE recommendation in this exact JSON format:
{
  "priority": "MEDIUM",
  "category": "wellness",
  "icon": "emoji",
  "title": "Short title",
  "message": "One sentence recommendation",
  "actions": ["Action 1", "Action 2"]
}`;

    try {
      const response = await this.llm.invoke([{ role: 'user', content: prompt }]);
      const content = response.content.trim();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      }
    } catch (error) {
      console.log('⚠️  Could not generate AI recommendation:', error.message);
    }

    return null;
  }

  /**
   * Adjust itinerary based on wellness scores
   */
  async adjustItinerary({
    current_itinerary,
    sleep_score,
    energy_score,
    pain_level,
    wellnessScore,
    conditions,
    trip_day
  }) {
    const adjusted = JSON.parse(JSON.stringify(current_itinerary)); // Deep clone

    console.log(`📝 Adjusting itinerary for wellness score ${wellnessScore}...`);

    // Critical: Convert to rest day
    if (pain_level === 2 || wellnessScore < 30) {
      adjusted.day_type = 'rest';
      adjusted.activities = this.getRestDayActivities(conditions);
      adjusted.adjustment_reason = 'Converted to rest day due to concerning wellness indicators';
      adjusted.fatigue_added = 10; // Minimal fatigue for rest
      adjusted.medical_safety = 5;

      console.log('  → Converted to COMPLETE REST DAY');
      return adjusted;
    }

    // High: Reduce activity intensity
    if (energy_score <= 2 || wellnessScore < 50) {
      // Reduce duration of each activity by 30-50%
      if (adjusted.activities && adjusted.activities.length > 0) {
        adjusted.activities = adjusted.activities.map(activity => {
          const originalDuration = activity.duration_hours || 2;
          const reducedDuration = Math.max(1, originalDuration * 0.5); // 50% reduction

          return {
            ...activity,
            duration_hours: reducedDuration,
            adjustment: `Duration reduced from ${originalDuration}h to ${reducedDuration}h due to low energy`
          };
        });
      }

      // Add extra rest breaks
      adjusted.rest_breaks = (adjusted.rest_breaks || 0) + 2;
      adjusted.fatigue_added = Math.round((adjusted.fatigue_added || 30) * 0.6); // 40% fatigue reduction
      adjusted.adjustment_reason = 'Activity duration reduced and rest breaks added due to low wellness score';

      console.log('  → Reduced activity intensity by 50%, added 2 rest breaks');
      return adjusted;
    }

    // Medium: Add rest breaks and reduce walking
    if (sleep_score <= 2 || energy_score === 3) {
      adjusted.rest_breaks = (adjusted.rest_breaks || 0) + 1;
      adjusted.estimated_steps = Math.round((adjusted.estimated_steps || 2000) * 0.75); // 25% walking reduction
      adjusted.fatigue_added = Math.round((adjusted.fatigue_added || 30) * 0.85); // 15% fatigue reduction
      adjusted.adjustment_reason = 'Added rest breaks and reduced walking due to moderate fatigue';

      console.log('  → Added 1 rest break, reduced walking by 25%');
      return adjusted;
    }

    // Minor pain adjustments
    if (pain_level === 1 && conditions.includes('wheelchair_user')) {
      adjusted.accessibility_note = 'Extra mobility assistance recommended due to reported pain';
      adjusted.rest_breaks = (adjusted.rest_breaks || 0) + 1;

      console.log('  → Added accessibility note and 1 rest break');
      return adjusted;
    }

    // No adjustment needed
    console.log('  → No adjustment needed, wellness within acceptable range');
    adjusted.adjustment_reason = 'No adjustment - wellness indicators are acceptable';
    return adjusted;
  }

  /**
   * Get rest day activities suitable for recovery
   */
  getRestDayActivities(conditions) {
    const activities = [
      {
        time: '10:00',
        name: 'Sleep In & Gentle Morning',
        description: 'No alarm - wake naturally, enjoy breakfast in bed or hotel restaurant',
        duration_hours: 2,
        activity_level: 'sedentary',
        type: 'rest'
      },
      {
        time: '14:00',
        name: 'Optional: Hotel Spa or Pool',
        description: 'Gentle relaxation if you\'re feeling up to it - completely optional',
        duration_hours: 1,
        activity_level: 'low',
        type: 'wellness'
      },
      {
        time: '18:00',
        name: 'Room Service Dinner',
        description: 'Enjoy dinner in your room, catch up on journaling or photos',
        duration_hours: 1,
        activity_level: 'sedentary',
        type: 'dining'
      }
    ];

    if (conditions.includes('type_1_diabetes')) {
      activities.push({
        time: 'Throughout Day',
        name: 'Regular Glucose Monitoring',
        description: 'Check blood glucose every 4 hours during rest day',
        duration_hours: 0.25,
        activity_level: 'sedentary',
        type: 'medical'
      });
    }

    return activities;
  }

  /**
   * Store wellness check-in in history for trend analysis
   */
  addToHistory(session_id, data) {
    if (!this.wellnessHistory.has(session_id)) {
      this.wellnessHistory.set(session_id, []);
    }
    this.wellnessHistory.get(session_id).push({
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Get wellness trend analysis
   */
  getWellnessTrend(session_id, days = 3) {
    const history = this.wellnessHistory.get(session_id) || [];
    const recentHistory = history.slice(-days);

    if (recentHistory.length === 0) return null;

    const avgSleep = recentHistory.reduce((sum, h) => sum + h.sleep_score, 0) / recentHistory.length;
    const avgEnergy = recentHistory.reduce((sum, h) => sum + h.energy_score, 0) / recentHistory.length;

    return {
      days_tracked: recentHistory.length,
      average_sleep: avgSleep.toFixed(1),
      average_energy: avgEnergy.toFixed(1),
      trend: avgEnergy >= 3.5 ? 'improving' : avgEnergy >= 2.5 ? 'stable' : 'declining'
    };
  }
}

export default WellnessManager;
