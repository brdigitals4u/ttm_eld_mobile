import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

// Initialize Firebase services
export const initFirebase = async () => {
  try {
    // TODO: Firebase is disabled temporarily due to native module issues
    console.log('🔥 Firebase initialization skipped (native module not available)');
    return;
    
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
    try {
      if (customAttributes) {
        crashlytics().setAttributes(customAttributes);
      }
      crashlytics().recordError(error);
    } catch (err) {
      console.log('Firebase recordError (native module unavailable):', error.message);
    }
  },

  log: (message: string) => {
    try {
      crashlytics().log(message);
    } catch (err) {
      console.log('Firebase log:', message);
    }
  },

  setUserId: (userId: string) => {
    try {
      crashlytics().setUserId(userId);
    } catch (err) {
      console.log('Firebase setUserId (native module unavailable):', userId);
    }
  },

  setAttributes: (attributes: { [key: string]: any }) => {
    try {
      crashlytics().setAttributes(attributes);
    } catch (err) {
      console.log('Firebase setAttributes (native module unavailable):', attributes);
    }
  },

  // Analytics methods
  logEvent: async (eventName: string, parameters?: { [key: string]: any }) => {
    try {
      await analytics().logEvent(eventName, parameters);
    } catch (error) {
      console.log('Firebase logEvent (native module unavailable):', eventName, parameters);
    }
  },

  setUserProperty: async (name: string, value: string) => {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      console.log('Firebase setUserProperty (native module unavailable):', name, value);
    }
  },

  setCurrentScreen: async (screenName: string, screenClassOverride?: string) => {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClassOverride || screenName,
      });
    } catch (error) {
      console.log('Firebase setCurrentScreen (native module unavailable):', screenName);
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
