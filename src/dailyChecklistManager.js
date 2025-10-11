import dotenv from 'dotenv';

dotenv.config();

/**
 * DailyChecklistManager - Generates and manages day-by-day activity checklists
 *
 * For Sarah Mitchell's Rome trip:
 * - Converts itinerary days into actionable checklists
 * - Tracks completion progress (4/12 complete)
 * - Includes medical checkpoints (insulin, blood glucose)
 * - Generates packing lists for each activity
 * - Provides real-time check-off functionality
 */
class DailyChecklistManager {
  constructor() {
    // Checklist templates for different time periods
    this.timeSlots = {
      morning: { start: '06:00', end: '11:59', icon: '☀️' },
      afternoon: { start: '12:00', end: '17:59', icon: '🌤️' },
      evening: { start: '18:00', end: '23:59', icon: '🌙' }
    };

    // Medical checkpoint intervals for diabetes management
    this.medicalCheckpoints = {
      type_1_diabetes: [
        { time: 'before_breakfast', label: 'Morning insulin + blood glucose check', critical: true },
        { time: 'before_lunch', label: 'Pre-lunch blood glucose check', critical: false },
        { time: 'before_dinner', label: 'Evening insulin + blood glucose check', critical: true },
        { time: 'before_bed', label: 'Bedtime blood glucose check', critical: false }
      ],
      wheelchair_user: [
        { time: 'morning', label: 'Check wheelchair battery/condition', critical: true },
        { time: 'before_activity', label: 'Wheelchair accessibility verification', critical: false }
      ]
    };

    // Store checklist state
    this.checklistState = new Map(); // session_id -> { day_number -> checklist }
  }

  /**
   * Generate daily checklist from itinerary day
   * @param {Object} params - { session_id, itinerary_day, conditions, date }
   * @returns {Object} - Complete daily checklist with items organized by time
   */
  generateDailyChecklist({ session_id, itinerary_day, conditions = [], date = null, wellness_data = null }) {
    const {
      day_number,
      day_type,
      activities = [],
      fatigue_target,
      rest_breaks = 0,
      estimated_steps = 0
    } = itinerary_day;

    console.log(`\n📅 Generating checklist for Day ${day_number} (${day_type})...`);

    const checklistDate = date || new Date().toISOString().split('T')[0];
    const items = [];

    // MORNING CHECKLIST
    items.push(...this.generateMorningChecklist(conditions, wellness_data));

    // ACTIVITY CHECKLISTS
    if (day_type === 'activity' && activities.length > 0) {
      activities.forEach(activity => {
        items.push(...this.generateActivityChecklist(activity, conditions));
      });
    } else if (day_type === 'rest') {
      items.push(...this.generateRestDayChecklist(conditions));
    } else if (day_type === 'arrival') {
      items.push(...this.generateArrivalChecklist(conditions));
    }

    // EVENING CHECKLIST
    items.push(...this.generateEveningChecklist(conditions, itinerary_day));

    // Calculate progress
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const checklist = {
      session_id,
      day_number,
      date: checklistDate,
      day_type,
      items,
      progress: {
        completed,
        total,
        percentage: progress,
        display: `${completed}/${total} complete`
      },
      summary: {
        estimated_steps,
        rest_breaks,
        fatigue_target,
        activities_count: activities.length
      },
      generated_at: new Date().toISOString()
    };

    // Store in state
    this.storeChecklistState(session_id, day_number, checklist);

    console.log(`  ✅ Generated ${total} checklist items`);
    return checklist;
  }

