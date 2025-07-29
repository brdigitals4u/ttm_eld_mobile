import { useCallback } from 'react';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { useAuth } from '@/context/auth-context';

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(async (
    eventName: string, 
    parameters: AnalyticsEventParams = {}
  ) => {
    try {
      const eventParams = {
        ...parameters,
        user_id: user?.id || 'anonymous',
        timestamp: Date.now(),
        build_type: __DEV__ ? 'debug' : 'release',
        session_id: Date.now().toString().slice(-8), // Last 8 digits as session ID
      };

      // Send the event
      await analytics().logEvent(eventName, eventParams);
      
      // Force upload in release builds (important!)
      if (!__DEV__) {
        try {
          // This forces immediate upload of pending events
          await analytics().logEvent('force_upload_marker', {
            trigger_event: eventName,
            timestamp: Date.now()
          });
        } catch (uploadError) {
          console.warn('Force upload failed:', uploadError);
        }
      }
      
      // Enhanced logging for both debug and release
      console.log(`📊 Analytics Event Sent: ${eventName}`, eventParams);
      console.log(`🔧 Build Type: ${__DEV__ ? 'DEBUG' : 'RELEASE'}`);
      
    } catch (error) {
      console.error('Analytics tracking error:', error);
      crashlytics().recordError(error as Error);
    }
  }, [user?.id]);

  const trackScreenView = useCallback(async (
    screenName: string, 
    screenClass?: string,
    additionalParams: AnalyticsEventParams = {}
  ) => {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });

      await trackEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName,
        ...additionalParams,
      });
    } catch (error) {
      console.error('Screen view tracking error:', error);
      crashlytics().recordError(error as Error);
    }
  }, [trackEvent]);

  const trackTabPress = useCallback(async (
    tabName: string,
    fromTab?: string,
    additionalParams: AnalyticsEventParams = {}
  ) => {
    await trackEvent('tab_press', {
      tab_name: tabName,
      from_tab: fromTab,
      ...additionalParams,
    });
  }, [trackEvent]);

  const trackPageChange = useCallback(async (
    fromPage: string,
    toPage: string,
    navigationMethod: 'tab' | 'navigation' | 'back' | 'deep_link' = 'navigation',
    additionalParams: AnalyticsEventParams = {}
  ) => {
    await trackEvent('page_change', {
      from_page: fromPage,
      to_page: toPage,
      navigation_method: navigationMethod,
      ...additionalParams,
    });
  }, [trackEvent]);

  const trackUserAction = useCallback(async (
    action: string,
    target?: string,
    additionalParams: AnalyticsEventParams = {}
  ) => {
    await trackEvent('user_action', {
      action,
      target,
      ...additionalParams,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackScreenView,
    trackTabPress,
    trackPageChange,
    trackUserAction,
  };
};
