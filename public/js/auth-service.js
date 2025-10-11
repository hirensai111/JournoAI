// Authentication Service for Journey AI
// Handles all Firebase auth operations

class AuthService {
  constructor() {
    this.auth = window.firebaseAuth;
  }

  // Sign up with email and password
  async signUp(email, password, displayName) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update profile with display name
      if (displayName) {
        await user.updateProfile({ displayName });
      }

      console.log('✅ User created:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log('✅ User signed in:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      console.log('✅ Google sign in successful:', user.email);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Google sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.auth.signOut();
      console.log('✅ User signed out');
      window.location.href = '/';
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      console.log('✅ Password reset email sent');
      return { success: true };
    } catch (error) {
      console.error('❌ Password reset error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.auth.currentUser;
  }

  // Get user token for API calls
  async getUserToken() {
    const user = this.getCurrentUser();
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  // Convert Firebase error codes to user-friendly messages
  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign in was cancelled.',
      'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
    };

    return errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
  }
}

// Create global instance
window.authService = new AuthService();
