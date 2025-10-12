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

      // Filter out undefined values (Firestore doesn't allow them)
      const cleanedTripData = Object.entries(tripData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const trip = {
        ...cleanedTripData,
        user_id: userId,
        created_at: serverTimestamp(),
        status: tripData.status || 'planning' // planning, confirmed, in_progress, completed
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
  },

  /**
   * Update trip status based on dates and bookings
   * Planning → Confirmed → In Progress → Completed
   */
  async updateTripStatus(tripId) {
    if (!db) {
      return { success: true, status: 'planning' };
    }

    try {
      const tripRef = doc(db, Collections.TRIPS, tripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        return { success: false, error: 'Trip not found' };
      }

      const trip = tripSnap.data();
      const now = new Date();
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);

      let newStatus = trip.status;

      // Determine new status
      if (now > endDate) {
        // Trip has ended
        newStatus = 'completed';
      } else if (now >= startDate && now <= endDate) {
        // Trip is happening now
        newStatus = 'in_progress';
      } else if (trip.status === 'planning' && trip.hotels?.length > 0 && trip.flights?.outbound?.length > 0) {
        // User has selected hotels and flights
        newStatus = 'confirmed';
      }

      // Update if status changed
      if (newStatus !== trip.status) {
        await setDoc(tripRef, {
          status: newStatus,
          status_updated_at: serverTimestamp()
        }, { merge: true });

        console.log(`✅ Trip status updated: ${trip.status} → ${newStatus}`);
        return { success: true, status: newStatus, changed: true };
      }

      return { success: true, status: newStatus, changed: false };
    } catch (error) {
      console.error('❌ Error updating trip status:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Confirm trip (user manually confirms bookings)
   */
  async confirmTrip(tripId) {
    if (!db) {
      return { success: true };
    }

    try {
      const tripRef = doc(db, Collections.TRIPS, tripId);
      await setDoc(tripRef, {
        status: 'confirmed',
        confirmed_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }, { merge: true });

      console.log(`✅ Trip confirmed: ${tripId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error confirming trip:', error.message);
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
  },

  // Wellness Data Operations (Medications, Conditions, Allergies, etc.)
  async saveWellnessData(userId, collectionName, data) {
    if (!db) {
      console.log('📝 Would save wellness data:', { userId, collectionName, data });
      return { success: true, id: `${collectionName}_${Date.now()}` };
    }

    try {
      const wellnessRef = doc(db, Collections.USERS, userId, 'wellness', collectionName);
      await setDoc(wellnessRef, {
        items: data,
        updated_at: serverTimestamp()
      });

      console.log(`✅ Wellness ${collectionName} saved for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error saving wellness ${collectionName}:`, error.message);
      return { success: false, error: error.message };
    }
  },

  async getWellnessData(userId, collectionName) {
    if (!db) {
      return { success: true, data: [] };
    }

    try {
      const path = `${Collections.USERS}/${userId}/wellness/${collectionName}`;
      console.log(`📖 Fetching wellness data from: ${path}`);
      const wellnessRef = doc(db, Collections.USERS, userId, 'wellness', collectionName);
      const docSnap = await getDoc(wellnessRef);

      console.log(`📖 Document exists: ${docSnap.exists()}`);
      if (!docSnap.exists()) {
        console.log(`⚠️ No ${collectionName} found for user: ${userId}`);
        return { success: true, data: [] };
      }

      const docData = docSnap.data();
      console.log(`📖 Document data:`, JSON.stringify(docData));
      const data = docData.items || [];
      console.log(`✅ Retrieved ${data.length} ${collectionName} for user: ${userId}`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Error getting wellness ${collectionName}:`, error.message);
      return { success: false, error: error.message };
    }
  },

  async saveInsuranceData(userId, insuranceData) {
    if (!db) {
      console.log('📝 Would save insurance data:', { userId, insuranceData });
      return { success: true };
    }

    try {
      const insuranceRef = doc(db, Collections.USERS, userId, 'wellness', 'insurance');
      await setDoc(insuranceRef, {
        ...insuranceData,
        updated_at: serverTimestamp()
      });

      console.log(`✅ Insurance data saved for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving insurance data:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getInsuranceData(userId) {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    try {
      const insuranceRef = doc(db, Collections.USERS, userId, 'wellness', 'insurance');
      const docSnap = await getDoc(insuranceRef);

      if (!docSnap.exists()) {
        return { success: false, error: 'Insurance data not found' };
      }

      console.log(`✅ Retrieved insurance data for user: ${userId}`);
      return { success: true, data: docSnap.data() };
    } catch (error) {
      console.error('❌ Error getting insurance data:', error.message);
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
