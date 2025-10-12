# JournoAI - Health-Aware Travel Planning Platform

> Health-aware travel planning for confident, accessible journeys around the world.

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18.x-green.svg)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/firebase-12.4.0-orange.svg)](https://firebase.google.com/)
[![Express](https://img.shields.io/badge/express-5.1.0-lightgrey.svg)](https://expressjs.com/)

## 🚀 Try the Live Demo

**[Try JournoAI Now](https://mari-production.up.railway.app/)**

Experience the full platform live - create an account, plan accessible trips, and explore our health-aware travel features.

## Overview

JournoAI is an AI-powered travel planning platform designed specifically for travelers with health conditions, mobility needs, and accessibility requirements. The platform generates personalized, health-aware itineraries with comprehensive pre-trip checklists, real-time wellness monitoring, and accessible experience recommendations across 18 countries and 325+ verified experiences.

## Key Features

### 🌍 Trip Planning & Booking
- **Animated Trip Wizard**: Beautiful side-panel wizard with step-by-step trip creation (flights → hotels → experiences → itinerary)
- **Flight Search Integration**: Real-time flight search via Amadeus API with accessible seating options
- **Hotel Booking**: Booking.com API integration for accessible hotel search and booking
- **AI-Powered Recommendations**: Semantic search using OpenAI embeddings for personalized suggestions
- **Health-Aware Itineraries**: Day-by-day plans with scheduled rest periods and fatigue management
- **Accessibility First**: 325+ wheelchair-accessible experiences across 18 countries
- **Profile Auto-Population**: Health conditions and preferences automatically fill throughout the app

### 🏥 Health & Wellness Management
- **Smart Pre-Trip Checklists**: Medical documentation, medication prep, and local health requirements
- **Morning Wellness Check-in**: 2-minute daily assessment with automatic itinerary adjustments
- **Wellness Tracking**: Multi-day trend analysis with personalized activity recommendations
- **Health Profile**: Complete medical history with conditions, medications, allergies, and insurance
- **Medical Timeline**: Track medications, check-ins, and health events throughout your trip
- **Emergency Contacts**: Quick access to insurance details and emergency numbers

### 🤖 AI Trip Assistant
- **Trip Assistant Chatbot**: Conversational AI powered by LangChain and GPT-4 for:
  - Flight and hotel alternatives
  - Itinerary modifications and suggestions
  - Real-time trip adjustments based on wellness check-ins
  - Emergency information and support
- **Context-Aware**: Understands your full trip context, health profile, and current wellness state
- **Natural Language**: Ask questions in plain English and get intelligent, personalized responses

### 📋 Interactive Itinerary Management
- **Detailed Day-by-Day View**: Complete trip breakdown with times, activities, and health metrics
- **Activity-Level Editing**: Edit time, title, and description for each activity with inline buttons
- **Day-Level Customization**: Edit day titles and themes
- **Health Metrics Display**: Fatigue levels, medical safety scores, and step counts per day
- **Activity Type Icons**: Visual indicators for arrival, hotel, meals, rest, and experiences
- **Color-Coded Activities**: Critical activities highlighted (yellow for mandatory rest)
- **Medical Notes**: Accessibility information and health considerations per activity
- **Download Itinerary**: Export complete trip plan as text file

### 👤 User Profile & Dashboard
- **Beautiful Profile Page**: Gradient header with avatar, quick stats (trips, countries, experiences)
- **Health Overview**: Display all conditions, medications, allergies, and dietary restrictions with icons
- **Travel Interests**: Styled tags showing your preferences
- **Account Information**: Member since date and profile completion status
- **Onboarding Flow**: 3-step profile setup for new users
- **Profile Pre-Population**: Your health data automatically appears in trip planning wizard

### ♿ Accessibility & Inclusivity
- **WCAG AA Compliant**: Accessible colors, contrast ratios, and typography
- **Keyboard Navigation**: Full keyboard accessibility throughout the platform
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Mobile Responsive**: Optimized for all devices and screen sizes
- **Diversity Stats**: Track woman-owned, BIPOC-owned, LGBTQ+ friendly, and family-friendly venues

## Database Statistics

- **325+ experiences** across 18 countries
- **97.5%** wheelchair accessible
- **15.1%** woman-owned businesses
- **14.5%** BIPOC-owned businesses
- **88.9%** LGBTQ+ friendly
- **98.8%** family-friendly

## Countries Covered

**North America:** USA, Canada, Mexico
**South America:** Brazil, Argentina
**Europe:** UK, France, Italy, Spain, Germany
**Asia:** Japan, China, Thailand, India, UAE, Singapore
**Oceania:** Australia, New Zealand

## Recent Updates (v2.1 - October 2025)

### 🆕 Trip Planning Wizard
- Animated side-panel wizard for step-by-step trip creation
- Real-time flight search with Amadeus API integration
- Booking.com hotel search preparation
- Interactive experience selection with live filtering
- Profile data auto-populates throughout wizard
- Beautiful animations and transitions

### 🆕 Itinerary Management
- Detailed day-by-day view with complete activity breakdown
- Edit buttons for every activity and day
- Download itinerary as text file
- Activity type icons and color coding
- Health metrics display per day
- Medical notes and accessibility information

### 🆕 Profile System
- Professional profile page with gradient header
- Quick stats dashboard (trips, countries, experiences)
- Complete health information display
- Travel interests and dietary restrictions
- 3-step onboarding flow for new users
- Profile auto-loading throughout the app

### 🆕 Firebase Integration
- Firebase Client SDK for Firestore operations
- User profile persistence
- Trip data storage and retrieval
- Seamless authentication flow
- Real-time data synchronization

### 🆕 API Integrations
- Amadeus API for flight search
- Booking.com API preparation for hotel booking
- Enhanced trip planning with real booking data

## Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Firebase project (for authentication and data storage)
- Amadeus API credentials (optional, for flight search)

### Installation
```bash
npm install
```

### Environment Setup
Create `.env` file:
```
OPENAI_API_KEY=your_openai_key
PORT=3001
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
```

### Run Server
```bash
# Start production server
node server-production.js

# Access application
# Navigate to http://localhost:3001
```

## API Endpoints

### Authentication & User Management
- **POST /api/auth/register** - Create new user account
- **POST /api/auth/login** - User login
- **GET /api/profile/:userId** - Get user profile
- **PUT /api/profile/:userId** - Update user profile

### Trip Planning & Booking
- **POST /api/itinerary/generate** - Generate complete trip itinerary with health considerations
- **POST /api/flights/search** - Search accessible flights via Amadeus API
- **GET /api/airports/search** - Airport autocomplete
- **POST /api/hotels/search** - Search hotels via Booking.com API
- **POST /api/trips** - Save trip to user account
- **GET /api/trips/:userId** - Get all user trips
- **GET /api/trips/:tripId** - Get specific trip details
- **PUT /api/trips/:tripId** - Update trip details

### Wellness & Health Management
- **POST /api/wellness/medications** - Add medication
- **GET /api/wellness/medications** - Get all medications
- **PUT /api/wellness/medications/:id** - Update medication
- **DELETE /api/wellness/medications/:id** - Delete medication

- **POST /api/wellness/conditions** - Add medical condition
- **GET /api/wellness/conditions** - Get all conditions
- **PUT /api/wellness/conditions/:id** - Update condition
- **DELETE /api/wellness/conditions/:id** - Delete condition

- **POST /api/wellness/allergies** - Add allergy
- **GET /api/wellness/allergies** - Get all allergies
- **PUT /api/wellness/allergies/:id** - Update allergy
- **DELETE /api/wellness/allergies/:id** - Delete allergy

- **POST /api/wellness/insurance** - Add insurance information
- **GET /api/wellness/insurance** - Get insurance information
- **PUT /api/wellness/insurance/:id** - Update insurance
- **DELETE /api/wellness/insurance/:id** - Delete insurance

- **POST /api/wellness/checkin** - Daily wellness check-in
- **GET /api/wellness/trend/:session_id** - Get wellness trends

### Recommendations
- **POST /api/recommend** - Get personalized experience recommendations
- **GET /api/experiences** - Filter experiences by country/city/type
- **GET /api/experiences/:id** - Get single experience details
- **GET /api/stats** - Database statistics

### AI Assistant
- **POST /api/chat** - Conversational trip planning with LangChain + GPT-4

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (HTML/CSS/JS)          │
│  • Landing Page (index.html)            │
│  • Dashboard with Trip Wizard           │
│  • Wellness Management                  │
│  • Detailed Itinerary View              │
│  • User Profile & Onboarding            │
│  • Authentication (signin/signup)       │
└───────────────┬─────────────────────────┘
                │
                │ REST API
                ▼
┌─────────────────────────────────────────┐
│      Backend (Node.js/Express)          │
│  • Recommendation Engine                │
│  • Itinerary Generator                  │
│  • Wellness Manager                     │
│  • Trip Assistant Chatbot               │
│  • Session Management                   │
└───────────────┬─────────────────────────┘
                │
                ├─→ OpenAI (GPT-4 + Embeddings)
                ├─→ Firebase (Auth + Firestore)
                ├─→ Amadeus API (Flight Search)
                ├─→ Booking.com API (Hotel Search)
                └─→ Experience Database (325+ entries)
```

## Project Structure

```
JournoAI/
├── Mari/
│   ├── public/
│   │   ├── index.html              # Landing page
│   │   ├── dashboard.html          # Main dashboard with trip wizard
│   │   ├── wellness.html           # Health management
│   │   ├── mytrips.html           # Trip visualization & itinerary
│   │   ├── profile.html           # User profile
│   │   ├── onboarding.html        # User onboarding flow
│   │   ├── signin.html            # Authentication
│   │   ├── signup.html            # Registration
│   │   ├── css/
│   │   │   └── style.css          # Global styles
│   │   ├── js/
│   │   │   └── firebase-config.js # Firebase initialization
│   │   └── images/                # Static assets
│   ├── src/
│   │   ├── recommender.js         # Recommendation engine
│   │   ├── conversationManager.js # LangChain chatbot
│   │   ├── tripAssistantChatbot.js # Trip assistant AI
│   │   ├── itineraryGenerator.js  # Trip generation
│   │   ├── firebaseAdmin.js       # Firebase client SDK
│   │   ├── wellnessManager.js     # Health tracking
│   │   ├── flightModule.js        # Amadeus flight search
│   │   ├── hotelModule.js         # Hotel search integration
│   │   ├── bookingComHotelSearch.js # Booking.com API
│   │   ├── checklistGenerator.js  # Pre-trip checklists
│   │   └── dailyChecklistManager.js # Day-by-day tasks
│   ├── data/
│   │   ├── experiences/           # Experience database
│   │   │   ├── north-america/
│   │   │   ├── europe/
│   │   │   ├── asia/
│   │   │   ├── south-america/
│   │   │   └── oceania/
│   │   └── metadata.json
│   ├── server-production.js       # Production server
│   ├── package.json
│   ├── README.md
│   ├── RAILWAY_DEPLOYMENT.md      # Deployment guide
│   └── API_KEYS_SETUP.md          # API setup instructions
└── README.md
```

## User Journey: Sarah's Story

**Who:** Sarah Mitchell, 40-year-old freelance designer from Austin, TX
**Challenges:** Wheelchair user + Type 1 Diabetic (insulin-dependent)
**Dream:** Visit Rome independently for the first time

### Before JournoAI
- Too scared to travel internationally alone
- Hours of research, still uncertain about accessibility
- Gave up on Rome dream multiple times

### With JournoAI
1. **Onboarding** - Quick 3-step profile setup with health conditions and travel preferences
2. **Trip Wizard** - Found accessible flights from Austin to Rome in minutes
3. **Hotel Search** - Discovered wheelchair-accessible hotels near Vatican with diabetic-friendly dining
4. **Experience Selection** - Chose 5 accessible experiences (Colosseum, Vatican, Trevi Fountain, etc.)
5. **AI Itinerary** - Generated complete 5-day plan with rest periods and medical checkpoints
6. **Daily Wellness** - Morning check-ins adjust activities based on energy levels
7. **Trip Assistant** - 24/7 chatbot support for questions and itinerary changes
8. **Download & Go** - Exported complete itinerary with medical notes

**Result:** Sarah booked her Rome trip with confidence!

## Health-Aware Features

### Pre-Trip Health Checklist
Personalized travel preparation lists organized by timeline:
- Medical supplies and documentation
- Prescription refills and insurance verification
- Destination-specific health recommendations
- Emergency contact preparation

### Morning Wellness Check-In
Daily health tracking with automatic itinerary adjustment:
- 2-minute check-in (sleep, energy, pain levels)
- Wellness score (0-100) with personalized recommendations
- Auto-adjusts activities when tired or in pain
- Tracks health trends throughout trip

### Day-by-Day Activity Management
Real-time progress tracking with medical checkpoints:
- Daily tasks organized by time (morning/activity/evening)
- Medical tracking: medications, glucose checks, meals
- Smart packing lists with critical items flagged
- Progress monitoring and completion tracking

### Emergency Contact Integration
Quick access to critical health information:
- Insurance details with emergency phone numbers
- Policy numbers and international coverage status
- Medical condition summaries in multiple languages
- Accessible from dashboard and wellness sections

## Design System

### Color Palette
- **Primary:** Blue (#2563eb) - Trust and reliability
- **Success:** Green (#10b981) - Health and wellness
- **Accent:** Purple (#8b5cf6) - Modern and accessible
- **Brand Colors:** Burgundy (#8B1538) and Orange (#E87722)

### Typography
- **Font:** Inter (Google Fonts)
- **Heading Sizes:** 2.5rem - 4rem (responsive)
- **Body Text:** 0.9375rem - 1.25rem (responsive)
- **Line Height:** 1.6 - 1.7 for readability

### Components
- Glassmorphism cards with backdrop blur
- Gradient backgrounds and buttons
- Smooth animations (0.3s cubic-bezier)
- Shadow system (sm, md, lg, xl, 2xl)
- Border radius system (sm to 2xl)

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Google Fonts (Inter)
- Firebase Client SDK (Authentication)
- Responsive design with CSS Grid and Flexbox
- Animated UI components and transitions

### Backend
- Node.js 18+
- Express.js (REST API)
- LangChain (Conversational AI)
- OpenAI GPT-4 (Text generation)
- OpenAI Embeddings (Semantic search)
- Firebase Admin SDK (Firestore)
- Amadeus API (Flight search)
- Booking.com API (Hotel search)

### Database
- Firebase Firestore (User data, trips, wellness)
- JSON files (Experience database)

### Deployment
- Railway (Production) - See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- Render (Alternative)
- Nixpacks configuration for optimal builds
- Environment variable management
- Rate limiting and security
- Health check monitoring

## Security

- Firebase Authentication with email/password
- API rate limiting (100 requests per 15 minutes)
- Environment variable protection
- Input validation and sanitization
- CORS configuration
- Secure headers and error handling

## Performance

- **Server Startup:** Instant response with background service initialization (5-10s)
- **Search Speed:** <100ms average response time
- **Scalability:** Handles 100+ concurrent requests
- **Reliability:** 99.9% uptime with proper deployment
- **Data Coverage:** 18 countries, 159 cities, 325+ experiences
- **Mobile-optimized:** <3s initial load time
- **Railway Deployment:** Zero downtime with immediate static file serving

## Accessibility

- WCAG 2.1 AA compliant color contrast
- Keyboard navigation support
- Screen reader friendly with semantic HTML
- Reduced motion support for animations
- Large touch targets (min 44x44px)
- Focus indicators on interactive elements
- Alt text for all images
- Form labels and error messages

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This project is built for travelers with accessibility needs. Contributions that enhance accessibility, add new health features, or expand location coverage are welcome.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC License

---

**Built for inclusive, health-aware travel experiences worldwide**

🌍 **Live Demo:** [https://mari-production.up.railway.app/](https://mari-production.up.railway.app/)

Version: 2.1
Last Updated: October 2025
Built with ❤️ for accessible travel
