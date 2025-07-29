import React, { createContext, useContext, useEffect } from 'react';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useAuth } from '@/context/auth-context';

interface AnalyticsContextType {
  trackEvent: (eventName: string, parameters?: Record<string, any>) => Promise<void>;
  trackScreenView: (screenName: string, screenClass?: string, additionalParams?: Record<string, any>) => Promise<void>;
  trackTabPress: (tabName: string, fromTab?: string, additionalParams?: Record<string, any>) => Promise<void>;
  trackPageChange: (
    fromPage: string,
    toPage: string,
    navigationMethod?: 'tab' | 'navigation' | 'back' | 'deep_link',
    additionalParams?: Record<string, any>
  ) => Promise<void>;
  trackUserAction: (action: string, target?: string, additionalParams?: Record<string, any>) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const analytics = useAnalytics();
  const { user } = useAuth() as any;

  // Track app start and user session
  useEffect(() => {
    analytics.trackEvent('app_start', {
      app_version: '1.0.0', // You can get this from app config
      platform: 'mobile',
    });

    if (user) {
      analytics.trackEvent('user_session_start', {
        user_type: user?.role || 'unknown',
        carrier_id: user?.carrierId || 'unknown',
      });
    }

    return () => {
      // Track session end on cleanup
      analytics.trackEvent('user_session_end');
    };
  }, [user, analytics]);

  const contextValue: AnalyticsContextType = {
    trackEvent: analytics.trackEvent,
    trackScreenView: analytics.trackScreenView,
    trackTabPress: analytics.trackTabPress,
    trackPageChange: analytics.trackPageChange,
    trackUserAction: analytics.trackUserAction,
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
