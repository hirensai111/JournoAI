import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(80));
  log(`  ${title}`, 'bright');
  console.log('═'.repeat(80) + '\n');
}

function priorityBadge(priority) {
  switch (priority) {
    case 'CRITICAL':
      return `${colors.red}⚠️  CRITICAL${colors.reset}`;
    case 'HIGH':
      return `${colors.yellow}⚡ HIGH${colors.reset}`;
    case 'MEDIUM':
      return `${colors.blue}📌 MEDIUM${colors.reset}`;
    default:
      return priority;
  }
}

async function testSarahChecklist() {
  header('📋 SARAH\'S PERSONALIZED ROME TRIP CHECKLIST');

  log('Generating custom checklist for Sarah Mitchell...', 'cyan');
  console.log('  Conditions: Wheelchair user + Type 1 Diabetes');
  console.log('  Destination: Rome, Italy');
  console.log('  Trip Duration: 7 days');
  console.log('  Travel Date: September 15, 2025');
  console.log('  Solo Traveler: Yes\n');

  try {
    const response = await axios.post(`${API_BASE}/checklist/generate`, {
      conditions: ['wheelchair_user', 'type_1_diabetes'],
      destination: 'Rome, Italy',
      tripDuration: 7,
      travelDate: '2025-09-15',
      soloTravel: true
    });

    const { checklist, summary, generated_for } = response.data;

    log('✅ Checklist Generated Successfully!', 'green');
    console.log('');

    // Summary
    header('📊 CHECKLIST SUMMARY');
    console.log(`  Total Categories: ${colors.bright}${summary.total_categories}${colors.reset}`);
    console.log(`  Total Items: ${colors.bright}${summary.total_items}${colors.reset}`);
    console.log(`  Critical Items: ${colors.red}${summary.critical_items}${colors.reset}`);
    console.log(`  High Priority Items: ${colors.yellow}${summary.high_priority_items}${colors.reset}`);
    console.log('');

    // Display each category
    checklist.categories.forEach((category, catIndex) => {
      header(`${catIndex + 1}. ${category.name.toUpperCase()}`);

      console.log(`  ${colors.cyan}Description:${colors.reset} ${category.description}`);
      console.log(`  ${colors.cyan}Timeframe:${colors.reset} ${category.timeframe}`);
      console.log(`  ${colors.cyan}Priority:${colors.reset} ${priorityBadge(category.priority)}`);
      console.log('');

      category.items.forEach((item, itemIndex) => {
        console.log(`  ${colors.bright}${itemIndex + 1}. ${item.task}${colors.reset}`);
        console.log(`     Priority: ${priorityBadge(item.priority)}`);

        if (item.notes) {
          console.log(`     ${colors.blue}ℹ️  Note:${colors.reset} ${item.notes}`);
        }

        if (item.recommendation) {
          console.log(`     ${colors.green}💡 Recommendation:${colors.reset} ${item.recommendation}`);
        }

        if (item.action_button) {
          console.log(`     ${colors.magenta}🔘 Action:${colors.reset} ${item.action_button}`);
        }

        if (item.reminder) {
          console.log(`     ${colors.yellow}🔔 Reminder:${colors.reset} ${item.reminder}`);
        }

        if (item.checklist && Array.isArray(item.checklist)) {
          console.log(`     ${colors.cyan}📝 Checklist:${colors.reset}`);
          item.checklist.forEach(subItem => {
            console.log(`        ☐ ${subItem}`);
          });
        }

        if (item.topics && Array.isArray(item.topics)) {
          console.log(`     ${colors.cyan}📋 Topics:${colors.reset}`);
          item.topics.forEach(topic => {
            console.log(`        • ${topic}`);
          });
        }

        if (item.recommended_items && Array.isArray(item.recommended_items)) {
          console.log(`     ${colors.green}Recommended Items:${colors.reset}`);
          item.recommended_items.forEach(recItem => {
            console.log(`        • ${recItem}`);
          });
        }

        if (item.phrases && Array.isArray(item.phrases)) {
          console.log(`     ${colors.cyan}🗣️  Phrases:${colors.reset}`);
          item.phrases.forEach(phrase => {
            console.log(`        • ${phrase}`);
          });
        }

        if (item.contacts && Array.isArray(item.contacts)) {
          console.log(`     ${colors.cyan}📞 Contacts:${colors.reset}`);
          item.contacts.forEach(contact => {
            console.log(`        • ${contact}`);
          });
        }

        if (item.info_to_share && Array.isArray(item.info_to_share)) {
          console.log(`     ${colors.cyan}📤 Info to Share:${colors.reset}`);
          item.info_to_share.forEach(info => {
            console.log(`        • ${info}`);
          });
        }

        if (item.info_needed && Array.isArray(item.info_needed)) {
          console.log(`     ${colors.cyan}📥 Info Needed:${colors.reset}`);
          item.info_needed.forEach(info => {
            console.log(`        • ${info}`);
          });
        }

        if (item.save_info && Array.isArray(item.save_info)) {
          console.log(`     ${colors.cyan}💾 Save:${colors.reset}`);
          item.save_info.forEach(info => {
            console.log(`        • ${info}`);
          });
        }

        console.log('');
      });
    });

    // Critical Items Summary
    header('⚠️  CRITICAL ITEMS - DO NOT SKIP!');
    let criticalCount = 0;
    checklist.categories.forEach(category => {
      const criticalItems = category.items.filter(item => item.priority === 'CRITICAL');
      if (criticalItems.length > 0) {
        log(`\n${category.name}:`, 'red');
        criticalItems.forEach(item => {
          criticalCount++;
          console.log(`  ${criticalCount}. ${item.task}`);
          if (item.reminder) {
            console.log(`     🔔 Due: ${item.reminder}`);
          }
        });
      }
    });

    // Final Message
    header('✅ SARAH\'S CHECKLIST IS READY!');

    console.log(`${colors.green}This personalized checklist addresses:`);
    console.log(`  ✓ Insulin management for Type 1 Diabetes`);
    console.log(`  ✓ Wheelchair accessibility preparation`);
    console.log(`  ✓ Medical safety and emergency planning`);
    console.log(`  ✓ Solo travel considerations`);
    console.log(`  ✓ Rome-specific requirements${colors.reset}\n`);

    log('💪 Sarah can now confidently prepare for her dream Rome trip!', 'cyan');
    console.log('');

    // Export option
    header('📥 EXPORT OPTIONS');
    console.log('  To export as JSON: Save the full response data');
    console.log('  To export as PDF: Use a JSON-to-PDF converter');
    console.log('  To share: Copy the checklist data from the API response\n');

    return true;

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Check server availability
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    log('❌ Server is not running at http://localhost:3001', 'red');
    log('Please start the server first:', 'blue');
    console.log('  node server-production.js');
    console.log('  OR');
    console.log('  npm start\n');
    process.exit(1);
  }

  const success = await testSarahChecklist();
  process.exit(success ? 0 : 1);
})();
