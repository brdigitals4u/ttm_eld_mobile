import React, { useEffect } from 'react';
import { View, Button, Alert } from 'react-native';
import { Analytics } from '../utils/AnalyticsUtil';
import { useAnalyticsContext } from '../context/analytics-context';

/**
 * Example component showing different ways to use the new unified analytics system
 */
export const AnalyticsUsageExamples: React.FC = () => {
  const analyticsContext = useAnalyticsContext();

  // Example 1: Direct usage of the Analytics singleton
  const handleDirectAnalyticsUsage = async () => {
    try {
      // Basic event tracking
      await Analytics.triggerUserEvent('button_clicked', {
        button_name: 'direct_analytics_button',
        screen: 'examples',
      });

      // Screen view tracking
      await Analytics.trackScreenView('examples_screen', {
        source: 'navigation',
      });

      // User action tracking
      await Analytics.trackUserAction('tap', 'direct_button', {
        interaction_type: 'touch',
      });

      // ELD specific event
      await Analytics.trackELDEvent('connection_attempt', {
        device_id: 'ELD_12345',
        connection_type: 'bluetooth',
      });

      // Error tracking
      await Analytics.trackError(new Error('Example error'), {
        error_source: 'user_interaction',
        component: 'AnalyticsUsageExamples',
      });

      // Performance tracking
      const startTime = Date.now();
      // Simulate some operation...
      await new Promise(resolve => setTimeout(resolve, 100));
      const duration = Date.now() - startTime;
      
      await Analytics.trackPerformance('data_load', duration, {
        operation_type: 'example',
        data_size: '1kb',
      });

      Alert.alert('Success', 'Direct analytics events sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send analytics events');
    }
  };

  // Example 2: Using the context (recommended for React components)
  const handleContextAnalyticsUsage = async () => {
    try {
      // Basic event tracking through context
      await analyticsContext.trackEvent('context_button_clicked', {
        button_name: 'context_analytics_button',
        screen: 'examples',
      });

      // Screen view
      await analyticsContext.trackScreenView('examples_screen', {
        source: 'context',
      });

      // Tab press
      await analyticsContext.trackTabPress('examples_tab', 'home_tab');

      // Page change
      await analyticsContext.trackPageChange('home', 'examples', 'navigation');

      // User action
      await analyticsContext.trackUserAction('tap', 'context_button');

      // ELD event
      await analyticsContext.trackELDEvent('data_received', {
        data_type: 'engine_data',
        size: 256,
      });

      // Bluetooth event
      await analyticsContext.trackBluetoothEvent('device_discovered', {
        device_name: 'ELD Device',
        rssi: -45,
      });

      Alert.alert('Success', 'Context analytics events sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send context analytics events');
    }
  };

  // Example 3: Batch tracking for multiple events
  const handleBatchAnalytics = async () => {
    try {
      await Analytics.trackBatch([
        {
          eventName: 'batch_event_1',
          parameters: { type: 'example', batch_id: '123' },
          context: { feature: 'batch_demo' },
        },
        {
          eventName: 'batch_event_2',
          parameters: { type: 'example', batch_id: '123' },
          context: { feature: 'batch_demo' },
        },
        {
          eventName: 'batch_event_3',
          parameters: { type: 'example', batch_id: '123' },
          context: { feature: 'batch_demo' },
        },
      ]);

      Alert.alert('Success', 'Batch analytics events sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send batch analytics events');
    }
  };

  // Example 4: Advanced usage with custom options
  const handleAdvancedAnalytics = async () => {
    try {
      // Skip Firebase but include Sentry and API
      await Analytics.triggerUserEvent(
        'advanced_event',
        {
          custom_param: 'test_value',
          numeric_param: 42,
          boolean_param: true,
        },
        {
          userId: 'user_123',
          screen: 'examples',
          feature: 'advanced_demo',
        },
        {
          skipFirebase: true,
          skipSentry: false,
          skipAPI: false,
          sentryLevel: 'info',
          includeBreadcrumb: true,
        }
      );

      // High-priority error tracking
      await Analytics.triggerUserEvent(
        'critical_error',
        {
          error_code: 'E001',
          severity: 'high',
        },
        {
          feature: 'critical_system',
        },
        {
          sentryLevel: 'error',
        }
      );

      Alert.alert('Success', 'Advanced analytics events sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send advanced analytics events');
    }
  };

  // Example 5: Update default context dynamically
  const handleUpdateContext = async () => {
    // Update default context that will be applied to all future events
    Analytics.updateDefaultContext({
      userId: 'updated_user_123',
      sessionId: 'new_session_456',
      appVersion: '1.0.1',
    });

    await Analytics.triggerUserEvent('context_updated', {
      action: 'update_default_context',
    });

    Alert.alert('Success', 'Default context updated and event sent!');
  };

  // Example 6: Environment-specific API endpoint
  const handleSetAPIEndpoint = () => {
    // Set different API endpoint based on environment
    const endpoint = __DEV__ 
      ? 'https://dev-api.yourapp.com/analytics'
      : 'https://api.yourapp.com/analytics';
    
    Analytics.setAPIEndpoint(endpoint);
    
    Alert.alert('Success', `API endpoint set to: ${endpoint}`);
  };

  // Track screen view when component mounts
  useEffect(() => {
    analyticsContext.trackScreenView('analytics_examples', {
      component: 'AnalyticsUsageExamples',
      timestamp: Date.now(),
    });
  }, []);

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Button
        title="Direct Analytics Usage"
        onPress={handleDirectAnalyticsUsage}
      />
      
      <Button
        title="Context Analytics Usage"
        onPress={handleContextAnalyticsUsage}
      />
      
      <Button
        title="Batch Analytics"
        onPress={handleBatchAnalytics}
      />
      
      <Button
        title="Advanced Analytics Options"
        onPress={handleAdvancedAnalytics}
      />
      
      <Button
        title="Update Default Context"
        onPress={handleUpdateContext}
      />
      
      <Button
        title="Set API Endpoint"
        onPress={handleSetAPIEndpoint}
      />
    </View>
  );
};

