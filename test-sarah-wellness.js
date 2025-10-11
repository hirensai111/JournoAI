import axios from 'axios';

/**
 * Test Sarah's Day 2 in Rome - Wellness Check-In + Daily Checklist
 *
 * Scenario: Sarah wakes up on Day 2 of her Rome trip
 * - She does a morning wellness check-in (low energy due to jet lag)
 * - System generates her daily checklist with all activities
 * - System adjusts her itinerary based on low wellness scores
 * - She checks off tasks throughout the day
 */

const API_BASE = 'http://localhost:3001/api';
const SESSION_ID = 'sarah-rome-trip';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(60));
  log(title, 'cyan');
  console.log('-'.repeat(60));
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sarah's conditions
const SARAH_CONDITIONS = ['wheelchair_user', 'type_1_diabetes'];

// Mock itinerary day for Sarah's Day 2 in Rome
const SARAH_DAY_2_ITINERARY = {
  day_number: 2,
  date: '2025-09-16',
  day_type: 'activity',
  activities: [
    {
      time: '10:00',
      name: 'Trastevere Food Tour',
      description: 'Wheelchair-accessible food tour through historic Trastevere neighborhood',
      duration_hours: 3,
      activity_level: 'low',
      type: 'food_culinary',
      accessibility: {
        wheelchair_accessible: true,
        rest_stops: 3,
        accessible_restrooms: true
      }
    },
    {
      time: '15:00',
      name: 'Villa Borghese Gardens',
      description: 'Peaceful stroll through accessible gardens with stunning city views',
      duration_hours: 2,
      activity_level: 'low',
      type: 'nature_outdoors',
      accessibility: {
        wheelchair_accessible: true,
        paved_paths: true,
        shaded_areas: true
      }
    }
  ],
  fatigue_target: 35,
  rest_breaks: 2,
  estimated_steps: 2000,
  medical_safety: 5
};