  /**
   * Generate morning routine checklist
   */
  generateMorningChecklist(conditions, wellness_data = null) {
    const items = [];
    let itemId = 1;

    // Wellness check-in (ALWAYS FIRST)
    items.push({
      id: `morning-${itemId++}`,
      time: '08:00',
      category: 'morning',
      icon: '☀️',
      title: 'Morning wellness check-in',
      description: 'Complete your daily wellness assessment (sleep, energy, pain)',
      priority: 'HIGH',
      completed: wellness_data ? true : false,
      action_type: 'wellness_checkin',
      action_button: wellness_data ? 'View Results' : 'Start Check-In',
      estimated_duration_minutes: 2
    });

    // Diabetes morning routine
    if (conditions.includes('type_1_diabetes')) {
      items.push({
        id: `morning-${itemId++}`,
        time: '08:15',
        category: 'morning',
        icon: '💉',
        title: 'Take insulin + morning medications',
        description: 'Long-acting insulin dose (if applicable) and other medications',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'medical',
        action_button: 'Log Medication',
        reminder: true,
        estimated_duration_minutes: 5
      });

      items.push({
        id: `morning-${itemId++}`,
        time: '08:30',
        category: 'morning',
        icon: '🩸',
        title: 'Blood glucose check',
        description: 'Check fasting blood glucose and log result',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        input_field: 'glucose_mg_dl',
        target_range: '80-130 mg/dL',
        estimated_duration_minutes: 3
      });

      items.push({
        id: `morning-${itemId++}`,
        time: '09:00',
        category: 'morning',
        icon: '🍳',
        title: 'Breakfast with carb counting',
        description: 'Eat balanced breakfast, calculate carbs, adjust insulin if needed',
        priority: 'HIGH',
        completed: false,
        action_type: 'meal',
        action_button: 'Log Meal',
        input_field: 'carbs_grams',
        estimated_duration_minutes: 30
      });
    } else {
      items.push({
        id: `morning-${itemId++}`,
        time: '08:30',
        category: 'morning',
        icon: '🍳',
        title: 'Breakfast',
        description: 'Enjoy a healthy breakfast at hotel or nearby',
        priority: 'MEDIUM',
        completed: false,
        action_type: 'meal',
        estimated_duration_minutes: 30
      });
    }

    // Wheelchair maintenance
    if (conditions.includes('wheelchair_user')) {
      items.push({
        id: `morning-${itemId++}`,
        time: '08:45',
        category: 'morning',
        icon: '♿',
        title: 'Check wheelchair battery/condition',
        description: 'Verify wheelchair is charged and functioning properly',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'mobility',
        action_button: 'Mark Checked',
        checklist_items: [
          'Battery charged to 100%',
          'Tires properly inflated',
          'Brakes functioning',
          'No unusual sounds or resistance'
        ],
        estimated_duration_minutes: 5
      });
    }

    return items;
  }

  /**
   * Generate activity-specific checklist
   */
  generateActivityChecklist(activity, conditions) {
    const items = [];
    const activityTime = activity.time || '10:00';
    const prepTime = this.subtractMinutes(activityTime, 30); // 30 min before
    let itemId = 1;

    // Pre-activity preparation
    items.push({
      id: `activity-${itemId++}-${activity.name}`,
      time: prepTime,
      category: 'activity_prep',
      icon: '🎒',
      title: `Pack day bag for ${activity.name}`,
      description: 'Verify you have all necessary items before leaving',
      priority: 'HIGH',
      completed: false,
      action_type: 'packing',
      action_button: 'View Packing List',
      packing_list: this.generatePackingList(activity, conditions),
      estimated_duration_minutes: 15
    });

    // Diabetes pre-activity check
    if (conditions.includes('type_1_diabetes')) {
      items.push({
        id: `activity-${itemId++}-${activity.name}`,
        time: this.subtractMinutes(activityTime, 15),
        category: 'activity_prep',
        icon: '🩸',
        title: 'Pre-activity blood glucose check',
        description: 'Check glucose before activity, bring fast-acting carbs if low',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        input_field: 'glucose_mg_dl',
        target_range: '100-180 mg/dL',
        estimated_duration_minutes: 3
      });
    }

    // Main activity
    items.push({
      id: `activity-${itemId++}-${activity.name}`,
      time: activityTime,
      category: 'activity',
      icon: '🎯',
      title: activity.name,
      description: activity.description || 'Enjoy this experience',
      priority: 'MEDIUM',
      completed: false,
      action_type: 'activity',
      action_button: 'Start Activity',
      duration_hours: activity.duration_hours || 2,
      activity_level: activity.activity_level || 'moderate',
      accessibility_verified: conditions.includes('wheelchair_user'),
      estimated_duration_minutes: (activity.duration_hours || 2) * 60
    });

    // Mid-activity glucose check for long activities
    if (conditions.includes('type_1_diabetes') && activity.duration_hours > 3) {
      const midActivityTime = this.addMinutes(activityTime, 90); // 90 min into activity
      items.push({
        id: `activity-${itemId++}-${activity.name}`,
        time: midActivityTime,
        category: 'activity',
        icon: '🩸',
        title: 'Mid-activity glucose check',
        description: 'Check glucose during extended activity',
        priority: 'HIGH',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        input_field: 'glucose_mg_dl',
        estimated_duration_minutes: 3
      });
    }

    // Post-activity
    const postActivityTime = this.addMinutes(activityTime, (activity.duration_hours || 2) * 60);
    items.push({
      id: `activity-${itemId++}-${activity.name}`,
      time: postActivityTime,
      category: 'activity_completion',
      icon: '✅',
      title: `Complete ${activity.name}`,
      description: 'Mark activity as complete and log any notes',
      priority: 'LOW',
      completed: false,
      action_type: 'activity_complete',
      action_button: 'Mark Complete',
      input_field: 'activity_notes',
      photo_upload: true,
      estimated_duration_minutes: 5
    });

    return items;
  }

