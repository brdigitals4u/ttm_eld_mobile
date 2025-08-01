import { Analytics } from './AnalyticsUtil';

/**
 * Test suite for verifying that analytics events are always sent to Firebase and Sentry
 * This file can be used for debugging and testing the guaranteed dual logging functionality
 */

export class AnalyticsTest {
  /**
   * Test the guaranteed dual logging functionality
   */
  static async testGuaranteedDualLogging(): Promise<void> {
    console.log('🧪 Testing guaranteed dual logging...');
    
    try {
      // Test 1: Basic event
      await Analytics.guaranteedDualLog('test_basic_event', {
        test_param: 'basic_value',
        timestamp: Date.now(),
      });
      
      // Test 2: Important event (should trigger additional Sentry logging)
      await Analytics.guaranteedDualLog('eld_connected', {
        device_id: 'test_device_123',
        connection_time: Date.now(),
      });
      
      // Test 3: Error event
      await Analytics.guaranteedDualLog('error_occurred', {
        error_message: 'Test error for analytics verification',
        error_type: 'test_error',
      });
      
      // Test 4: User action event
      await Analytics.guaranteedDualLog('user_action', {
        action: 'button_click',
        target: 'test_button',
        screen: 'test_screen',
      });
      
      console.log('✅ All guaranteed dual logging tests completed');
      
    } catch (error) {
      console.error('❌ Guaranteed dual logging test failed:', error);
    }
  }
  
  /**
   * Test the triggerUserEvent method with skip options to ensure they don't affect guaranteed logging
   */
  static async testSkipOptionsHandling(): Promise<void> {
    console.log('🧪 Testing skip options handling...');
    
    try {
      // Test normal triggerUserEvent with skip options
      await Analytics.triggerUserEvent('test_skip_firebase', {
        test: 'skip_firebase'
      }, {}, {
        skipFirebase: true, // This should skip Firebase
        skipSentry: false,
      });
      
      await Analytics.triggerUserEvent('test_skip_sentry', {
        test: 'skip_sentry'
      }, {}, {
        skipFirebase: false,
        skipSentry: true, // This should skip Sentry
      });
      
      await Analytics.triggerUserEvent('test_skip_both', {
        test: 'skip_both'
      }, {}, {
        skipFirebase: true,
        skipSentry: true, // This should skip both
      });
      
      console.log('✅ Skip options handling tests completed');
      
    } catch (error) {
      console.error('❌ Skip options handling test failed:', error);
    }
  }
  
  /**
   * Compare regular triggerUserEvent vs guaranteedDualLog
   */
  static async testComparison(): Promise<void> {
    console.log('🧪 Testing comparison between methods...');
    
    try {
      console.log('📊 Testing regular triggerUserEvent (can be skipped):');
      await Analytics.triggerUserEvent('test_regular_event', {
        method: 'regular',
        can_be_skipped: true,
      }, {}, {
        skipFirebase: true,
        skipSentry: true,
      });
      
      console.log('🔒 Testing guaranteedDualLog (cannot be skipped):');
      await Analytics.guaranteedDualLog('test_guaranteed_event', {
        method: 'guaranteed',
        cannot_be_skipped: true,
      });
      
      console.log('✅ Comparison tests completed');
      
    } catch (error) {
      console.error('❌ Comparison test failed:', error);
    }
  }
  
  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Analytics Testing Suite...');
    console.log('=====================================');
    
    await this.testGuaranteedDualLogging();
    console.log('-------------------------------------');
    
    await this.testSkipOptionsHandling();
    console.log('-------------------------------------');
    
    await this.testComparison();
    console.log('-------------------------------------');
    
    console.log('🎉 Analytics Testing Suite Completed!');
    console.log('=====================================');
  }
  
  /**
   * Simulate trackEvent usage from useAnalytics hook
   */
  static async testTrackEventUsage(): Promise<void> {
    console.log('🧪 Testing trackEvent usage simulation...');
    
    try {
      // Simulate how trackEvent would be called from components
      const mockTrackEvent = async (eventName: string, parameters?: any) => {
        // This mirrors the implementation in analytics-context.tsx
        await Analytics.guaranteedDualLog(eventName, parameters);
      };
      
      // Test various trackEvent calls
      await mockTrackEvent('button_clicked', {
        button_name: 'submit_form',
        screen: 'registration',
      });
      
      await mockTrackEvent('screen_viewed', {
        screen_name: 'dashboard',
        user_type: 'driver',
      });
      
      await mockTrackEvent('eld_event', {
        event_type: 'data_received',
        data_size: 1024,
      });
      
      console.log('✅ trackEvent usage simulation completed');
      
    } catch (error) {
      console.error('❌ trackEvent usage simulation failed:', error);
    }
  }
}

// Export a simple function to run tests from console or component
export const runAnalyticsTests = () => {
  AnalyticsTest.runAllTests();
};

export const testTrackEventOnly = () => {
  AnalyticsTest.testTrackEventUsage();
};
