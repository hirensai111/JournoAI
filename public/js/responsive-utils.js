/**
 * Responsive Utilities
 * Provides device detection and adaptive UI helpers for mobile vs desktop
 */

class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      mobile: 640,
      tablet: 768,
      desktop: 1024,
      wide: 1280
    };

    this.deviceType = this.detectDevice();
    this.init();
  }

  /**
   * Detect device type based on screen width and user agent
   */
  detectDevice() {
    const width = window.innerWidth;
    const ua = navigator.userAgent.toLowerCase();

    // Check for mobile devices in user agent
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Determine device type
    if (width <= this.breakpoints.mobile || (isMobileUA && width <= this.breakpoints.tablet)) {
      return 'mobile';
    } else if (width <= this.breakpoints.tablet) {
      return hasTouch ? 'mobile' : 'tablet';
    } else if (width <= this.breakpoints.desktop) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Initialize responsive features
   */
  init() {
    // Add device class to body
    document.body.classList.add(`device-${this.deviceType}`);
    document.body.setAttribute('data-device', this.deviceType);

    // Add viewport-based classes
    this.updateViewportClasses();

    // Listen for resize events (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 200);
    });

    // Log device info for debugging
    console.log(`📱 Device detected: ${this.deviceType}`);
    console.log(`📐 Screen: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`👆 Touch: ${('ontouchstart' in window) ? 'Yes' : 'No'}`);
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const newDeviceType = this.detectDevice();

    // If device type changed, update classes
    if (newDeviceType !== this.deviceType) {
      console.log(`📱 Device changed: ${this.deviceType} → ${newDeviceType}`);
      document.body.classList.remove(`device-${this.deviceType}`);
      document.body.classList.add(`device-${newDeviceType}`);
      document.body.setAttribute('data-device', newDeviceType);
      this.deviceType = newDeviceType;

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('deviceTypeChanged', {
        detail: { deviceType: newDeviceType }
      }));
    }

    this.updateViewportClasses();
  }

  /**
   * Update viewport-based CSS classes
   */
  updateViewportClasses() {
    const width = window.innerWidth;

    // Remove all viewport classes
    document.body.classList.remove('viewport-mobile', 'viewport-tablet', 'viewport-desktop', 'viewport-wide');

    // Add appropriate viewport class
    if (width <= this.breakpoints.mobile) {
      document.body.classList.add('viewport-mobile');
    } else if (width <= this.breakpoints.tablet) {
      document.body.classList.add('viewport-tablet');
    } else if (width <= this.breakpoints.desktop) {
      document.body.classList.add('viewport-desktop');
    } else {
      document.body.classList.add('viewport-wide');
    }

    // Add orientation class
    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    document.body.classList.remove('orientation-portrait', 'orientation-landscape');
    document.body.classList.add(`orientation-${orientation}`);
  }

  /**
   * Check if current device is mobile
   */
  isMobile() {
    return this.deviceType === 'mobile';
  }

  /**
   * Check if current device is tablet
   */
  isTablet() {
    return this.deviceType === 'tablet';
  }

  /**
   * Check if current device is desktop
   */
  isDesktop() {
    return this.deviceType === 'desktop';
  }

  /**
   * Check if current viewport width is below a breakpoint
   */
  isBelow(breakpoint) {
    return window.innerWidth <= (this.breakpoints[breakpoint] || breakpoint);
  }

  /**
   * Check if current viewport width is above a breakpoint
   */
  isAbove(breakpoint) {
    return window.innerWidth > (this.breakpoints[breakpoint] || breakpoint);
  }

  /**
   * Get current device type
   */
  getDeviceType() {
    return this.deviceType;
  }

  /**
   * Get current viewport width category
   */
  getViewportCategory() {
    const width = window.innerWidth;

    if (width <= this.breakpoints.mobile) return 'mobile';
    if (width <= this.breakpoints.tablet) return 'tablet';
    if (width <= this.breakpoints.desktop) return 'desktop';
    return 'wide';
  }

  /**
   * Adaptive font scaling for mobile
   */
  scaleFontForMobile(baseFontSize) {
    if (this.isMobile()) {
      return baseFontSize * 0.9;
    }
    return baseFontSize;
  }

  /**
   * Get touch-friendly button padding
   */
  getTouchPadding() {
    return this.isMobile() ? '12px 20px' : '10px 16px';
  }

  /**
   * Show/hide element based on device type
   */
  showOnDevice(element, deviceTypes) {
    const devices = Array.isArray(deviceTypes) ? deviceTypes : [deviceTypes];
    element.style.display = devices.includes(this.deviceType) ? '' : 'none';
  }

  /**
   * Apply mobile-specific styles
   */
  applyMobileStyles(element, styles) {
    if (this.isMobile()) {
      Object.assign(element.style, styles);
    }
  }

  /**
   * Apply desktop-specific styles
   */
  applyDesktopStyles(element, styles) {
    if (this.isDesktop()) {
      Object.assign(element.style, styles);
    }
  }
}

// Initialize responsive manager on page load
let responsiveManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    responsiveManager = new ResponsiveManager();
    window.responsiveManager = responsiveManager;
  });
} else {
  responsiveManager = new ResponsiveManager();
  window.responsiveManager = responsiveManager;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveManager;
}
