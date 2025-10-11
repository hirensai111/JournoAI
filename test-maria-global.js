import axios from 'axios';

const API_URL = 'http://localhost:3001/api/chat';
const SESSION_ID = 'maria-global-' + Date.now();

async function chat(message) {
  console.log('\n👤 Maria:', message);
  try {
    const response = await axios.post(API_URL, {
      message,
      session_id: SESSION_ID
    });
    console.log('🤖 Journey AI:', response.data.reply);
    if (response.data.preferences && Object.keys(response.data.preferences).length > 0) {
      console.log('📊 Preferences collected:', response.data.preferences);
    }
    return response.data;
  } catch (error) {
    console.error('❌ Chat error:', error.response?.data || error.message);
    return null;
  }
}

async function testGlobalConversation() {
  console.log('🌍 TESTING MARIA\'S GLOBAL JOURNEY\n');
  console.log('Scenario: Maria travels to Tokyo, then Paris, then Rio\n');
  console.log('═══════════════════════════════════════════\n');
  
  // Tokyo trip
  console.log('🗾 === TOKYO TRIP ===');
  await chat('Hi, I need help planning a trip to Tokyo next month');
  await chat('I use a wheelchair and keep kosher');
  await chat('I love traditional culture and modern art');
  await chat('What do you recommend for me?');
  
  console.log('\n--- SWITCHING TO PARIS ---\n');
  
  // Paris trip
  console.log('🇫🇷 === PARIS TRIP ===');
  await chat('Actually, I also want to visit Paris after Tokyo');
  await chat('Same accessibility needs, and I want authentic French food');
  await chat('What should I experience there?');
  
  console.log('\n--- ADDING RIO ---\n');
  
  // Rio trip
  console.log('🇧🇷 === RIO TRIP ===');
  await chat('And one more: Rio de Janeiro for Carnival season');
  await chat('What should I experience there?');
  
  console.log('\n--- FINAL SUMMARY ---\n');
  await chat('Can you give me a summary of all my recommendations?');
}

testGlobalConversation().catch(console.error);
