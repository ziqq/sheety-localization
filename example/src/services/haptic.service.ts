/**
 * HapticFeedback Service
 * Provides tactile feedback for user interactions on supported devices
 */

export type HapticFeedbackType =
  | 'light'     // Subtle feedback for secondary actions
  | 'medium'    // Standard feedback for primary actions
  | 'heavy'     // Strong feedback for destructive/important actions
  | 'selection' // Feedback for selection changes
  | 'impact'    // Feedback for collision/impact
  | 'success'   // Feedback for successful actions
  | 'warning'   // Feedback for warning actions
  | 'error';    // Feedback for error actions

interface VibrationPattern {
  pattern: number[];
  duration?: number;
}

class HapticFeedbackService {
  private isSupported = false;
  private isEnabled = true;

  constructor() {
    this.detectSupport();
  }

  /**
   * Detect haptic feedback support
   */
  private detectSupport(): void {
    // Check for Vibration API
    const hasVibration = 'vibrate' in navigator;

    // Check for iOS haptic feedback (requires HTTPS and user gesture)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check for Android with vibration support
    const isAndroid = /Android/.test(navigator.userAgent);

    this.isSupported = hasVibration && (isIOS || isAndroid);

    if (import.meta.env.DEV) {
      console.log('🎯 Haptic Feedback Support:', {
        supported: this.isSupported,
        hasVibration,
        isIOS,
        isAndroid,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
      });
    }
  }

  /**
   * Get vibration pattern for feedback type
   */
  private getVibrationPattern(type: HapticFeedbackType): VibrationPattern {
    const patterns: Record<HapticFeedbackType, VibrationPattern> = {
      light: { pattern: [10], duration: 10 },
      medium: { pattern: [15], duration: 15 },
      heavy: { pattern: [25], duration: 25 },
      selection: { pattern: [5], duration: 5 },
      impact: { pattern: [20], duration: 20 },
      success: { pattern: [10, 50, 10], duration: 70 },
      warning: { pattern: [15, 30, 15, 30, 15], duration: 105 },
      error: { pattern: [50, 100, 50], duration: 200 }
    };

    return patterns[type] || patterns.medium;
  }

  /**
   * Trigger haptic feedback
   */
  async trigger(type: HapticFeedbackType = 'medium'): Promise<void> {
    if (!this.isEnabled || !this.isSupported) {
      return;
    }

    try {
      const { pattern } = this.getVibrationPattern(type);

      // Use Vibration API
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate(pattern);
      }

      if (import.meta.env.DEV) {
        console.log(`🎯 Haptic feedback triggered: ${type}`, pattern);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Trigger feedback for button press
   */
  async button(type: 'primary' | 'secondary' | 'destructive' = 'primary'): Promise<void> {
    const feedbackMap = {
      primary: 'medium' as const,
      secondary: 'light' as const,
      destructive: 'heavy' as const
    };

    return this.trigger(feedbackMap[type]);
  }

  /**
   * Trigger feedback for successful action
   */
  async success(): Promise<void> {
    return this.trigger('success');
  }

  /**
   * Trigger feedback for error/failure
   */
  async error(): Promise<void> {
    return this.trigger('error');
  }

  /**
   * Trigger feedback for warning
   */
  async warning(): Promise<void> {
    return this.trigger('warning');
  }

  /**
   * Trigger feedback for selection change
   */
  async selection(): Promise<void> {
    return this.trigger('selection');
  }

  /**
   * Trigger feedback for card/item tap
   */
  async cardTap(): Promise<void> {
    return this.trigger('light');
  }

  /**
   * Trigger feedback for long press
   */
  async longPress(): Promise<void> {
    return this.trigger('heavy');
  }

  /**
   * Enable/disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (import.meta.env.DEV) {
      console.log(`🎯 Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if haptic feedback is enabled
   */
  isHapticEnabled(): boolean {
    return this.isEnabled && this.isSupported;
  }

  /**
   * Test haptic feedback with all types
   */
  async testAll(): Promise<void> {
    if (!this.isHapticEnabled()) {
      console.log('Haptic feedback not available');
      return;
    }

    const types: HapticFeedbackType[] = [
      'light', 'medium', 'heavy', 'selection',
      'impact', 'success', 'warning', 'error'
    ];

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      console.log(`Testing ${type} haptic feedback...`);
      await this.trigger(type);

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

export const hapticService = new HapticFeedbackService();