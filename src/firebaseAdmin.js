import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Firebase Client Service
 * Uses Firebase Client SDK to handle Firestore database operations
 * This works with the existing Firebase config without requiring service account
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdYbPam_LOUGIDv8BBgLJpFBv-0mCt51E",
  authDomain: "journiai.firebaseapp.com",
  projectId: "journiai",
  storageBucket: "journiai.firebasestorage.app",
  messagingSenderId: "804188518563",
  appId: "1:804188518563:web:85a6e06304ac0c366de716",
  measurementId: "G-1T30VZSCMP"
};

let app = null;
let db = null;
let initialized = false;

// Initialize Firebase
function initializeFirebase() {
  if (initialized) {
    return { db, app };
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    initialized = true;

    console.log('✅ Firebase Client SDK initialized successfully');
    console.log(`📦 Project: ${firebaseConfig.projectId}`);
    return { db, app };

  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.log('   Continuing without Firestore');
    initialized = true;
    return { db: null, app: null };
  }
}

/**
 * Firestore Collections Helper
 */
const Collections = {
  USERS: 'users',
  TRIPS: 'trips',
  ITINERARIES: 'itineraries',
  CHECKLISTS: 'checklists',
  WELLNESS_CHECKINS: 'wellness_checkins'
};

/**
 * User Profile Operations
 */
const UserService = {
  async createOrUpdateProfile(userId, profileData) {
    if (!db) {
      console.log('📝 Would save to Firestore:', { userId, profileData });
      return { success: true, id: userId };
    }

    try {
      const userRef = doc(db, Collections.USERS, userId);
      await setDoc(userRef, {
        ...profileData,
        updated_at: serverTimestamp()
      }, { merge: true });

      console.log(`✅ User profile saved to Firestore: ${userId}`);
      console.log(`   Name: ${profileData.full_name}`);
      console.log(`   Conditions: ${profileData.conditions?.join(', ') || 'none'}`);
      return { success: true, id: userId };
    } catch (error) {
      console.error('❌ Error saving user profile:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getProfile(userId) {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    try {
      const userRef = doc(db, Collections.USERS, userId);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        return { success: false, error: 'Profile not found' };
      }

      console.log(`✅ Retrieved profile for user: ${userId}`);
      return { success: true, data: docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting user profile:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Trip Operations
 */
const TripService = {
  async createTrip(userId, tripData) {
    if (!db) {
      console.log('📝 Would save trip to Firestore:', { userId, tripData });
      return { success: true, id: `trip_${Date.now()}` };
    }

    try {
      const tripId = `trip_${Date.now()}_${userId.substring(0, 8)}`;
      const tripRef = doc(db, Collections.TRIPS, tripId);

      const trip = {
        ...tripData,
        user_id: userId,
        created_at: serverTimestamp(),
        status: 'planning' // planning, booked, completed
      };

      await setDoc(tripRef, trip);
      console.log(`✅ Trip created in Firestore: ${tripId}`);
      console.log(`   Destination: ${tripData.destination}`);
      console.log(`   Duration: ${tripData.duration || 'N/A'} days`);

      return { success: true, id: tripId };
    } catch (error) {
      console.error('❌ Error creating trip:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getUserTrips(userId) {
    if (!db) {
      return { success: true, trips: [] };
    }

    try {
      const tripsRef = collection(db, Collections.TRIPS);
      const q = query(
        tripsRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const trips = [];

      querySnapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${trips.length} trips for user: ${userId}`);
      return { success: true, trips };
    } catch (error) {
      console.error('❌ Error getting trips:', error.message);
      return { success: false, error: error.message };
    }
  },

  async updateTrip(tripId, updates) {
    if (!db) {
      console.log('📝 Would update trip:', { tripId, updates });
      return { success: true };
    }

    try {
      const tripRef = doc(db, Collections.TRIPS, tripId);
      await setDoc(tripRef, {
        ...updates,
        updated_at: serverTimestamp()
      }, { merge: true });

      console.log(`✅ Trip updated: ${tripId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating trip:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Itinerary Operations
 */
const ItineraryService = {
  async saveItinerary(tripId, userId, itineraryData) {
    if (!db) {
      console.log('📝 Would save itinerary:', { tripId, userId });
      return { success: true, id: `itinerary_${Date.now()}` };
    }

    try {
      const itineraryRef = doc(db, Collections.ITINERARIES, tripId);
      await setDoc(itineraryRef, {
        ...itineraryData,
        trip_id: tripId,
        user_id: userId,
        created_at: serverTimestamp()
      });

      console.log(`✅ Itinerary saved: ${tripId}`);
      console.log(`   Days: ${itineraryData.days?.length || 'N/A'}`);
      return { success: true, id: tripId };
    } catch (error) {
      console.error('❌ Error saving itinerary:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getItinerary(tripId) {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    try {
      const itineraryRef = doc(db, Collections.ITINERARIES, tripId);
      const docSnap = await getDoc(itineraryRef);

      if (!docSnap.exists()) {
        return { success: false, error: 'Itinerary not found' };
      }

      console.log(`✅ Retrieved itinerary: ${tripId}`);
      return { success: true, data: docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting itinerary:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Wellness Check-in Operations
 */
const WellnessService = {
  async saveCheckIn(userId, tripId, checkInData) {
    if (!db) {
      console.log('📝 Would save wellness check-in:', { userId, tripId });
      return { success: true };
    }

    try {
      const checkInId = `checkin_${Date.now()}_${userId.substring(0, 8)}`;
      const checkInRef = doc(db, Collections.WELLNESS_CHECKINS, checkInId);

      await setDoc(checkInRef, {
        ...checkInData,
        user_id: userId,
        trip_id: tripId,
        created_at: serverTimestamp()
      });

      console.log(`✅ Wellness check-in saved: ${checkInId}`);
      return { success: true, id: checkInId };
    } catch (error) {
      console.error('❌ Error saving wellness check-in:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getCheckIns(userId, tripId, limitCount = 7) {
    if (!db) {
      return { success: true, checkIns: [] };
    }

    try {
      const checkInsRef = collection(db, Collections.WELLNESS_CHECKINS);
      const q = query(
        checkInsRef,
        where('user_id', '==', userId),
        where('trip_id', '==', tripId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const checkIns = [];

      querySnapshot.forEach((doc) => {
        checkIns.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${checkIns.length} wellness check-ins`);
      return { success: true, checkIns };
    } catch (error) {
      console.error('❌ Error getting check-ins:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// Initialize on module load
const { db: database, app: firebaseApp } = initializeFirebase();

export {
  database as db,
  firebaseApp as app,
  Collections,
  UserService,
  TripService,
  ItineraryService,
  WellnessService
};

export default {
  db: database,
  app: firebaseApp,
  Collections,
  UserService,
  TripService,
  ItineraryService,
  WellnessService
};
