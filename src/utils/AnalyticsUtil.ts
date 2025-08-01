import { FirebaseLogger } from '../services/FirebaseService';
import { SentryLogger } from '../services/SentryService';

// Types for analytics events
export interface UserEventParams {
  [key: string]: string | number | boolean | undefined;
}

export interface UserEventContext {
  userId?: string;
  sessionId?: string;
  screen?: string;
  feature?: string;
  timestamp?: number;
  buildType?: 'debug' | 'release';
  platform?: string;
  appVersion?: string;
}

export interface APIEventPayload {
  eventName: string;
  parameters: UserEventParams;
  context: UserEventContext;
  timestamp: number;
}

/**
 * Unified Analytics Utility
 * Handles Firebase Analytics, Sentry logging, and API calls in a single method
 */
class AnalyticsUtil {
  private static instance: AnalyticsUtil;
  private apiEndpoint: string;
  private defaultContext: Partial<UserEventContext>;

  private constructor() {
    this.apiEndpoint = process.env.EXPO_PUBLIC_ANALYTICS_API_URL || 'https://api.yourapp.com/analytics';
    this.defaultContext = {
      buildType: __DEV__ ? 'debug' : 'release',
      platform: 'mobile',
      appVersion: '1.0.0',
    };
  }

  public static getInstance(): AnalyticsUtil {
    if (!AnalyticsUtil.instance) {
      AnalyticsUtil.instance = new AnalyticsUtil();
    }
    return AnalyticsUtil.instance;
  }

  /**
   * Main method to trigger user events across all analytics services
   * @param eventName - The name of the event to track
   * @param parameters - Additional parameters for the event
   * @param context - Context information (user, session, etc.)
   * @param options - Configuration options
   */
  public async triggerUserEvent(
    eventName: string,
    parameters: UserEventParams = {},
    context: UserEventContext = {},
    options?: {
      skipFirebase?: boolean;
      skipSentry?: boolean;
      skipAPI?: boolean;
      sentryLevel?: 'debug' | 'info' | 'warning' | 'error';
      includeBreadcrumb?: boolean;
    }
  ): Promise<void> {
    const finalContext: UserEventContext = {
      ...this.defaultContext,
      ...context,
      timestamp: Date.now(),
      sessionId: context.sessionId || this.generateSessionId(),
    };

    const eventPayload = {
      ...parameters,
      ...finalContext,
    };

    const promises: Promise<void>[] = [];

    try {
      // 1. Firebase Analytics
      if (!options?.skipFirebase) {
        promises.push(this.sendToFirebase(eventName, eventPayload));
      }

      // 2. Sentry Logging
      if (!options?.skipSentry) {
        promises.push(this.sendToSentry(eventName, eventPayload, options));
      }

      // 3. API Call
      if (!options?.skipAPI) {
        promises.push(this.sendToAPI({
          eventName,
          parameters,
          context: finalContext,
          timestamp: finalContext.timestamp!,
        }));
      }

      // Execute all analytics calls in parallel
      await Promise.allSettled(promises);

      // Console logging for debugging
      this.logToConsole(eventName, eventPayload, finalContext);

    } catch (error) {
      console.error('Analytics tracking failed:', error);
      
      // Log the analytics failure to Sentry (but don't recurse)
      SentryLogger.captureException(error, {
        context: 'analytics_failure',
        originalEvent: eventName,
        originalParams: parameters,
      });
    }
  }

