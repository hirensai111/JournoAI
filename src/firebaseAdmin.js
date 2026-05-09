import dotenv from 'dotenv';

dotenv.config();

/**
 * Firebase Admin Service
 * Uses Firebase Admin SDK for privileged server-side Firestore access.
 * Falls back to Firebase Client SDK for local development without admin credentials.
 */

let db = null;
let app = null;
let initialized = false;
let isAdmin = false;

// Firebase Client SDK fallback config
const firebaseClientConfig = {
  apiKey: "AIzaSyAdYbPam_LOUGIDv8BBgLJpFBv-0mCt51E",
  authDomain: "journiai.firebaseapp.com",
  projectId: "journiai",
  storageBucket: "journiai.firebasestorage.app",
  messagingSenderId: "804188518563",
  appId: "1:804188518563:web:85a6e06304ac0c366de716",
  measurementId: "G-1T30VZSCMP"
};

function parsePrivateKey(key) {
  if (!key) return null;
  // Handle various newline encodings that env vars can introduce
  return key
    .replace(/\\n/g, '\n')     // literal \n  -> newline
    .replace(/\\\n/g, '\n')    // escaped \n -> newline (defensive)
    .trim();
}

async function initializeFirebase() {
  if (initialized) {
    return { db, app, isAdmin };
  }

  // Check for Admin SDK credentials
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = parsePrivateKey(rawPrivateKey);

  const hasProjectId = !!projectId;
  const hasClientEmail = !!clientEmail;
  const hasPrivateKey = !!privateKey;

  console.log('🔧 Firebase initialization starting...');
  console.log(`   FIREBASE_PROJECT_ID present: ${hasProjectId} (${projectId || 'not set'})`);
  console.log(`   FIREBASE_CLIENT_EMAIL present: ${hasClientEmail} (${clientEmail || 'not set'})`);
  console.log(`   FIREBASE_PRIVATE_KEY present: ${hasPrivateKey} (length: ${privateKey ? privateKey.length : 0})`);

  const hasAdminCreds = hasProjectId && hasClientEmail && hasPrivateKey;

  if (hasAdminCreds) {
    try {
      const { initializeApp: initAdmin, cert } = await import('firebase-admin/app');
      const { getFirestore: getAdminDb, Timestamp, FieldValue } = await import('firebase-admin/firestore');

      console.log('   Attempting Firebase Admin SDK initialization...');

      app = initAdmin({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      db = getAdminDb(app);
      isAdmin = true;
      initialized = true;

      // Patch admin db to expose compatible methods used by this module
      db._serverTimestamp = () => FieldValue.serverTimestamp();
      db._Timestamp = Timestamp;

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`📦 Project: ${projectId}`);
      console.log(`🔐 Mode: ADMIN (bypasses Firestore security rules)`);
      return { db, app, isAdmin };
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization FAILED:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n   '));
      }
      console.log('   Will attempt Firebase Client SDK fallback...');
    }
  } else {
    console.log('⚠️  Firebase Admin credentials incomplete — falling back to Client SDK');
    console.log('   To enable Admin SDK, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
  }

  // Fallback to Firebase Client SDK
  try {
    const { initializeApp: initClient } = await import('firebase/app');
    const { getFirestore: getClientDb, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp } = await import('firebase/firestore');

    app = initClient(firebaseClientConfig);
    db = getClientDb(app);
    isAdmin = false;
    initialized = true;

    // Patch client db to expose compatible methods used by this module
    db._serverTimestamp = () => serverTimestamp();
    db._collection = collection;
    db._doc = doc;
    db._setDoc = setDoc;
    db._getDoc = getDoc;
    db._getDocs = getDocs;
    db._query = query;
    db._where = where;
    db._orderBy = orderBy;
    db._limit = limit;

    console.log('✅ Firebase Client SDK initialized successfully');
    console.log(`📦 Project: ${firebaseClientConfig.projectId}`);
    console.log(`⚠️  Mode: CLIENT (subject to Firestore security rules)`);
    console.log(`   If you see "Missing or insufficient permissions", update your Firestore rules or use Admin SDK.`);
    return { db, app, isAdmin };
  } catch (error) {
    console.error('❌ Firebase Client SDK initialization failed:', error.message);
    console.log('   Continuing without Firestore');
    initialized = true;
    return { db: null, app: null, isAdmin: false };
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

// Internal helpers that work with both Admin and Client SDKs
function getDocRef(...pathSegments) {
  if (isAdmin) {
    return db.doc(pathSegments.join('/'));
  }
  return db._doc(db, ...pathSegments);
}

function getCollectionRef(...pathSegments) {
  if (isAdmin) {
    return db.collection(pathSegments.join('/'));
  }
  return db._collection(db, ...pathSegments);
}

async function setDocument(ref, data, options = {}) {
  if (isAdmin) {
    if (options.merge) {
      await ref.set(data, { merge: true });
    } else {
      await ref.set(data);
    }
    return;
  }
  await db._setDoc(ref, data, options);
}

async function getDocument(ref) {
  if (isAdmin) {
    const snap = await ref.get();
    return { exists: snap.exists, data: () => snap.data(), id: snap.id };
  }
  return db._getDoc(ref);
}

async function getDocuments(q) {
  if (isAdmin) {
    const snap = await q.get();
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    return { forEach: (cb) => docs.forEach(cb), docs, empty: docs.length === 0 };
  }
  return db._getDocs(q);
}

function buildQuery(collectionRef, ...constraints) {
  if (isAdmin) {
    return collectionRef.where(...constraints[0]);
  }
  return db._query(collectionRef, ...constraints);
}

function serverTimestamp() {
  return db._serverTimestamp();
}

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
      const userRef = getDocRef(Collections.USERS, userId);
      await setDocument(userRef, {
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
      const userRef = getDocRef(Collections.USERS, userId);
      const docSnap = await getDocument(userRef);

      if (!docSnap.exists) {
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
      const tripRef = getDocRef(Collections.TRIPS, tripId);

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
        status: tripData.status || 'planning'
      };

      await setDocument(tripRef, trip);
      console.log(`✅ Trip created in Firestore: ${tripId}`);
      console.log(`   Destination: ${tripData.destination}`);
      console.log(`   Duration: ${tripData.duration || 'N/A'} days`);

      return { success: true, id: tripId };
    } catch (error) {
      console.error('❌ Error creating trip:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getTrip(tripId) {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    try {
      const tripRef = getDocRef(Collections.TRIPS, tripId);
      const docSnap = await getDocument(tripRef);

      if (!docSnap.exists) {
        return { success: false, error: 'Trip not found' };
      }

      console.log(`✅ Retrieved trip: ${tripId}`);
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } catch (error) {
      console.error('❌ Error getting trip:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getUserTrips(userId) {
    if (!db) {
      return { success: true, trips: [] };
    }

    try {
      const tripsRef = getCollectionRef(Collections.TRIPS);
      let q;
      if (isAdmin) {
        q = tripsRef.where('user_id', '==', userId).orderBy('created_at', 'desc');
      } else {
        q = db._query(
          tripsRef,
          db._where('user_id', '==', userId),
          db._orderBy('created_at', 'desc')
        );
      }

      const querySnapshot = await getDocuments(q);
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
      const tripRef = getDocRef(Collections.TRIPS, tripId);
      await setDocument(tripRef, {
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

  async updateTripStatus(tripId) {
    if (!db) {
      return { success: true, status: 'planning' };
    }

    try {
      const tripRef = getDocRef(Collections.TRIPS, tripId);
      const tripSnap = await getDocument(tripRef);

      if (!tripSnap.exists) {
        return { success: false, error: 'Trip not found' };
      }

      const trip = tripSnap.data();
      const now = new Date();
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);

      let newStatus = trip.status;

      if (now > endDate) {
        newStatus = 'completed';
      } else if (now >= startDate && now <= endDate) {
        newStatus = 'in_progress';
      } else if (trip.status === 'planning' && trip.hotels?.length > 0 && trip.flights?.outbound?.length > 0) {
        newStatus = 'confirmed';
      }

      if (newStatus !== trip.status) {
        await setDocument(tripRef, {
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

  async confirmTrip(tripId) {
    if (!db) {
      return { success: true };
    }

    try {
      const tripRef = getDocRef(Collections.TRIPS, tripId);
      await setDocument(tripRef, {
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
      const itineraryRef = getDocRef(Collections.ITINERARIES, tripId);
      await setDocument(itineraryRef, {
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
      const itineraryRef = getDocRef(Collections.ITINERARIES, tripId);
      const docSnap = await getDocument(itineraryRef);

      if (!docSnap.exists) {
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
      const checkInRef = getDocRef(Collections.WELLNESS_CHECKINS, checkInId);

      await setDocument(checkInRef, {
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
      const checkInsRef = getCollectionRef(Collections.WELLNESS_CHECKINS);
      let q;
      if (isAdmin) {
        q = checkInsRef.where('user_id', '==', userId).where('trip_id', '==', tripId).orderBy('created_at', 'desc').limit(limitCount);
      } else {
        q = db._query(
          checkInsRef,
          db._where('user_id', '==', userId),
          db._where('trip_id', '==', tripId),
          db._orderBy('created_at', 'desc'),
          db._limit(limitCount)
        );
      }

      const querySnapshot = await getDocuments(q);
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

  async saveWellnessData(userId, collectionName, data) {
    if (!db) {
      console.log('📝 Would save wellness data:', { userId, collectionName, data });
      return { success: true, id: `${collectionName}_${Date.now()}` };
    }

    try {
      const wellnessRef = getDocRef(Collections.USERS, userId, 'wellness', collectionName);
      await setDocument(wellnessRef, {
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
      const wellnessRef = getDocRef(Collections.USERS, userId, 'wellness', collectionName);
      const docSnap = await getDocument(wellnessRef);

      console.log(`📖 Document exists: ${docSnap.exists}`);
      if (!docSnap.exists) {
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
      const insuranceRef = getDocRef(Collections.USERS, userId, 'wellness', 'insurance');
      await setDocument(insuranceRef, {
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
      const insuranceRef = getDocRef(Collections.USERS, userId, 'wellness', 'insurance');
      const docSnap = await getDocument(insuranceRef);

      if (!docSnap.exists) {
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
const { db: database, app: firebaseApp } = await initializeFirebase();

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
