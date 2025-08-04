// src/utils/SentryLogger.ts
export class SentryLogger {
  static logELDEvent(eventName: string, parameters?: Record<string, any>) {
    try {
      // Sentry logging
      console.log(`📊 Sentry ELD Event: ${eventName}`, parameters);
      
      // In a real implementation, you would use Sentry
      // import * as Sentry from '@sentry/react-native';
      // Sentry.addBreadcrumb({
      //   category: 'eld',
      //   message: eventName,
      //   data: parameters,
      // });
      
    } catch (error) {
      console.error('SentryLogger error:', error);
    }
  }
  
  static logBluetoothEvent(eventName: string, parameters?: Record<string, any>) {
    try {
      console.log(`📊 Sentry Bluetooth Event: ${eventName}`, parameters);
      
      // In a real implementation, you would use Sentry
      // import * as Sentry from '@sentry/react-native';
      // Sentry.addBreadcrumb({
      //   category: 'bluetooth',
      //   message: eventName,
      //   data: parameters,
      // });
      
    } catch (error) {
      console.error('SentryLogger Bluetooth error:', error);
    }
  }
} 