  /**
   * Generate packing list for activity
   */
  generatePackingList(activity, conditions) {
    const packingList = {
      essentials: [
        { item: 'Phone (fully charged)', checked: false },
        { item: 'Wallet with ID and credit cards', checked: false },
        { item: 'Water bottle (750ml minimum)', checked: false },
        { item: 'Portable phone charger', checked: false },
        { item: 'Sunscreen SPF 30+', checked: false },
        { item: 'Hat or sunglasses', checked: false }
      ],
      medical: [],
      activity_specific: []
    };

    // Diabetes-specific items
    if (conditions.includes('type_1_diabetes')) {
      packingList.medical.push(
        { item: 'Insulin pens/pump supplies', checked: false, critical: true },
        { item: 'Blood glucose meter + test strips', checked: false, critical: true },
        { item: 'Fast-acting glucose (tablets/gel)', checked: false, critical: true },
        { item: 'Glucagon emergency kit', checked: false, critical: true },
        { item: 'Medical ID bracelet', checked: false, critical: true },
        { item: 'Insulin cooling case (if hot weather)', checked: false, critical: true },
        { item: 'Snacks (15-30g carbs)', checked: false, critical: false }
      );
    }

    // Wheelchair-specific items
    if (conditions.includes('wheelchair_user')) {
      packingList.medical.push(
        { item: 'Wheelchair repair kit', checked: false, critical: false },
        { item: 'Backup wheelchair battery', checked: false, critical: false },
        { item: 'Cushion for comfort', checked: false, critical: false }
      );
    }

    // Activity-specific items
    const activityLevel = activity.activity_level || 'moderate';
    if (activityLevel === 'high' || activityLevel === 'extreme') {
      packingList.activity_specific.push(
        { item: 'Extra water (1.5L total)', checked: false },
        { item: 'Energy snacks', checked: false },
        { item: 'First aid kit', checked: false }
      );
    }

    if (activity.type === 'food_culinary') {
      packingList.activity_specific.push(
        { item: 'Dietary restriction card (translated)', checked: false },
        { item: 'Hand sanitizer', checked: false }
      );
    }

    return packingList;
  }

  /**
   * Generate rest day checklist
   */
  generateRestDayChecklist(conditions) {
    const items = [];
    let itemId = 1;

    items.push({
      id: `rest-${itemId++}`,
      time: '10:00',
      category: 'rest',
      icon: '😴',
      title: 'Sleep in & gentle morning',
      description: 'No alarm - wake naturally, take your time getting ready',
      priority: 'LOW',
      completed: false,
      action_type: 'rest',
      estimated_duration_minutes: 120
    });

    if (conditions.includes('type_1_diabetes')) {
      items.push({
        id: `rest-${itemId++}`,
        time: '10:30',
        category: 'rest',
        icon: '🩸',
        title: 'Blood glucose check',
        description: 'Check glucose after waking',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        estimated_duration_minutes: 3
      });
    }

    items.push({
      id: `rest-${itemId++}`,
      time: '14:00',
      category: 'rest',
      icon: '🧖',
      title: 'Optional: Hotel spa or pool',
      description: 'Gentle relaxation - completely optional based on energy',
      priority: 'LOW',
      completed: false,
      action_type: 'wellness',
      estimated_duration_minutes: 60
    });

    items.push({
      id: `rest-${itemId++}`,
      time: '18:00',
      category: 'rest',
      icon: '🛏️',
      title: 'Room service dinner',
      description: 'Relax in room, journal, review photos from previous days',
      priority: 'LOW',
      completed: false,
      action_type: 'rest',
      estimated_duration_minutes: 60
    });

    return items;
  }

  /**
   * Generate arrival day checklist
   */
  generateArrivalChecklist(conditions) {
    const items = [];
    let itemId = 1;

    items.push({
      id: `arrival-${itemId++}`,
      time: 'Upon Arrival',
      category: 'arrival',
      icon: '✈️',
      title: 'Navigate airport arrival',
      description: 'Clear customs, collect luggage, arrange accessible transport',
      priority: 'HIGH',
      completed: false,
      action_type: 'travel',
      estimated_duration_minutes: 90
    });

    items.push({
      id: `arrival-${itemId++}`,
      time: 'Check-in',
      category: 'arrival',
      icon: '🏨',
      title: 'Hotel check-in',
      description: 'Verify room accessibility, unpack essentials',
      priority: 'HIGH',
      completed: false,
      action_type: 'accommodation',
      estimated_duration_minutes: 30
    });

    if (conditions.includes('type_1_diabetes')) {
      items.push({
        id: `arrival-${itemId++}`,
        time: 'After Check-in',
        category: 'arrival',
        icon: '❄️',
        title: 'Store insulin properly',
        description: 'Refrigerate insulin, verify hotel fridge is working',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'medical',
        estimated_duration_minutes: 5
      });
    }

    items.push({
      id: `arrival-${itemId++}`,
      time: 'Evening',
      category: 'arrival',
      icon: '😴',
      title: 'Early rest to combat jet lag',
      description: 'Light dinner, early bedtime to adjust to local time',
      priority: 'MEDIUM',
      completed: false,
      action_type: 'rest',
      estimated_duration_minutes: 120
    });

    return items;
  }

