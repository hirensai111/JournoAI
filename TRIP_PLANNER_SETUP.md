# Trip Planner API Setup Guide

## Overview

The upgraded Trip Planner now fetches real flights, hotels, and activities with comprehensive accessibility support. This guide explains how to configure API credentials and use the new system.

---

## 🎯 Features

### Core Capabilities
- **Real Flight Data**: Amadeus API integration for live flight searches
- **Accessible Hotels**: Booking.com integration with accessibility filtering
- **Curated Activities**: GetYourGuide/Viator or fallback to local curated experiences
- **Accessibility-First Ranking**: Prioritizes wheelchair access, step-free rooms, diabetes support, hearing/visual assistance
- **Personalized Itineraries**: Day-by-day plans with rest breaks and accessibility considerations

### Accessibility Support
- ♿ Wheelchair access & step-free routes
- 🛗 Elevator requirements
- 🏥 Diabetes support (medication fridges)
- 🔊 Hearing assistance devices
- 👁️ Visual assistance & tactile exhibits
- 🐕‍🦺 Service animal accommodations

---

## 📋 Prerequisites

### Required API Keys (at least one flight API)
1. **Amadeus Flight API** (Recommended)
   - Free tier available
   - Sign up: https://developers.amadeus.com/
   - Get 2,000 free API calls/month

### Optional API Keys (fallback data available)
2. **Booking.com Hotel API** (Optional)
   - Requires partnership approval
   - Apply: https://developers.booking.com/
   - Fallback: Mock hotel data with accessibility features

3. **GetYourGuide/Viator Activities API** (Optional)
   - GetYourGuide: https://api.getyourguide.com/docs/
   - Viator: https://www.viator.com/partner/
   - Fallback: Curated local activities database

---

## 🚀 Quick Start

### 1. Install Dependencies

The necessary packages are already in `package.json`. If you need to reinstall:

