import * as Sentry from "@sentry/react-native";
import { Platform } from 'react-native';

// Initialize Sentry
export const initSentry = () => {
  Sentry.init({
    dsn: "https://616ff4c8669ea6c8ddc6cdde2d4befcf@o4509752270258176.ingest.us.sentry.io/4509752271110144",
    // Adds more context data to events (IP address, cookies, user, etc.)
    sendDefaultPii: true,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    // Performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Release info
    release: '1.0.0',
    environment: __DEV__ ? 'development' : 'production',
    // Initial scope
    initialScope: {
      tags: {
        platform: Platform.OS,
        version: Platform.Version.toString(),
      },
    },
    // Before send hook to filter sensitive data
    beforeSend: (event) => {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }
      
      // Add custom context
      event.contexts = {
        ...event.contexts,
        app: {
          name: 'TTMKonnect',
          version: '1.0.0',
        },
      };
      
      return event;
    },
  });
};

// Helper functions for logging
export const SentryLogger = {
  captureException: (error: any, context?: any) => {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additionalInfo', context);
      }
      Sentry.captureException(error);
    });
  },

  captureMessage: (message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info', context?: any) => {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additionalInfo', context);
      }
      Sentry.captureMessage(message, level);
    });
  },

  addBreadcrumb: (message: string, category: string, data?: any) => {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  },

  setUser: (user: { id: string; email?: string; username?: string }) => {
    Sentry.setUser(user);
  },

  clearUser: () => {
    Sentry.setUser(null);
  },

  setTag: (key: string, value: string) => {
    Sentry.setTag(key, value);
  },

  setContext: (key: string, context: any) => {
    Sentry.setContext(key, context);
  },

  // ELD-specific logging methods
  logELDEvent: (event: string, data?: any) => {
    SentryLogger.addBreadcrumb(`ELD Event: ${event}`, 'eld', data);
    
    // Also capture as message for important ELD events
    if (['connected', 'disconnected', 'error', 'authentication_failed'].includes(event.toLowerCase())) {
      SentryLogger.captureMessage(`ELD ${event}`, event.toLowerCase().includes('error') ? 'error' : 'info', {
        event_type: 'eld',
        event_name: event,
        ...data
      });
    }
  },

  logBluetoothEvent: (event: string, data?: any) => {
    SentryLogger.addBreadcrumb(`Bluetooth: ${event}`, 'bluetooth', data);
  },

  logAndroidEvent: (event: string, data?: any) => {
    SentryLogger.addBreadcrumb(`Android: ${event}`, 'android', data);
  },
};
