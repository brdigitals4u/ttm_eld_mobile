// Firebase is disabled due to native module issues
const FIREBASE_ENABLED = false;

// Mock Firebase functions when disabled
const createMockFirebase = () => ({
  getApp: () => ({ name: '[DEFAULT]' }),
  getAnalytics: () => ({
    setAnalyticsCollectionEnabled: async () => {},
    isAnalyticsCollectionEnabled: async () => false,
  }),
  getCrashlytics: () => ({
    setCrashlyticsCollectionEnabled: async () => {},
    recordError: () => {},
    log: () => {},
    setUserId: () => {},
    setAttributes: () => {},
  }),
  logEvent: async () => {},
  setUserProperty: async () => {},
  setAnalyticsCollectionEnabled: async () => {},
  isAnalyticsCollectionEnabled: async () => false,
});

// Import Firebase only if enabled
let firebase: any;
if (FIREBASE_ENABLED) {
  try {
    firebase = {
      getApp: require('@react-native-firebase/app').getApp,
      getAnalytics: require('@react-native-firebase/analytics').getAnalytics,
      getCrashlytics: require('@react-native-firebase/crashlytics').getCrashlytics,
      logEvent: require('@react-native-firebase/analytics').logEvent,
      setUserProperty: require('@react-native-firebase/analytics').setUserProperty,
      setAnalyticsCollectionEnabled: require('@react-native-firebase/analytics').setAnalyticsCollectionEnabled,
      isAnalyticsCollectionEnabled: require('@react-native-firebase/analytics').isAnalyticsCollectionEnabled,
    };
  } catch (error) {
    console.log('Firebase modules not available, using mock');
    firebase = createMockFirebase();
  }
} else {
  firebase = createMockFirebase();
}

// Initialize Firebase services
export const initFirebase = async () => {
  if (!FIREBASE_ENABLED) {
    console.log('🔥 Firebase initialization skipped (disabled)');
    return;
  }

  try {
    const app = firebase.getApp();
    const analytics = firebase.getAnalytics(app);
    const crashlytics = firebase.getCrashlytics(app);
    
    // Enable crashlytics collection
    await crashlytics.setCrashlyticsCollectionEnabled(true);
    
    // Enable analytics collection - CRITICAL for release builds
    await firebase.setAnalyticsCollectionEnabled(analytics, true);
    
    // Set user properties for better tracking
    await firebase.setUserProperty(analytics, 'app_type', 'TTMKonnect');
    await firebase.setUserProperty(analytics, 'platform', 'android');
    
    // Log app open event immediately
    await firebase.logEvent(analytics, 'app_open', {
      timestamp: Date.now(),
      build_type: __DEV__ ? 'debug' : 'release',
      app_version: '1.0.0'
    });
    
    console.log('🔥 Firebase initialized successfully');
    console.log('📊 Analytics collection enabled:', await firebase.isAnalyticsCollectionEnabled(analytics));
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

export const FirebaseLogger = {
  // Crashlytics methods
  recordError: (error: Error, customAttributes?: { [key: string]: any }) => {
    try {
      const crashlytics = firebase.getCrashlytics();
      if (customAttributes) {
        crashlytics.setAttributes(customAttributes);
      }
      crashlytics.recordError(error);
    } catch (err) {
      console.log('Firebase recordError (disabled):', error.message);
    }
  },

  log: (message: string) => {
    try {
      const crashlytics = firebase.getCrashlytics();
      crashlytics.log(message);
    } catch (err) {
      console.log('Firebase log (disabled):', message);
    }
  },

  setUserId: (userId: string) => {
    try {
      const crashlytics = firebase.getCrashlytics();
      crashlytics.setUserId(userId);
    } catch (err) {
      console.log('Firebase setUserId (disabled):', userId);
    }
  },

  setAttributes: (attributes: { [key: string]: any }) => {
    try {
      const crashlytics = firebase.getCrashlytics();
      crashlytics.setAttributes(attributes);
    } catch (err) {
      console.log('Firebase setAttributes (disabled):', attributes);
    }
  },

  // Analytics methods
  logEvent: async (eventName: string, parameters?: { [key: string]: any }) => {
    try {
      const analytics = firebase.getAnalytics();
      await firebase.logEvent(analytics, eventName, parameters);
    } catch (error) {
      console.log('Firebase logEvent (disabled):', eventName, parameters);
    }
  },

  setUserProperty: async (name: string, value: string) => {
    try {
      const analytics = firebase.getAnalytics();
      await firebase.setUserProperty(analytics, name, value);
    } catch (error) {
      console.log('Firebase setUserProperty (disabled):', name, value);
    }
  },

  setCurrentScreen: async (screenName: string, screenClassOverride?: string) => {
    try {
      const analytics = firebase.getAnalytics();
      await firebase.logEvent(analytics, 'screen_view', {
        screen_name: screenName,
        screen_class: screenClassOverride || screenName,
      });
    } catch (error) {
      console.log('Firebase setCurrentScreen (disabled):', screenName);
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