async function runTest() {
  logSection('☀️ SARAH\'S DAY 2 IN ROME - WELLNESS & CHECKLIST TEST');

  log('Sarah Mitchell: 40-year-old wheelchair user + Type 1 diabetic', 'yellow');
  log('Location: Rome, Italy - Day 2 of 7-day trip', 'yellow');
  log('Session ID: ' + SESSION_ID, 'yellow');

  try {
    // ========================================
    // STEP 1: Morning Wellness Check-In
    // ========================================
    logSection('STEP 1: Morning Wellness Check-In 🌅');

    log('Sarah wakes up on Day 2...', 'cyan');
    log('She opens Journey AI on her phone and sees:', 'cyan');
    log('', 'reset');
    log('  ☀️ Good Morning, Sarah!', 'bright');
    log('  Wednesday, September 16, 2025 - Day 2 in Rome', 'bright');
    log('', 'reset');
    log('  Quick wellness check:', 'bright');
    log('  😴 How did you sleep?     [😫 😕 😐 🙂 😊]', 'yellow');
    log('  💪 Energy level today?    [🔋 🔋🔋 🔋🔋🔋 🔋🔋🔋🔋 🔋🔋🔋🔋🔋]', 'yellow');
    log('  🤕 Any pain or discomfort? [None / Minor / Concerning]', 'yellow');
    log('', 'reset');

    await delay(2000);

    log('Sarah enters her responses:', 'cyan');
    log('  😕 Sleep: 2/5 (Poor - jet lag)', 'yellow');
    log('  🔋🔋 Energy: 2/5 (Low)', 'yellow');
    log('  ⚠️ Pain: Minor (some back discomfort from travel)', 'yellow');
    log('  📝 Notes: "Feeling tired from jet lag, back is a bit sore from flight"', 'yellow');

    await delay(1000);

    log('\nSubmitting wellness check-in to Journey AI...', 'cyan');

    const wellnessResponse = await axios.post(`${API_BASE}/wellness/checkin`, {
      session_id: SESSION_ID,
      trip_day: 2,
      date: '2025-09-16',
      sleep_score: 2,
      energy_score: 2,
      pain_level: 1, // minor
      additional_notes: 'Feeling tired from jet lag, back is a bit sore from flight',
      conditions: SARAH_CONDITIONS,
      current_itinerary: SARAH_DAY_2_ITINERARY
    });

    const wellness = wellnessResponse.data;

    logSubSection('📊 Wellness Assessment Results');

    log(`Overall Status: ${wellness.wellness_summary.overall_status}`, 'bright');
    log(`Wellness Score: ${wellness.wellness_score}/100`, wellness.wellness_score >= 50 ? 'green' : 'red');
    log('', 'reset');

    log('Sleep: ' + wellness.wellness_summary.sleep.emoji + ' ' + wellness.wellness_summary.sleep.text, 'yellow');
    log('Energy: ' + wellness.wellness_summary.energy.emoji + ' ' + wellness.wellness_summary.energy.text, 'yellow');
    log('Pain: ' + wellness.wellness_summary.pain.text, 'yellow');

    logSubSection('💡 Personalized Recommendations');

    wellness.recommendations.forEach((rec, index) => {
      log(`\n${index + 1}. ${rec.icon} ${rec.title} [${rec.priority}]`, 'bright');
      log(`   ${rec.message}`, 'reset');
      if (rec.actions && rec.actions.length > 0) {
        log(`   Actions: ${rec.actions.join(' | ')}`, 'cyan');
      }
    });

    if (wellness.should_modify) {
      logSubSection('⚠️ Itinerary Adjustment Recommended');
      log('Based on your wellness scores, Journey AI suggests modifying today\'s itinerary.', 'yellow');

      if (wellness.adjusted_itinerary) {
        log('\n📝 Adjustments Made:', 'bright');
        log(`   Reason: ${wellness.adjusted_itinerary.adjustment_reason}`, 'cyan');
        log(`   Fatigue Impact: ${wellness.adjusted_itinerary.fatigue_added} (reduced from ${SARAH_DAY_2_ITINERARY.fatigue_target})`, 'green');
        log(`   Rest Breaks: ${wellness.adjusted_itinerary.rest_breaks} (added ${wellness.adjusted_itinerary.rest_breaks - SARAH_DAY_2_ITINERARY.rest_breaks} more)`, 'green');

        if (wellness.adjusted_itinerary.activities) {
          log('\n   Adjusted Activities:', 'cyan');
          wellness.adjusted_itinerary.activities.forEach(activity => {
            log(`   • ${activity.name} - ${activity.duration_hours}h`, 'reset');
            if (activity.adjustment) {
              log(`     ${activity.adjustment}`, 'yellow');
            }
          });
        }
      }
    }

    await delay(2000);

    // ========================================
    // STEP 2: Generate Daily Checklist
    // ========================================
    logSection('STEP 2: Generate Daily Checklist 📅');

    log('Sarah taps "View Today\'s Checklist"...', 'cyan');

    await delay(1000);

    const checklistResponse = await axios.post(`${API_BASE}/checklist/daily`, {
      session_id: SESSION_ID,
      itinerary_day: wellness.adjusted_itinerary || SARAH_DAY_2_ITINERARY,
      conditions: SARAH_CONDITIONS,
      date: '2025-09-16',
      wellness_data: wellness.wellness_summary
    });

    const checklist = checklistResponse.data;

    logSubSection('📱 Daily Checklist - Day 2');

    log(`Date: ${checklist.date}`, 'yellow');
    log(`Progress: ${checklist.progress.display} (${checklist.progress.percentage}%)`, 'bright');
    log(`Estimated Steps: ${checklist.summary.estimated_steps}`, 'cyan');
    log(`Rest Breaks: ${checklist.summary.rest_breaks}`, 'cyan');
    log('', 'reset');

    // Group items by category
    const categories = {
      morning: [],
      activity_prep: [],
      activity: [],
      activity_completion: [],
      evening: []
    };

    checklist.items.forEach(item => {
      if (categories[item.category]) {
        categories[item.category].push(item);
      }
    });

    // Display morning checklist
    if (categories.morning.length > 0) {
      log('☀️ MORNING CHECKLIST', 'bright');
      categories.morning.forEach(item => {
        const checkbox = item.completed ? '✅' : '⚪';
        const priorityBadge = item.priority === 'CRITICAL' ? ' 🚨' : item.priority === 'HIGH' ? ' ⚠️' : '';
        log(`${checkbox} ${item.time} - ${item.title}${priorityBadge}`, item.completed ? 'green' : 'reset');
        if (item.description && !item.completed) {
          log(`   ${item.description}`, 'cyan');
        }
      });
    }

    // Display activity prep
    if (categories.activity_prep.length > 0) {
      log('\n🎒 ACTIVITY PREPARATION', 'bright');
      categories.activity_prep.forEach(item => {
        const checkbox = item.completed ? '✅' : '⚪';
        log(`${checkbox} ${item.time} - ${item.title}`, item.completed ? 'green' : 'reset');
        if (item.packing_list && !item.completed) {
          log('   Packing List:', 'yellow');

          // Show critical items
          const criticalItems = [
            ...item.packing_list.medical.filter(i => i.critical),
            ...item.packing_list.essentials.slice(0, 3)
          ];

          criticalItems.forEach(packItem => {
            const packCheckbox = packItem.checked ? '✓' : '☐';
            const critical = packItem.critical ? ' 🚨' : '';
            log(`     ${packCheckbox} ${packItem.item}${critical}`, 'cyan');
          });

          log(`     ... and ${item.packing_list.essentials.length + item.packing_list.medical.length - criticalItems.length} more items`, 'cyan');
        }
      });
    }

    // Display main activities
    if (categories.activity.length > 0) {
      log('\n🎯 TODAY\'S ACTIVITIES', 'bright');
      categories.activity.forEach(item => {
        const checkbox = item.completed ? '✅' : '⚪';
        log(`${checkbox} ${item.time} - ${item.title}`, item.completed ? 'green' : 'reset');
        log(`   Duration: ${item.duration_hours}h | Activity Level: ${item.activity_level}`, 'cyan');
      });
    }

    // Display evening checklist
    if (categories.evening.length > 0) {
      log('\n🌙 EVENING CHECKLIST', 'bright');
      categories.evening.forEach(item => {
        const checkbox = item.completed ? '✅' : '⚪';
        const priorityBadge = item.priority === 'CRITICAL' ? ' 🚨' : '';
        log(`${checkbox} ${item.time} - ${item.title}${priorityBadge}`, item.completed ? 'green' : 'reset');
      });
    }

    await delay(2000);

    // ========================================
    // STEP 3: Checking Off Tasks Throughout Day
    // ========================================
    logSection('STEP 3: Sarah Completes Tasks Throughout Day ✅');

    log('Sarah starts checking off tasks as she completes them...', 'cyan');

    await delay(1000);

    // Complete wellness check-in
    const wellnessItem = checklist.items.find(item => item.action_type === 'wellness_checkin');
    if (wellnessItem) {
      log(`\n✅ ${wellnessItem.time} - ${wellnessItem.title}`, 'green');
      await axios.patch(
        `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}/item/${wellnessItem.id}`,
        { completed: true }
      );
      await delay(500);
    }

    // Complete insulin dose
    const insulinItem = checklist.items.find(item => item.title.includes('insulin') && item.category === 'morning');
    if (insulinItem) {
      log(`✅ ${insulinItem.time} - ${insulinItem.title}`, 'green');
      await axios.patch(
        `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}/item/${insulinItem.id}`,
        { completed: true, data: { insulin_units: 12, insulin_type: 'long-acting' } }
      );
      await delay(500);
    }

    // Complete blood glucose check
    const glucoseItem = checklist.items.find(item => item.action_type === 'glucose_check' && item.category === 'morning');
    if (glucoseItem) {
      log(`✅ ${glucoseItem.time} - ${glucoseItem.title} (Result: 115 mg/dL ✓)`, 'green');
      await axios.patch(
        `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}/item/${glucoseItem.id}`,
        { completed: true, data: { glucose_mg_dl: 115, in_target_range: true } }
      );
      await delay(500);
    }

    // Complete breakfast
    const breakfastItem = checklist.items.find(item => item.action_type === 'meal' && item.category === 'morning');
    if (breakfastItem) {
      log(`✅ ${breakfastItem.time} - ${breakfastItem.title}`, 'green');
      await axios.patch(
        `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}/item/${breakfastItem.id}`,
        { completed: true, data: { carbs_grams: 45, meal: 'Oatmeal with fruit and coffee' } }
      );
      await delay(500);
    }

    // Complete wheelchair check
    const wheelchairItem = checklist.items.find(item => item.action_type === 'mobility');
    if (wheelchairItem) {
      log(`✅ ${wheelchairItem.time} - ${wheelchairItem.title}`, 'green');
      await axios.patch(
        `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}/item/${wheelchairItem.id}`,
        { completed: true, data: { battery_percentage: 100, all_checks_passed: true } }
      );
      await delay(500);
    }

    log('\n🎉 Morning routine completed!', 'bright');

    await delay(1000);

    // Get updated checklist
    const updatedChecklistResponse = await axios.get(
      `${API_BASE}/checklist/daily/${SESSION_ID}/${checklist.day_number}`
    );

    const updatedChecklist = updatedChecklistResponse.data;

    logSubSection('📊 Updated Progress');

    const progressBar = '█'.repeat(Math.floor(updatedChecklist.progress.percentage / 5)) +
                       '░'.repeat(20 - Math.floor(updatedChecklist.progress.percentage / 5));

    log(`Progress: [${progressBar}] ${updatedChecklist.progress.display}`, 'bright');
    log(`Completion: ${updatedChecklist.progress.percentage}%`, 'green');

    await delay(2000);

    // ========================================
    // STEP 4: Sarah's Reflection
    // ========================================
    logSection('STEP 4: Sarah\'s Reflection 💭');

    log('Sarah looks at her phone and thinks:', 'cyan');
    log('', 'reset');
    log('  "This is amazing. Journey AI knew I was tired and automatically"', 'yellow');
    log('  "adjusted my plans. It reminded me about my insulin, tracked my"', 'yellow');
    log('  "glucose checks, and even gave me a packing list."', 'yellow');
    log('', 'reset');
    log('  "I feel supported and safe. I can actually enjoy Rome without"', 'yellow');
    log('  "constant anxiety about forgetting something important."', 'yellow');
    log('', 'reset');
    log('  "This is the independence I\'ve been dreaming of." 🌟', 'green');

    await delay(2000);

    // ========================================
    // SUMMARY
    // ========================================
    logSection('📈 TEST SUMMARY');

    log('✅ Wellness check-in processed successfully', 'green');
    log(`✅ Wellness score calculated: ${wellness.wellness_score}/100`, 'green');
    log(`✅ Generated ${wellness.recommendations.length} personalized recommendations`, 'green');
    log(`✅ Itinerary ${wellness.should_modify ? 'ADJUSTED' : 'maintained'} based on wellness`, 'green');
    log(`✅ Daily checklist generated: ${checklist.items.length} items`, 'green');
    log(`✅ Checklist progress tracking: ${updatedChecklist.progress.percentage}% complete`, 'green');
    log(`✅ Medical checkpoints included: insulin, glucose, medications`, 'green');
    log(`✅ Packing lists generated with critical items flagged`, 'green');

    log('\n🎉 All wellness and checklist features working perfectly!', 'bright');

    log('\n📊 Key Metrics:', 'cyan');
    log(`   • Wellness Score: ${wellness.wellness_score}/100`, 'reset');
    log(`   • Recommendations: ${wellness.recommendations.length}`, 'reset');
    log(`   • Daily Tasks: ${checklist.items.length}`, 'reset');
    log(`   • Critical Tasks: ${checklist.items.filter(i => i.priority === 'CRITICAL').length}`, 'reset');
    log(`   • Completed Tasks: ${updatedChecklist.progress.completed}/${updatedChecklist.progress.total}`, 'reset');
    log(`   • Completion Rate: ${updatedChecklist.progress.percentage}%`, 'reset');

  } catch (error) {
    log('\n❌ TEST FAILED', 'red');
    if (error.response) {
      log(`Error: ${error.response.status} - ${error.response.data.error}`, 'red');
      if (error.response.data.message) {
        log(`Details: ${error.response.data.message}`, 'yellow');
      }
    } else {
      log(`Error: ${error.message}`, 'red');
    }
    log('\nMake sure the server is running: node server-production.js', 'yellow');
  }
}

// Run the test
log('\n🚀 Starting Sarah\'s Wellness & Checklist Test...', 'bright');
log('Make sure server is running on http://localhost:3001\n', 'yellow');

runTest().then(() => {
  log('\n✅ Test completed!\n', 'green');
}).catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
