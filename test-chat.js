import axios from 'axios';

const API_URL = 'http://localhost:3001/api/chat';
const SESSION_ID = 'test-' + Date.now();

async function chat(message) {
  console.log('\n👤 User:', message);
  try {
    const response = await axios.post(API_URL, {
      message,
      session_id: SESSION_ID
    });
    console.log('🤖 Journey AI:', response.data.reply);
    console.log('📊 Preferences collected:', response.data.preferences);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testConversation() {
  console.log('🚀 Starting Journey AI conversation test...\n');
  
  await chat('Hi, I need help planning a trip');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between messages
  
  await chat('New Orleans next month');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await chat('I use a wheelchair and keep kosher');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await chat('I love jazz music and want authentic local food');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await chat('What do you recommend?');
  
  console.log('\n✅ Conversation test completed!');
}

testConversation().catch(console.error);

