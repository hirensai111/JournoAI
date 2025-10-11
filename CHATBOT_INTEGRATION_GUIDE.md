# Trip Assistant Chatbot Integration Guide

## Overview
This guide shows how to integrate the AI Trip Assistant chatbot into your dashboard and fix database fetching issues across devices.

## Part 1: Fix Database Fetching Issue

### Problem
When pulling the code on a different laptop, Firebase data doesn't sync because the Firestore SDK needs to be properly initialized.

### Solution - Already Fixed!

The firebase-config.js has been updated to include Firestore initialization. Make sure you have these script tags in your HTML files:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

<!-- Firebase Config -->
<script src="/js/firebase-config.js"></script>
```

## Part 2: Chatbot UI Integration

### Files Created
1. `src/tripAssistantChatbot.js` - Backend chatbot service ✅
2. API endpoints added to `server-production.js` ✅
3. Frontend integration (instructions below)

### Add Chatbot Widget to Dashboard

Add this HTML before the closing `</body>` tag in dashboard.html (around line 1220):

```html
<!-- AI Trip Assistant Chatbot -->
<div id="chatbot-container" style="display: none; position: fixed; bottom: 2rem; right: 2rem; width: 400px; max-width: calc(100vw - 4rem); background: white; border-radius: var(--radius-xl); box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 200; max-height: 600px; display: flex; flex-direction: column;">

  <!-- Chatbot Header -->
  <div style="padding: 1rem 1.5rem; border-bottom: 2px solid var(--border); background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%); border-radius: var(--radius-xl) var(--radius-xl) 0 0; color: white;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; font-size: 1rem; color: white;">✨ Mari - Your Trip Assistant</h3>
        <p style="font-size: 0.75rem; margin: 0.25rem 0 0 0; opacity: 0.9;">I can help you customize your trip!</p>
      </div>
      <button class="btn btn-ghost btn-icon" onclick="toggleChatbot()" style="color: white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Chat Messages -->
  <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 1rem; max-height: 400px; background: #f9fafb;">
    <!-- Welcome message -->
    <div class="chat-message bot-message" style="margin-bottom: 1rem;">
      <div style="display: flex; gap: 0.75rem; align-items: start;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: grid; place-items: center; flex-shrink: 0;">
          <span style="color: white; font-size: 0.875rem;">M</span>
        </div>
        <div style="background: white; padding: 0.75rem 1rem; border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg); box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1;">
          <p style="margin: 0; font-size: 0.875rem; line-height: 1.5;">
            Hi! I'm Mari, your AI trip assistant. 👋
            <br><br>
            I can help you:
            <br>• Find cheaper flight options
            <br>• Suggest alternative hotels
            <br>• Replace experiences you don't like
            <br>• Adjust your itinerary
            <br><br>
            Just tell me what you'd like to change!
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Suggestions Area -->
  <div id="chat-suggestions" style="padding: 0 1rem; max-height: 200px; overflow-y: auto; display: none;">
    <!-- Suggestions will appear here -->
  </div>

  <!-- Chat Input -->
  <div style="padding: 1rem; border-top: 2px solid var(--border); background: white; border-radius: 0 0 var(--radius-xl) var(--radius-xl);">
    <form onsubmit="sendChatMessage(event)" style="display: flex; gap: 0.5rem;">
      <input
        type="text"
        id="chat-input"
        class="form-input"
        placeholder="Type your message..."
        style="flex: 1; margin: 0;"
        autocomplete="off"
      />
      <button type="submit" class="btn btn-primary" style="padding: 0.625rem 1rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  </div>
</div>

<!-- Chatbot Toggle Button -->
<button
  id="chatbot-toggle-btn"
  onclick="toggleChatbot()"
  style="position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%); border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; z-index: 199; display: grid; place-items: center; transition: transform 0.2s;"
  onmouseenter="this.style.transform='scale(1.1)'"
  onmouseleave="this.style.transform='scale(1)'"
>
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
</button>
```

### Add Chatbot JavaScript Functions

Add these functions before the closing `</script>` tag (around line 1220):

```javascript
// ============================================
// CHATBOT FUNCTIONS
// ============================================

