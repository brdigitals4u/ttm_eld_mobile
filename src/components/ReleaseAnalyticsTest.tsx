import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import { useAnalytics } from '@/src/hooks/useAnalytics';

interface ReleaseAnalyticsTestProps {
  visible?: boolean;
}

export const ReleaseAnalyticsTest: React.FC<ReleaseAnalyticsTestProps> = ({ 
  visible = true 
}) => {
  const [eventCount, setEventCount] = useState(0);
  const { trackEvent } = useAnalytics();

  // Auto-trigger events every 30 seconds in release builds
  useEffect(() => {
    if (!__DEV__ && visible) {
      const interval = setInterval(async () => {
        await sendHeartbeatEvent();
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [visible]);

  const sendHeartbeatEvent = async () => {
    try {
      await analytics().logEvent('app_heartbeat', {
        timestamp: Date.now(),
        build_type: 'release',
        heartbeat_count: eventCount + 1,
      });
      setEventCount(prev => prev + 1);
      console.log('💓 Heartbeat event sent:', eventCount + 1);
    } catch (error) {
      console.error('Heartbeat event failed:', error);
    }
  };

  const sendReleaseTestEvent = async () => {
    try {
      const eventName = 'release_test_event';
      const params = {
        test_id: Date.now(),
        build_type: 'release',
        manual_trigger: true,
        device_time: new Date().toISOString(),
      };

      // Send via direct analytics
      await analytics().logEvent(eventName, params);
      
      // Send via hook
      await trackEvent('release_hook_test', params);

      setEventCount(prev => prev + 1);
      console.log('🚀 Release test events sent successfully');
      
    } catch (error) {
      console.error('Release test event failed:', error);
    }
  };

  const forceUploadEvents = async () => {
    try {
      // Force upload by sending a special event
      await analytics().logEvent('force_upload_now', {
        timestamp: Date.now(),
        total_events_sent: eventCount,
      });
      console.log('⬆️ Force upload triggered');
    } catch (error) {
      console.error('Force upload failed:', error);
    }
  };

  // Only show in release builds or if explicitly visible
  if (__DEV__ && !visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {__DEV__ ? '🔧 DEBUG MODE' : '🚀 RELEASE MODE'}
      </Text>
      <Text style={styles.subtitle}>
        Events sent: {eventCount}
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={sendReleaseTestEvent}>
        <Text style={styles.buttonText}>Send Test Event</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.uploadButton} onPress={forceUploadEvents}>
        <Text style={styles.buttonText}>Force Upload</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        {__DEV__ 
          ? 'Debug: Events sent immediately'
          : 'Release: Events batched & uploaded'
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
    minWidth: 200,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    color: '#CCC',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  uploadButton: {
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
  info: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
});
