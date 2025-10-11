# Layla-Style Trip Planner Integration Plan

## Overview
Replace the existing step-by-step wizard with a Layla-style AI trip planner that features:
- Chat-style natural language input (left side)
- Live itinerary preview (right side)
- Rule-based plan generator (no backend required initially)
- Quick action buttons for common modifications
- Export functionality

## Changes Needed

### 1. HTML Structure (dashboard.html)
Replace lines 205-366 (trip-wizard-panel) with:
- Full-width panel (1200px instead of 700px)
- Split layout: Chat (left) | Preview (right)
- Top bar with title, Generate button, Export button
- Chat conversation area with message bubbles
- Text input with Send button
- Quick action chips (Birthday surprise, Spa day, Budget options)
- Plan preview with: Flight summary, Hotel card, Daily schedule, Tips, Cost estimate
- Collapsible preferences panel at bottom

### 2. CSS Additions
Add styles for:
- Message bubbles (user vs assistant)
- Chat container with auto-scroll
- Plan preview cards
- Badge/chip components
- Typing indicator animation

### 3. JavaScript Functions
Add to existing script section:
- `generatePlan(prefs)` - Rule-based plan generator
- `sendChatMessage()` - Process natural language input
- `parseUserInput(text)` - Simple slot-filling heuristics
- `addMessageBubble(role, content)` - Append chat messages
- `displayPlanPreview(plan)` - Render itinerary
- `quickAction(action)` - Handle quick buttons
- `exportPlanJSON()` - Download plan as JSON
- `updatePreferences(updates)` - Modify and regenerate

### 4. Data Structures
```javascript
tripPrefs = {
  destination: string,
  origin: string,
  travelers: number,
  startDate: ISO string,
  endDate: ISO string,
  vibes: array of strings,
  budget: 'budget' | 'mid' | 'premium',
  specialOccasion: 'birthday' | 'anniversary' | 'none',
  notes: string
}

generatedPlan = {
  title: string,
  subtitle: string,
  flightSummary: string,
  hotel: { name, blurb, priceFrom, rating, neighborhood },
  overview: string,
  days: [{ day, title, items[] }],
  tips: string[],
  estCost: string
}
```

## Implementation Status
- [ ] Replace wizard HTML with Layla-style layout
- [ ] Add CSS for new components
- [ ] Implement plan generator function
- [ ] Add chat message handling
- [ ] Implement slot-filling parser
- [ ] Add quick actions
- [ ] Add export functionality
- [ ] Test end-to-end flow

## Notes
- Keep existing `openTripWizard()` and `closeTripWizard()` function names
- Maintain Firebase integration for saving trips
- Seed with Paris birthday example for demo
- Plan generator initially uses simple rules (can swap for API later)