let chatbotSessionId = null;
let chatbotVisible = false;

function initChatbot() {
  chatbotSessionId = `session_${currentUser?.uid}_${Date.now()}`;
  console.log('Chatbot initialized:', chatbotSessionId);
}

function toggleChatbot() {
  chatbotVisible = !chatbotVisible;
  const container = document.getElementById('chatbot-container');
  const toggleBtn = document.getElementById('chatbot-toggle-btn');

  if (chatbotVisible) {
    container.style.display = 'flex';
    toggleBtn.style.display = 'none';
    if (!chatbotSessionId) initChatbot();
  } else {
    container.style.display = 'none';
    toggleBtn.style.display = 'grid';
  }
}

async function sendChatMessage(event) {
  event.preventDefault();

  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message) return;

  // Clear input
  input.value = '';

  // Add user message to chat
  addChatMessage(message, 'user');

  // Show typing indicator
  showTypingIndicator();

  try {
    // Send to chatbot API
    const response = await fetch('/api/trip-assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: chatbotSessionId,
        message: message,
        trip_context: {
          destination: tripData.destination,
          duration: tripData.duration,
          startDate: tripData.startDate,
          conditions: tripData.conditions,
          currentFlight: tripData.selectedFlight,
          currentHotel: tripData.selectedHotel,
          selectedExperiences: tripData.selectedExperiences
        }
      })
    });

    const data = await response.json();

    // Remove typing indicator
    removeTypingIndicator();

    // Add bot response
    addChatMessage(data.response, 'bot');

    // Show suggestions if any
    if (data.suggestions && data.suggestions.length > 0) {
      displayChatSuggestions(data.suggestions, data.intent);
    }

  } catch (error) {
    console.error('Chat error:', error);
    removeTypingIndicator();
    addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
  }
}

function addChatMessage(text, sender) {
  const messagesContainer = document.getElementById('chat-messages');

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}-message`;
  messageDiv.style.marginBottom = '1rem';

  if (sender === 'user') {
    messageDiv.innerHTML = `
      <div style="display: flex; gap: 0.75rem; align-items: start; justify-content: flex-end;">
        <div style="background: var(--primary); color: white; padding: 0.75rem 1rem; border-radius: var(--radius-lg) 0 var(--radius-lg) var(--radius-lg); max-width: 80%;">
          <p style="margin: 0; font-size: 0.875rem; line-height: 1.5;">${text}</p>
        </div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: grid; place-items: center; flex-shrink: 0;">
          <span style="color: white; font-size: 0.875rem;">${currentUser?.displayName?.charAt(0) || 'U'}</span>
        </div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div style="display: flex; gap: 0.75rem; align-items: start;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: grid; place-items: center; flex-shrink: 0;">
          <span style="color: white; font-size: 0.875rem;">M</span>
        </div>
        <div style="background: white; padding: 0.75rem 1rem; border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg); box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 80%;">
          <p style="margin: 0; font-size: 0.875rem; line-height: 1.5;">${text}</p>
        </div>
      </div>
    `;
  }

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById('chat-messages');

  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div style="display: flex; gap: 0.75rem; align-items: start;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); display: grid; place-items: center; flex-shrink: 0;">
        <span style="color: white; font-size: 0.875rem;">M</span>
      </div>
      <div style="background: white; padding: 0.75rem 1rem; border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg); box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; gap: 0.25rem;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: bounce 1.4s infinite;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: bounce 1.4s 0.2s infinite;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); animation: bounce 1.4s 0.4s infinite;"></div>
        </div>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

function displayChatSuggestions(suggestions, intent) {
  const suggestionsContainer = document.getElementById('chat-suggestions');
  suggestionsContainer.style.display = 'block';

  let html = '<div style="padding-bottom: 1rem;">';
  html += '<p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase;">Suggestions</p>';

  suggestions.forEach((suggestion, index) => {
    html += `
      <div class="suggestion-card" style="background: white; border: 2px solid var(--border); border-radius: var(--radius-lg); padding: 0.75rem; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;"
           onclick="selectSuggestion(${index}, '${intent}')"
           onmouseenter="this.style.borderColor='var(--primary)'; this.style.background='var(--primary-light)';"
           onmouseleave="this.style.borderColor='var(--border)'; this.style.background='white';">
        <p style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem;">Option ${index + 1}</p>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">${suggestion.summary}</p>
      </div>
    `;
  });

  html += '</div>';
  suggestionsContainer.innerHTML = html;
  suggestionsContainer.scrollTop = 0;

  // Store suggestions globally for selection
  window.currentSuggestions = suggestions;
  window.currentSuggestionIntent = intent;
}

async function selectSuggestion(index, intent) {
  const suggestion = window.currentSuggestions[index];

  if (!suggestion || !window.currentTripData?.trip_id) {
    alert('Please generate a trip first before making changes');
    return;
  }

  // Hide suggestions
  document.getElementById('chat-suggestions').style.display = 'none';

  // Add confirmation message
  addChatMessage(`I'll update your trip with ${suggestion.summary}`, 'bot');

  try {
    // Call update API
    const response = await fetch('/api/trip-assistant/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: window.currentTripData.trip_id,
        update_type: suggestion.type,
        new_item: suggestion.data,
        session_id: chatbotSessionId
      })
    });

    const data = await response.json();

    if (data.success) {
      // Update local trip data
      window.currentTripData = data.updated_trip;

      // Refresh the itinerary display
      displayTripSummary(window.currentTripData);

      // Notify user
      addChatMessage('✅ Your trip has been updated! The itinerary has been refreshed.', 'bot');
    } else {
      addChatMessage('Sorry, I couldn\'t update your trip. Please try again.', 'bot');
    }
  } catch (error) {
    console.error('Update error:', error);
    addChatMessage('Sorry, I encountered an error updating your trip.', 'bot');
  }
}