  /**
   * Generate evening routine checklist
   */
  generateEveningChecklist(conditions, itinerary_day) {
    const items = [];
    let itemId = 1;

    // Diabetes evening routine
    if (conditions.includes('type_1_diabetes')) {
      items.push({
        id: `evening-${itemId++}`,
        time: '18:00',
        category: 'evening',
        icon: '🩸',
        title: 'Pre-dinner blood glucose check',
        description: 'Check glucose before evening meal',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        input_field: 'glucose_mg_dl',
        estimated_duration_minutes: 3
      });

      items.push({
        id: `evening-${itemId++}`,
        time: '18:15',
        category: 'evening',
        icon: '💉',
        title: 'Dinner insulin dose',
        description: 'Calculate carbs and take appropriate insulin dose',
        priority: 'CRITICAL',
        completed: false,
        action_type: 'medical',
        action_button: 'Log Insulin',
        estimated_duration_minutes: 5
      });

      items.push({
        id: `evening-${itemId++}`,
        time: '22:00',
        category: 'evening',
        icon: '🩸',
        title: 'Bedtime blood glucose check',
        description: 'Final glucose check before sleep (target: 100-140 mg/dL)',
        priority: 'HIGH',
        completed: false,
        action_type: 'glucose_check',
        action_button: 'Log Glucose',
        input_field: 'glucose_mg_dl',
        target_range: '100-140 mg/dL',
        estimated_duration_minutes: 3
      });
    }

    items.push({
      id: `evening-${itemId++}`,
      time: '22:30',
      category: 'evening',
      icon: '📝',
      title: 'Review today & prepare for tomorrow',
      description: 'Journal about today, check tomorrow\'s itinerary and weather',
      priority: 'LOW',
      completed: false,
      action_type: 'planning',
      estimated_duration_minutes: 15
    });

    return items;
  }

  /**
   * Update checklist item completion status
   */
  updateItemStatus({ session_id, day_number, item_id, completed, data = {} }) {
    const checklist = this.getChecklistState(session_id, day_number);
    if (!checklist) {
      throw new Error(`Checklist not found for session ${session_id}, day ${day_number}`);
    }

    const item = checklist.items.find(i => i.id === item_id);
    if (!item) {
      throw new Error(`Item ${item_id} not found in checklist`);
    }

    item.completed = completed;
    item.completed_at = completed ? new Date().toISOString() : null;

    // Store additional data (e.g., glucose readings, notes)
    if (data && Object.keys(data).length > 0) {
      item.data = { ...item.data, ...data };
    }

    // Recalculate progress
    const completedCount = checklist.items.filter(i => i.completed).length;
    checklist.progress.completed = completedCount;
    checklist.progress.percentage = Math.round((completedCount / checklist.items.length) * 100);
    checklist.progress.display = `${completedCount}/${checklist.items.length} complete`;

    this.storeChecklistState(session_id, day_number, checklist);

    console.log(`✅ Updated ${item_id}: ${completed ? 'COMPLETED' : 'UNCOMPLETED'}`);
    return checklist;
  }

  /**
   * Get current checklist for a specific day
   */
  getChecklistForDay(session_id, day_number) {
    return this.getChecklistState(session_id, day_number);
  }

  /**
   * Store checklist state
   */
  storeChecklistState(session_id, day_number, checklist) {
    if (!this.checklistState.has(session_id)) {
      this.checklistState.set(session_id, new Map());
    }
    this.checklistState.get(session_id).set(day_number, checklist);
  }

  /**
   * Get stored checklist state
   */
  getChecklistState(session_id, day_number) {
    const sessionData = this.checklistState.get(session_id);
    return sessionData ? sessionData.get(day_number) : null;
  }

  /**
   * Helper: Subtract minutes from time string
   */
  subtractMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins - minutes, 0);
    return date.toTimeString().slice(0, 5);
  }

  /**
   * Helper: Add minutes to time string
   */
  addMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0);
    return date.toTimeString().slice(0, 5);
  }
}

export default DailyChecklistManager;
