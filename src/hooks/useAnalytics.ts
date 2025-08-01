import { useAnalyticsContext } from '@/src/context/analytics-context';

/**
 * useAnalytics Hook
 * 
 * A convenient hook that provides access to all analytics functions.
 * This hook wraps the AnalyticsContext and provides a clean API for components.
 * 
 * Usage:
 * ```tsx
 * const { trackEvent, trackScreenView, trackUserAction } = useAnalytics();
 * 
 * // Track a simple event
 * trackEvent('button_clicked', { button_name: 'submit' });
 * 
 * // Track screen view
 * trackScreenView('home_screen', { user_type: 'driver' });
 * 
 * // Track user action
 * trackUserAction('form_submit', 'registration_form');
 * ```
 */
export const useAnalytics = () => {
  const context = useAnalyticsContext();
  
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  
  return context;
};

// Export the context hook as well for direct access if needed
export { useAnalyticsContext } from '@/src/context/analytics-context';