// Add bounce animation for typing indicator
const style = document.createElement('style');
style.textContent = `
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);

// Initialize chatbot when trip wizard opens
const originalOpenTripWizard = openTripWizard;
openTripWizard = function() {
  originalOpenTripWizard();
  if (!chatbotSessionId) initChatbot();
};
```

## Part 3: Add Firestore Script Tag

In all HTML files (dashboard.html, profile.html, onboarding.html), add the Firestore script tag after the Auth script:

```html
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
```

## Part 4: Testing

1. **Start the server:**
```bash
node server-production.js
```

2. **Test chatbot:**
   - Open dashboard
   - Start trip planning
   - Click chatbot button (bottom-right)
   - Try: "Show me cheaper flights"
   - Try: "I want a more accessible hotel"
   - Try: "Find relaxing experiences"

3. **Test database sync:**
   - Create a trip on one device
   - Pull code on another device
   - Sign in with same account
   - Your trips should appear automatically

## How It Works

**Chatbot Flow:**
1. User sends message → Frontend sends to `/api/trip-assistant/chat`
2. Backend detects intent (flight/hotel/experience change)
3. Backend searches for alternatives
4. Frontend displays suggestions as cards
5. User clicks suggestion → Frontend calls `/api/trip-assistant/update`
6. Trip gets updated in database
7. Itinerary refreshes with new selection

**Database Sync:**
- Firebase automatically syncs data across devices
- Just need to sign in with the same account
- All trips, profiles, and itineraries sync in real-time

## Troubleshooting

**Chatbot not responding:**
- Check browser console for errors
- Ensure server is running with chatbot initialized
- Check that OpenAI API key is set in .env

**Data not syncing:**
- Check Firebase console for database rules
- Ensure Firestore SDK is loaded (check browser console)
- Verify authentication is working
- Check network tab for API calls

**Suggestions not showing:**
- Ensure trip has been generated first
- Check that recommender service is running
- Look for errors in server logs

## Next Steps

After integration, you can enhance the chatbot with:
- Voice input
- Image suggestions for hotels/experiences
- Price comparison charts
- Booking integration
- Multi-language support
