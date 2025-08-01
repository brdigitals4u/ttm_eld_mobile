import React, { createContext, useContext, useEffect } from 'react';
import { Analytics } from '../utils/AnalyticsUtil';
import { useAuth } from '@/context/auth-context';
import type { UserEventParams, UserEventContext } from '../utils/AnalyticsUtil';

interface AnalyticsContextType {
  // Main method for triggering user events
  triggerUserEvent: (eventName: string, parameters?: UserEventParams, context?: UserEventContext) => Promise<void>;
  
  // Convenience methods
  trackEvent: (eventName: string, parameters?: UserEventParams) => Promise<void>;
  trackScreenView: (screenName: string, additionalParams?: UserEventParams, context?: UserEventContext) => Promise<void>;
  trackTabPress: (tabName: string, fromTab?: string, additionalParams?: UserEventParams) => Promise<void>;
  trackPageChange: (
    fromPage: string,
    toPage: string,
    navigationMethod?: 'tab' | 'navigation' | 'back' | 'deep_link',
    additionalParams?: UserEventParams
  ) => Promise<void>;
  trackUserAction: (action: string, target?: string, additionalParams?: UserEventParams) => Promise<void>;
  trackELDEvent: (eventType: string, data?: UserEventParams) => Promise<void>;
  trackBluetoothEvent: (eventType: string, data?: UserEventParams) => Promise<void>;
  trackError: (error: Error | string, errorContext?: UserEventParams) => Promise<void>;
  trackPerformance: (operation: string, duration: number, additionalParams?: UserEventParams) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const { user } = useAuth() as any;

  // Initialize analytics with user context when user changes
  useEffect(() => {
    if (user) {
      // Update default context with user information
      Analytics.updateDefaultContext({
        userId: user.id,
        platform: 'mobile',
        appVersion: '1.0.0', // You can get this from app config
      });

      // Track user session start
      Analytics.triggerUserEvent('user_session_start', {
        user_type: user?.role || 'unknown',
        carrier_id: user?.carrierId || 'unknown',
      });
    }
  }, [user]);

  // Track app start on mount
  useEffect(() => {
    Analytics.triggerUserEvent('app_start', {
      app_version: '1.0.0',
      platform: 'mobile',
    });

    return () => {
      // Track session end on cleanup
      Analytics.triggerUserEvent('user_session_end');
    };
  }, []);

  const contextValue: AnalyticsContextType = {
    // Main method
    triggerUserEvent: Analytics.triggerUserEvent.bind(Analytics),
    
    // Convenience methods - GUARANTEED dual logging to Firebase and Sentry
    trackEvent: async (eventName: string, parameters?: UserEventParams) => {
      // Use the guaranteed dual logging method that bypasses all options
      // and ensures events ALWAYS reach both Firebase and Sentry
      await Analytics.guaranteedDualLog(eventName, parameters);
    },
    
    trackScreenView: (screenName: string, additionalParams?: UserEventParams, context?: UserEventContext) => 
      Analytics.trackScreenView(screenName, additionalParams, context),
    
    trackTabPress: (tabName: string, fromTab?: string, additionalParams?: UserEventParams) => 
      Analytics.triggerUserEvent('tab_press', {
        tab_name: tabName,
        from_tab: fromTab,
        ...additionalParams,
      }),
    
    trackPageChange: (
      fromPage: string,
      toPage: string,
      navigationMethod: 'tab' | 'navigation' | 'back' | 'deep_link' = 'navigation',
      additionalParams?: UserEventParams
    ) => 
      Analytics.triggerUserEvent('page_change', {
        from_page: fromPage,
        to_page: toPage,
        navigation_method: navigationMethod,
        ...additionalParams,
      }),
    
    trackUserAction: (action: string, target?: string, additionalParams?: UserEventParams) => 
      Analytics.trackUserAction(action, target, additionalParams),
    
    trackELDEvent: (eventType: string, data?: UserEventParams) => 
      Analytics.trackELDEvent(eventType, data),
    
    trackBluetoothEvent: (eventType: string, data?: UserEventParams) => 
      Analytics.trackBluetoothEvent(eventType, data),
    
    trackError: (error: Error | string, errorContext?: UserEventParams) => 
      Analytics.trackError(error, errorContext),
    
    trackPerformance: (operation: string, duration: number, additionalParams?: UserEventParams) => 
      Analytics.trackPerformance(operation, duration, additionalParams),
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalyticsContext = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};
