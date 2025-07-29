import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { FirebaseLogger } from '@/src/services/FirebaseService';

interface FirebaseAnalyticsDebugProps {
  visible?: boolean;
}

export const FirebaseAnalyticsDebug: React.FC<FirebaseAnalyticsDebugProps> = ({ 
  visible = true 
}) => {
  const [eventsSent, setEventsSent] = useState<string[]>([]);
  const { trackEvent, trackScreenView, trackUserAction } = useAnalytics();

  if (!visible || !__DEV__) {
    return null;
  }

  const addEventToLog = (eventName: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventsSent(prev => [`${timestamp}: ${eventName}`, ...prev.slice(0, 9)]);
  };

  const sendTestEvent = async (eventName: string, params: any = {}) => {
    try {
      await analytics().logEvent(eventName, {
        ...params,
        test_mode: true,
        timestamp: Date.now(),
      });
      addEventToLog(`${eventName} - SUCCESS`);
      console.log(`📊 Firebase Analytics Event Sent: ${eventName}`, params);
    } catch (error) {
      addEventToLog(`${eventName} - ERROR`);
      console.error(`Firebase Analytics Error:`, error);
    }
  };

  const testEvents = [
    {
      name: 'Test Basic Event',
      action: () => sendTestEvent('test_basic_event', { 
        source: 'debug_panel',
        device_type: 'mobile'
      })
    },
    {
      name: 'Test Screen View',
      action: async () => {
        try {
          await analytics().logScreenView({
            screen_name: 'debug_screen',
            screen_class: 'DebugScreen'
          });
          addEventToLog('screen_view - SUCCESS');
        } catch (error) {
          addEventToLog('screen_view - ERROR');
          console.error('Screen view error:', error);
        }
      }
    },
    {
      name: 'Test Select Content',
      action: () => sendTestEvent('select_content', {
        content_type: 'debug_test',
        item_id: 'test_item_123'
      })
    },
    {
      name: 'Test Custom Event',
      action: () => sendTestEvent('debug_custom_event', {
        custom_parameter: 'test_value',
        user_action: 'debug_button_press',
        platform: 'android'
      })
    },
    {
      name: 'Test Using Hook',
      action: async () => {
        try {
          await trackEvent('hook_test_event', {
            source: 'debug_hook',
            test_parameter: 'hook_value'
          });
          addEventToLog('hook_test_event - SUCCESS');
        } catch (error) {
          addEventToLog('hook_test_event - ERROR');
        }
      }
    },
    {
      name: 'Test App Start',
      action: () => sendTestEvent('app_start', {
        app_version: '1.0.0',
        platform: 'android',
        debug_mode: true
      })
    },
    {
      name: 'Test Button Click',
      action: () => sendTestEvent('button_click', {
        button_name: 'debug_test_button',
        screen: 'debug_panel'
      })
    },
    {
      name: 'Test Firebase Service',
      action: async () => {
        try {
          await FirebaseLogger.logEvent('service_test_event', {
            source: 'firebase_service',
            test_mode: true
          });
          addEventToLog('service_test_event - SUCCESS');
        } catch (error) {
          addEventToLog('service_test_event - ERROR');
        }
      }
    }
  ];

  const clearLog = () => {
    setEventsSent([]);
  };

  const sendBulkEvents = async () => {
    for (let i = 0; i < 5; i++) {
      await sendTestEvent(`bulk_test_event_${i}`, {
        bulk_index: i,
        batch_id: Date.now()
      });
      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Firebase Analytics Debug</Text>
      <Text style={styles.subtitle}>Tap buttons to send test events</Text>
      
      <ScrollView style={styles.buttonsContainer} showsVerticalScrollIndicator={false}>
        {testEvents.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testButton}
            onPress={test.action}
          >
            <Text style={styles.buttonText}>{test.name}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.bulkButton} onPress={sendBulkEvents}>
          <Text style={styles.buttonText}>Send 5 Bulk Events</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.logContainer}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Recent Events:</Text>
          <TouchableOpacity onPress={clearLog} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logScroll} showsVerticalScrollIndicator={false}>
          {eventsSent.length === 0 ? (
            <Text style={styles.noEventsText}>No events sent yet</Text>
          ) : (
            eventsSent.map((event, index) => (
              <Text key={index} style={styles.logText}>{event}</Text>
            ))
          )}
        </ScrollView>
      </View>

      <Text style={styles.instructions}>
        📱 Check Firebase Console → Analytics → Events
        {'\n'}Events may take 1-2 minutes to appear
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1000,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    color: '#CCC',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 15,
  },
  buttonsContainer: {
    maxHeight: 200,
    marginBottom: 15,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  bulkButton: {
    backgroundColor: '#FF6B35',
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  logContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  logTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 10,
  },
  logScroll: {
    maxHeight: 80,
  },
  logText: {
    color: '#CCC',
    fontSize: 10,
    marginBottom: 2,
  },
  noEventsText: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  instructions: {
    color: '#FFF',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
