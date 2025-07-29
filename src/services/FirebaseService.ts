import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

// Initialize Firebase services
export const initFirebase = async () => {
  try {
    // Enable crashlytics collection
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Enable analytics collection - CRITICAL for release builds
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Set user properties for better tracking
    await analytics().setUserProperty('app_type', 'TTMKonnect');
    await analytics().setUserProperty('platform', 'android');
    
    // Log app open event immediately
    await analytics().logEvent('app_open', {
      timestamp: Date.now(),
      build_type: __DEV__ ? 'debug' : 'release',
      app_version: '1.0.0'
    });
    
    console.log('🔥 Firebase initialized successfully');
    console.log('📊 Analytics collection enabled:', await analytics().isAnalyticsCollectionEnabled());
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

export const FirebaseLogger = {
  // Crashlytics methods
  recordError: (error: Error, customAttributes?: { [key: string]: any }) => {
    if (customAttributes) {
      crashlytics().setAttributes(customAttributes);
    }
    crashlytics().recordError(error);
  },

  log: (message: string) => {
    crashlytics().log(message);
  },

  setUserId: (userId: string) => {
    crashlytics().setUserId(userId);
  },

  setAttributes: (attributes: { [key: string]: any }) => {
    crashlytics().setAttributes(attributes);
  },

  // Analytics methods
  logEvent: async (eventName: string, parameters?: { [key: string]: any }) => {
    try {
      await analytics().logEvent(eventName, parameters);
    } catch (error) {
      console.error('Analytics log event error:', error);
    }
  },

  setUserProperty: async (name: string, value: string) => {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      console.error('Analytics set user property error:', error);
    }
  },

  setCurrentScreen: async (screenName: string, screenClassOverride?: string) => {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClassOverride || screenName,
      });
    } catch (error) {
      console.error('Analytics set current screen error:', error);
    }
  },

  // ELD specific logging
  logELDEvent: async (eventType: string, data?: any) => {
    const eventName = `eld_${eventType.toLowerCase()}`;
    await FirebaseLogger.logEvent(eventName, {
      ...data,
      timestamp: Date.now(),
    });
    
    // Also log to crashlytics
    FirebaseLogger.log(`ELD Event: ${eventType} - ${JSON.stringify(data)}`);
  },

  logBluetoothEvent: async (eventType: string, data?: any) => {
    const eventName = `bluetooth_${eventType.toLowerCase()}`;
    await FirebaseLogger.logEvent(eventName, {
      ...data,
      timestamp: Date.now(),
    });
    
    // Also log to crashlytics
    FirebaseLogger.log(`Bluetooth Event: ${eventType} - ${JSON.stringify(data)}`);
  },

  logAppEvent: async (eventType: string, data?: any) => {
    const eventName = `app_${eventType.toLowerCase()}`;
    await FirebaseLogger.logEvent(eventName, {
      ...data,
      timestamp: Date.now(),
    });
    
    // Also log to crashlytics
    FirebaseLogger.log(`App Event: ${eventType} - ${JSON.stringify(data)}`);
  },
};
