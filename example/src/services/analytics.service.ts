import { logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

export interface AnalyticsEvents {
  // Standard Firebase events
  page_view: { page_location: string; page_title: string };
  app_initialized: { version: string };

  // Auth events
  login: { method: string };
  logout: {};

  // Project events
  project_created: { project_id: string };
  project_opened: { project_id: string };
  project_deleted: { project_id: string };
  project_shared: { project_id: string };
  project_pinned: { project_id: string; pinned: boolean };

  // Icon events
  icon_uploaded: { project_id: string; icon_count: number };
  icon_deleted: { project_id: string };
  icon_edited: { project_id: string };

  // Export events
  font_exported: {
    project_id: string;
    format: string;
    icon_count: number;
    export_time_ms: number;
  };

  // UI events
  language_changed: { from_locale: string; to_locale: string };
  theme_changed: { theme: string };
  pwa_installed: {};

  // Error events
  error_occurred: {
    error_type: string;
    error_message: string;
    context: string;
  };
}

class AnalyticsService {
  private isEnabled = true;

  constructor() {
    // Disable analytics in development
    if (import.meta.env.DEV) {
      this.isEnabled = false;
      console.log('📊 Analytics disabled in development mode');
    }
  }

  /**
   * Track custom event
   */
  track<K extends keyof AnalyticsEvents>(
    eventName: K,
    eventParams: AnalyticsEvents[K]
  ): void {
    if (!this.isEnabled || !analytics) return;

    try {
      logEvent(analytics, eventName as string, {
        ...eventParams,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        is_mobile: /Mobi|Android/i.test(navigator.userAgent),
      });

      if (import.meta.env.DEV) {
        console.log('📊 Analytics event:', eventName, eventParams);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Set user ID for analytics tracking
   */
  setUserId(userId: string | null): void {
    if (!this.isEnabled || !analytics) return;

    try {
      // Firebase Analytics v9 doesn't export setUserId function
      // We'll track user ID as a custom event
      if (userId) {
        logEvent(analytics, 'user_id_set', { user_id: userId });
      }

      if (import.meta.env.DEV) {
        console.log('📊 Analytics user ID set:', userId);
      }
    } catch (error) {
      console.error('Analytics setUserId error:', error);
    }
  }  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string | number | boolean>): void {
    if (!this.isEnabled || !analytics) return;

    try {
      // Firebase Analytics v9 modular SDK uses different approach
      // We'll track user properties as custom events
      logEvent(analytics, 'user_properties_set', properties);

      if (import.meta.env.DEV) {
        console.log('📊 Analytics user properties set:', properties);
      }
    } catch (error) {
      console.error('Analytics setUserProperties error:', error);
    }
  }  /**
   * Track page view
   */
  trackPageView(path: string, title?: string): void {
    this.track('page_view', {
      page_location: window.location.origin + path,
      page_title: title || document.title
    });
  }

  /**
   * Track app initialization
   */
  trackAppInitialized(): void {
    this.track('app_initialized', {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0'
    });
  }

  /**
   * Track user login with user properties
   */
  trackUserLogin(method: string, userInfo: { uid: string; email?: string; displayName?: string }): void {
    this.setUserId(userInfo.uid);
    this.setUserProperties({
      login_method: method,
      has_email: Boolean(userInfo.email),
      has_display_name: Boolean(userInfo.displayName)
    });

    this.track('login', { method });
  }

  /**
   * Track user logout and clear user data
   */
  trackUserLogout(): void {
    this.track('logout', {});
    this.setUserId(null);
    this.setUserProperties({});
  }



  /**
   * Track performance metrics
   */
  trackPerformance(metricName: string, value: number, unit?: string): void {
    if (!this.isEnabled || !analytics) return;

    logEvent(analytics, 'performance_metric', {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit || 'ms',
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, value?: number): void {
    if (!this.isEnabled || !analytics) return;

    logEvent(analytics, 'user_engagement', {
      engagement_action: action,
      engagement_value: value,
    });
  }



  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`📊 Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export const analyticsService = new AnalyticsService();