\`\`\`bash
cd Mari
npm install
\`\`\`

### 2. Configure Environment Variables

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and add your API credentials:

\`\`\`env
# Required for flight search
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
AMADEUS_HOSTNAME=test  # or 'production'

# Optional (will use fallback data if not provided)
BOOKING_API_KEY=your_booking_key
EXPERIENCES_API_KEY=your_experiences_key
\`\`\`

### 3. Start the Server

\`\`\`bash
npm start
\`\`\`

The server will start on port 3001 (or your configured PORT).

### 4. Test the Endpoints

Open your browser to:
- Dashboard: http://localhost:3001/dashboard.html
- Health Check: http://localhost:3001/api/trips/health

---

## 🔧 API Endpoints

### Main Composition Endpoint

**POST `/api/trips/compose`**

Generates a complete personalized itinerary.

**Request Body:**
\`\`\`json
{
  "destination": "Rome",
  "origin": "Washington (IAD)",
  "travelers": 2,
  "startDate": "2025-11-02",
  "endDate": "2025-11-08",
  "vibe": ["cultural", "relaxed"],
  "budget": "mid",
  "notes": "Love museums and food",
  "specialOccasion": "none",
  "travelersProfiles": [
    {
      "id": "traveler-1",
      "name": "Sarah",
      "mobilityLevel": "wheelchair",
      "accessibilityNeeds": ["wheelchair_access", "step_free", "elevator_required", "diabetes_support"],
      "dietaryNeeds": ["diabetic"]
    },
    {
      "id": "traveler-2",
      "name": "John",
      "mobilityLevel": "independent",
      "accessibilityNeeds": [],
      "dietaryNeeds": []
    }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "title": "Rome Personalized Trip",
  "subtitle": "2 travelers • Nov 2, 2025 → Nov 8, 2025",
  "flight": {
    "id": "flight-123",
    "carrier": "United Airlines",
    "segments": [...],
    "cabin": "ECONOMY",
    "priceTotal": 850,
    "currency": "USD",
    "deeplink": "https://...",
    "score": 4.2
  },
  "hotel": {
    "id": "hotel-456",
    "name": "Accessible Suites Rome",
    "neighborhood": "City Center",
    "rating": 9.1,
    "pricePerNight": 180,
    "currency": "USD",
    "accessibility": ["wheelchair_access", "step_free", "elevator_required", "diabetes_support"],
    "deeplink": "https://...",
    "score": 8.5
  },
  "days": [
    {
      "day": 1,
      "title": "Arrival & Welcome",
      "items": [
        { "kind": "free_time", "label": "Check-in & settle into accessible hotel" },
        { "kind": "experience", "refId": "exp-1", "label": "Accessible City Walking Tour", "start": "15:00" }
      ]
    }
  ],
  "tips": [
    "Call hotel 24-48 hours before arrival to confirm wheelchair access and elevator functionality.",
    "Hotel provides in-room refrigerator for medication storage. Confirm upon check-in.",
    ...
  ],
  "estCost": "~USD 3,240 (2 travelers)"
}
\`\`\`

### Individual Search Endpoints

**POST `/api/trips/flights`** - Search flights only
**POST `/api/trips/hotels`** - Search hotels only
**POST `/api/trips/experiences`** - Search activities only

---

## 🏗️ Architecture

### File Structure

\`\`\`
Mari/
├── lib/trips/
│   ├── types.ts                 # TypeScript type definitions
│   ├── ranking.ts               # Accessibility-first scoring engine
│   ├── compose.ts               # Main orchestration logic
│   └── adapters/
│       ├── amadeus.ts           # Flight search adapter
│       ├── booking.ts           # Hotel search adapter
│       └── experiences.ts       # Activities adapter
├── src/routes/
│   └── tripRoutes.js            # Express API routes
├── src/server.js                # Main server (updated)
└── public/dashboard.html        # Frontend (updated)
\`\`\`

### Data Flow

1. **User Input** (dashboard.html) → Natural language parsed into preferences
2. **API Call** → POST to `/api/trips/compose`
3. **Parallel Fetch** → Amadeus, Booking.com, Experiences APIs called simultaneously
4. **Ranking Engine** → Scores all options based on accessibility needs
5. **Composition** → Builds day-by-day itinerary with rest breaks
6. **Response** → Returns complete plan with deeplinks

### Accessibility Scoring Logic

Hotels are scored highest for:
- ✅ Wheelchair access (+2.0 points)
- ✅ Step-free rooms (+2.0 points)
- ✅ Elevator availability (+2.0 points)
- ✅ Medication fridge (+1.2 points)
- ✅ Service animal friendly (+1.2 points)

Hotels without critical accessibility features receive penalties (-1.5 points).

---

## 🧪 Testing

### Test with Sample Request

\`\`\`bash
curl -X POST http://localhost:3001/api/trips/compose \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "Rome",
    "origin": "Washington (IAD)",
    "travelers": 2,
    "startDate": "2025-11-02",
    "endDate": "2025-11-08",
    "vibe": ["cultural"],
    "budget": "mid",
    "travelersProfiles": [
      {
        "id": "1",
        "accessibilityNeeds": ["wheelchair_access", "diabetes_support"]
      }
    ]
  }'
\`\`\`

### Check Health Status

\`\`\`bash
curl http://localhost:3001/api/trips/health
\`\`\`

Expected response:
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "apis": {
    "amadeus": true,
    "booking": false,
    "experiences": false
  }
}
\`\`\`

---

## 🔒 Security & Best Practices

### API Key Security
- ✅ All API calls are **server-side only**
- ✅ Keys never exposed to client browser
- ✅ `.env` file excluded from version control (via `.gitignore`)

### Rate Limiting
- Express rate limiter configured: 100 requests per 15 minutes per IP
- Caching enabled: 15-minute TTL for search results

### Error Handling
- **Partial failures**: System returns best available data with warnings
- **Complete failures**: Returns curated fallback data
- **Graceful degradation**: Missing APIs don't break the system

---

## 📊 Fallback Data

Even without any API keys, the system provides:

- ✅ **10 mock flights** with realistic data
- ✅ **10 mock hotels** with full accessibility annotations
- ✅ **40+ curated activities** per destination
- ✅ **Accessibility scoring** and ranking

This allows development and testing without API costs.

---

## 🛠️ Troubleshooting

### Issue: "API returned 401"
**Solution**: Check your API keys in `.env`. For Amadeus, ensure you're using test credentials if hostname is `test`.

### Issue: "Flight data unavailable"
**Solution**: Normal behavior if Amadeus keys not configured. The system will use mock data.

### Issue: "CORS error in browser"
**Solution**: Ensure server is running on port 3001 and the frontend is accessing `http://localhost:3001`.

### Issue: TypeScript errors
**Solution**: The project uses TypeScript for type definitions but runs on Node.js. No compilation needed. If you see TS errors in your editor, they're informational only.

---

## 📚 Additional Resources

- **Amadeus API Docs**: https://developers.amadeus.com/self-service
- **Booking.com API**: https://developers.booking.com/
- **GetYourGuide API**: https://api.getyourguide.com/docs/
- **Accessibility Best Practices**: https://www.w3.org/WAI/WCAG21/quickref/

---

## 🎉 Acceptance Criteria (Met)

✅ Typing: _"2 travellers from IAD to Rome 2025-11-02 to 2025-11-08, wheelchair user and diabetic, mid budget, love museums and food"_ yields:

- ✅ A composed plan with a flight, an accessible hotel, and accessible-friendly experiences
- ✅ Hotel card indicates accessibility badges (wheelchair/step-free/elevator; medication fridge note)
- ✅ Activities list prioritizes wheelchair-accessible tours
- ✅ Schedule inserts rest blocks for accessibility needs
- ✅ "Book" buttons open vendor deeplinks
- ✅ Hotels with unknown accessibility are clearly marked and down-weighted

---

## 💡 Future Enhancements

- Add more destination-specific activity data
- Integrate real-time wheelchair-accessible transit routing
- Support for multi-city itineraries
- Accessibility photo verification
- User-submitted accessibility reviews

---

**Questions?** Check the inline code comments in `lib/trips/compose.ts` and `lib/trips/ranking.ts` for detailed logic explanations.

