// Firebase Configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdYbPam_LOUGIDv8BBgLJpFBv-0mCt51E",
  authDomain: "journiai.firebaseapp.com",
  projectId: "journiai",
  storageBucket: "journiai.firebasestorage.app",
  messagingSenderId: "804188518563",
  appId: "1:804188518563:web:85a6e06304ac0c366de716",
  measurementId: "G-1T30VZSCMP"
};

// Initialize Firebase
let app, auth;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Auth state observer
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('✅ User signed in:', user.email);
    localStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    }));
  } else {
    console.log('🔒 No user signed in');
    localStorage.removeItem('user');
  }
});

// Export for use in other files
window.firebaseAuth = auth;