/**
 * Example of using analytics in a custom hook
 */
export const useCustomAnalyticsHook = () => {
  const analytics = useAnalyticsContext();

  const trackCustomUserFlow = async (flowName: string, step: number, data?: any) => {
    await analytics.triggerUserEvent('user_flow_step', {
      flow_name: flowName,
      step_number: step,
      step_data: JSON.stringify(data),
    }, {
      feature: 'user_flows',
    });
  };

  const trackFormInteraction = async (formName: string, fieldName: string, action: 'focus' | 'blur' | 'change' | 'submit') => {
    await analytics.trackUserAction(`form_${action}`, `${formName}_${fieldName}`, {
      form_name: formName,
      field_name: fieldName,
      interaction_type: action,
    });
  };

  const trackELDConnectionFlow = async (step: 'start' | 'scanning' | 'connecting' | 'connected' | 'failed', details?: any) => {
    await analytics.trackELDEvent(`connection_${step}`, {
      connection_step: step,
      ...details,
    });
  };

  return {
    trackCustomUserFlow,
    trackFormInteraction,
    trackELDConnectionFlow,
  };
};

/**
 * Example of analytics middleware for API calls
 */
export const createAnalyticsApiMiddleware = () => {
  return {
    onRequest: async (url: string, options?: any) => {
      const startTime = Date.now();
      
      await Analytics.triggerUserEvent('api_request_start', {
        url,
        method: options?.method || 'GET',
        timestamp: startTime,
      });

      return { startTime };
    },

    onResponse: async (url: string, response: Response, context: { startTime: number }) => {
      const duration = Date.now() - context.startTime;
      
      await Analytics.trackPerformance('api_call', duration, {
        url,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        await Analytics.trackError(`API Error: ${response.status}`, {
          url,
          status: response.status,
          statusText: response.statusText,
        });
      }
    },

    onError: async (url: string, error: Error, context: { startTime: number }) => {
      const duration = Date.now() - context.startTime;
      
      await Analytics.trackError(error, {
        url,
        duration_before_error: duration,
        error_type: 'network_error',
      });
    },
  };
};

export default AnalyticsUsageExamples;
