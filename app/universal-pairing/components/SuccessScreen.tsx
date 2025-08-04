import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  ZoomIn,
  BounceIn,
  SlideInUp
} from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';
import { UniversalDevice } from '../types';
import { SupabaseLogger } from '../../../src/services/ELDDeviceService';

interface SuccessScreenProps {
  device: UniversalDevice | null;
  onContinue: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ device, onContinue }) => {
  const { colors } = useTheme();
  const successScale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const fadeAnimation = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  useEffect(() => {
    if (device) {
      // Log when user reaches success screen
      SupabaseLogger.logEvent('success_screen_reached', {
        deviceId: device.id,
        deviceName: device.name,
        deviceAddress: device.address,
        status: 'connected',
        eventData: {
          protocol: device.protocol,
          deviceType: device.deviceType,
          deviceCategory: device.deviceCategory,
          timestamp: new Date().toISOString()
        }
      });

      // Success animation sequence when device is connected
      successScale.value = withSpring(1, {
        damping: 10,
        stiffness: 100,
      });
      
      checkmarkScale.value = withDelay(
        300,
        withSpring(1, {
          damping: 8,
          stiffness: 150,
        })
      );
      
      fadeAnimation.value = withDelay(
        600,
        withTiming(1, { duration: 800 })
      );

      pulseAnimation.value = withDelay(
        800,
        withRepeat(
          withTiming(1.05, { 
            duration: 1500, 
            easing: Easing.inOut(Easing.ease) 
          }),
          -1,
          true
        )
      );
    } else {
      // Loading animation when no device
      loadingRotation.value = withRepeat(
        withTiming(360, { 
          duration: 1500, 
          easing: Easing.linear 
        }),
        -1,
        false
      );
      
      pulseAnimation.value = withRepeat(
        withTiming(1.1, { 
          duration: 1000, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1,
        true
      );
    }
  }, [device]);

  const animatedSuccessStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
    };
  });

  const animatedCheckmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkmarkScale.value }],
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });

  const animatedFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnimation.value,
    };
  });

  const animatedLoadingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${loadingRotation.value}deg` }],
    };
  });

  const renderIcon = () => {
    if (device) {
      // Success checkmark
      return (
        <Animated.View style={[styles.successContainer, animatedSuccessStyle]}>
          <View style={styles.successBackground}>
            <Animated.View style={[styles.checkmarkContainer, animatedCheckmarkStyle]}>
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          </View>
        </Animated.View>
      );
    } else {
      // Loading spinner
      return (
        <Animated.View style={[styles.loadingContainer, animatedPulseStyle]}>
          <View style={styles.loadingBackground}>
            <Animated.View style={[styles.spinner, animatedLoadingStyle]}>
              <Text style={styles.spinnerText}>⟳</Text>
            </Animated.View>
          </View>
        </Animated.View>
      );
    }
  };

  const handleContinue = () => {
    if (device) {
      // Log successful connection completion
      SupabaseLogger.logEvent('connection_completed', {
        deviceId: device.id,
        deviceName: device.name,
        deviceAddress: device.address,
        status: 'connected',
        eventData: {
          protocol: device.protocol,
          deviceType: device.deviceType,
          deviceCategory: device.deviceCategory,
          timestamp: new Date().toISOString()
        }
      });

      // Log user action
      SupabaseLogger.logUserAction('continue_to_data_screen', device.id, {
        screen: 'SuccessScreen',
        action: 'continue',
        timestamp: new Date().toISOString()
      });
    }
    
    onContinue();
  };

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        {renderIcon()}
        
        <Animated.Text 
          entering={device ? BounceIn.delay(800) : FadeIn} 
          style={[styles.title, {color: device ? colors.success : colors.inactive}]}
        >
          {device ? 'Connection Successful!' : 'Establishing Connection...'}
        </Animated.Text>
        
        <Animated.Text 
          entering={device ? SlideInUp.delay(1000) : FadeIn.delay(500)}
          style={[styles.subtitle, {color: colors.inactive}]}
        >
          {device 
            ? 'Your device is now connected and ready to use.'
            : 'Please wait while we connect to your device.'
          }
        </Animated.Text>
      </View>
      
      {device && (
        <Animated.View 
          entering={FadeIn.delay(1200)} 
          style={[styles.deviceCard, animatedPulseStyle]}
        >
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceLabel}>Connected Device</Text>
          </View>
          
          <Text style={styles.deviceName}>
            {device.name || 'Unknown Device'}
          </Text>
          <Text style={styles.deviceId}>
            ID: {device.id?.substring(device.id.length - 8) || 'N/A'}
          </Text>
          <Text style={styles.deviceProtocol}>
            Protocol: {device.protocol || 'Unknown'}
          </Text>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.content, device ? animatedFadeStyle : { opacity: 0.5 }]}>
        <Pressable 
          style={[
            styles.button, 
            device ? styles.primaryButton : styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!device}
        >
          <Text style={[
            device ? styles.primaryButtonText : styles.disabledButtonText
          ]}>
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successContainer: {
    marginBottom: 24,
  },
  successBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkmarkContainer: {
    padding: 8,
  },
  checkmark: {
    fontSize: 64,
    color: '#10B981',
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginBottom: 24,
  },
  loadingBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  spinner: {
    padding: 8,
  },
  spinnerText: {
    fontSize: 48,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  deviceProtocol: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  disabledButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});

export default SuccessScreen;