  /**
   * Send event to Firebase Analytics
   */
  private async sendToFirebase(eventName: string, payload: any): Promise<void> {
    try {
      await FirebaseLogger.logEvent(eventName, payload);
      
      // Force upload for important events in release builds
      if (!__DEV__ && this.isImportantEvent(eventName)) {
        await FirebaseLogger.logEvent('force_upload_marker', {
          trigger_event: eventName,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Firebase analytics error:', error);
      throw error;
    }
  }

  /**
   * Send event to Sentry
   */
  private async sendToSentry(
    eventName: string, 
    payload: any, 
    options?: { sentryLevel?: 'debug' | 'info' | 'warning' | 'error'; includeBreadcrumb?: boolean }
  ): Promise<void> {
    try {
      // Add breadcrumb for event tracking
      if (options?.includeBreadcrumb !== false) {
        SentryLogger.addBreadcrumb(
          `User Event: ${eventName}`,
          'user_analytics',
          payload
        );
      }

      // Send as message for important events
      if (this.isImportantEvent(eventName)) {
        const level = options?.sentryLevel || 'info';
        SentryLogger.captureMessage(
          `Analytics Event: ${eventName}`,
          level,
          {
            event_type: 'analytics',
            event_name: eventName,
            ...payload,
          }
        );
      }
    } catch (error) {
      console.error('Sentry analytics error:', error);
      throw error;
    }
  }

  /**
   * Send event to API endpoint
   */
  private async sendToAPI(payload: APIEventPayload): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Version': payload.context.appVersion || '1.0.0',
          'X-Platform': payload.context.platform || 'mobile',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      // Optionally process response
      const result = await response.json();
      console.log('API analytics response:', result);
      
    } catch (error) {
      console.error('API analytics error:', error);
      
      // Don't throw for API failures in production to avoid blocking user experience
      if (__DEV__) {
        throw error;
      }
    }
  }

  /**
   * Enhanced console logging
   */
  private logToConsole(eventName: string, payload: any, context: UserEventContext): void {
    if (__DEV__) {
      console.group(`📊 Analytics Event: ${eventName}`);
      console.log('📋 Payload:', payload);
      console.log('🔧 Context:', context);
      console.log('⏰ Timestamp:', new Date(context.timestamp!).toISOString());
      console.groupEnd();
    }
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine if an event is important and should be prioritized
   */
  private isImportantEvent(eventName: string): boolean {
    const importantEvents = [
      'app_start',
      'user_login',
      'user_logout',
      'eld_connected',
      'eld_disconnected',
      'error',
      'crash',
      'authentication_failed',
      'bluetooth_error',
      'critical_action',
    ];
    
    return importantEvents.some(important => 
      eventName.toLowerCase().includes(important.toLowerCase())
    );
  }

  /**
   * Convenience methods for common event types
   */

  // Screen tracking
  public async trackScreenView(
    screenName: string,
    additionalParams: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    await this.triggerUserEvent('screen_view', {
      screen_name: screenName,
      ...additionalParams,
    }, {
      ...context,
      screen: screenName,
    });
  }

  // User actions
  public async trackUserAction(
    action: string,
    target?: string,
    additionalParams: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    await this.triggerUserEvent('user_action', {
      action,
      target,
      ...additionalParams,
    }, context);
  }

  // ELD events
  public async trackELDEvent(
    eventType: string,
    data: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    await this.triggerUserEvent(`eld_${eventType.toLowerCase()}`, data, {
      ...context,
      feature: 'eld',
    });
  }

  // Bluetooth events
  public async trackBluetoothEvent(
    eventType: string,
    data: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    await this.triggerUserEvent(`bluetooth_${eventType.toLowerCase()}`, data, {
      ...context,
      feature: 'bluetooth',
    });
  }

  // Error tracking
  public async trackError(
    error: Error | string,
    errorContext: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'object' ? error.stack : undefined;

    await this.triggerUserEvent('error_occurred', {
      error_message: errorMessage,
      error_stack: stackTrace,
      ...errorContext,
    }, context, {
      sentryLevel: 'error',
    });
  }

  // Performance tracking
  public async trackPerformance(
    operation: string,
    duration: number,
    additionalParams: UserEventParams = {},
    context: UserEventContext = {}
  ): Promise<void> {
    await this.triggerUserEvent('performance_metric', {
      operation,
      duration_ms: duration,
      ...additionalParams,
    }, context);
  }

  /**
   * Batch event tracking for multiple events
   */
  public async trackBatch(
    events: Array<{
      eventName: string;
      parameters?: UserEventParams;
      context?: UserEventContext;
    }>
  ): Promise<void> {
    const promises = events.map(event =>
      this.triggerUserEvent(event.eventName, event.parameters, event.context)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Update default context (useful for setting user info, session info, etc.)
   */
  public updateDefaultContext(newContext: Partial<UserEventContext>): void {
    this.defaultContext = {
      ...this.defaultContext,
      ...newContext,
    };
  }

  /**
   * Set API endpoint (useful for different environments)
   */
  public setAPIEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }
}

// Export singleton instance
export const Analytics = AnalyticsUtil.getInstance();

// Export class for testing purposes
export { AnalyticsUtil };
