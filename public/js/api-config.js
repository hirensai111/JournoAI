/**
 * API Configuration
 * Automatically detects the correct API base URL for development vs production
 */

class APIConfig {
  constructor() {
    this.baseURL = this.detectBaseURL();
    console.log(`🔗 API Base URL: ${this.baseURL}`);
  }

  /**
   * Detect the correct API base URL based on environment
   */
  detectBaseURL() {
    // Check if we're in production (Railway, Vercel, etc.)
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // Production detection
    if (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.startsWith('192.168.') &&
      !hostname.startsWith('10.') &&
      !hostname.includes('local')
    ) {
      // Production: Use same origin (Railway serves both frontend and API)
      console.log('🌐 Production environment detected');
      return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }

    // Development: Use localhost with default port
    console.log('💻 Development environment detected');
    return 'http://localhost:3001';
  }

  /**
   * Get full API endpoint URL
   */
  getEndpoint(path) {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${this.baseURL}/${cleanPath}`;
  }

  /**
   * Make a fetch request with proper error handling
   */
  async fetch(endpoint, options = {}) {
    const url = this.getEndpoint(endpoint);

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, data);
      return data;

    } catch (error) {
      console.error(`❌ API Error: ${url}`, error);

      // Provide user-friendly error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      } else if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        throw new Error('Request blocked. Please disable ad blockers or try a different browser.');
      } else {
        throw error;
      }
    }
  }

  /**
   * POST request helper
   */
  async post(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * GET request helper
   */
  async get(endpoint) {
    return this.fetch(endpoint, {
      method: 'GET'
    });
  }

  /**
   * PUT request helper
   */
  async put(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * PATCH request helper
   */
  async patch(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request helper
   */
  async delete(endpoint) {
    return this.fetch(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Check if API is reachable
   */
  async healthCheck() {
    try {
      const data = await this.get('api/health');
      console.log('✅ API Health Check:', data);
      return data;
    } catch (error) {
      console.error('❌ API Health Check Failed:', error);
      return null;
    }
  }
}

// Create global API instance
const api = new APIConfig();

// Make it globally available
window.api = api;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIConfig;
}

// Perform health check on load (optional, for debugging)
if (window.location.pathname.includes('dashboard')) {
  setTimeout(() => {
    api.healthCheck().catch(err => {
      console.warn('⚠️ API may not be fully initialized yet:', err.message);
    });
  }, 1000);
}
