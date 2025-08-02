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
import { useVehicleSetup, SetupStep } from '@/context/vehicle-setup-context';
import { CheckCircle, Truck, ArrowRight, Activity } from 'lucide-react-native';
import { router } from 'expo-router';

const colors = {
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  inactive: '#6B7280',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  successLight: '#ECFDF5',
  successDark: '#047857',
};

export default function SuccessStep() {
  const { 
    selectedDevice, 
    setStep,
    addLog,
    resetState
  } = useVehicleSetup();
  
  const successScale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const fadeAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Celebration animation sequence
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
    
    // Log success
    addLog('Device connection completed successfully!');
    addLog('Ready to collect ELD data');
    
    // Auto-transition to data collection after 3 seconds
    const timer = setTimeout(() => {
      setStep(SetupStep.DATA_COLLECTION);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
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
  
  const handleContinue = () => {
    addLog('User initiated data collection');
    setStep(SetupStep.DATA_COLLECTION);
  };
  
  const handleGoToDashboard = () => {
    addLog('Navigating to dashboard');
    resetState();
    router.replace('/(app)/(tabs)');
  };
  
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.successContainer, animatedSuccessStyle]}>
          <View style={styles.successBackground}>
            <Animated.View style={[styles.checkmarkContainer, animatedCheckmarkStyle]}>
              <CheckCircle size={64} color={colors.success} />
            </Animated.View>
          </View>
        </Animated.View>
        
        <Animated.Text 
          entering={BounceIn.delay(800)} 
          style={styles.title}
        >
          Connection Successful!
        </Animated.Text>
        
        <Animated.Text 
          entering={SlideInUp.delay(1000)}
          style={styles.subtitle}
        >
          Your ELD device is now connected and ready to collect data
        </Animated.Text>
      </View>
      
      {selectedDevice && (
        <Animated.View 
          entering={FadeIn.delay(1200)} 
          style={[styles.deviceCard, animatedPulseStyle]}
        >
          <View style={styles.deviceHeader}>
            <View style={styles.deviceIcon}>
              <Truck size={24} color={colors.success} />
            </View>
            <Text style={styles.deviceLabel}>Connected Device</Text>
          </View>
          
          <Text style={styles.deviceName}>
            {selectedDevice.name || 'Unknown Device'}
          </Text>
          <Text style={styles.deviceId}>
            ID: {selectedDevice.id?.substring(selectedDevice.id.length - 8) || 'N/A'}
          </Text>
          
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected & Active</Text>
          </View>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.content, animatedFadeStyle]}>
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What's Next?</Text>
          
          <View style={styles.featureItem}>
            <Activity size={20} color={colors.primary} />
            <Text style={styles.featureText}>
              Real-time data collection from your ELD device
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <CheckCircle size={20} color={colors.primary} />
            <Text style={styles.featureText}>
              Automatic compliance monitoring and reporting
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <Truck size={20} color={colors.primary} />
            <Text style={styles.featureText}>
              Hours of Service tracking and management
            </Text>
          </View>
        </View>
      </Animated.View>
      
      <Animated.View 
        entering={SlideInUp.delay(1600)} 
        style={styles.actions}
      >
        <Pressable 
          style={[styles.button, styles.primaryButton]}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>
            Start Data Collection
          </Text>
          <ArrowRight size={20} color={colors.background} />
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleGoToDashboard}
        >
          <Text style={styles.secondaryButtonText}>
            Go to Dashboard
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
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkmarkContainer: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  deviceCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.success,
    shadowColor: colors.success,
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
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: colors.inactive,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
  },
  content: {
    marginBottom: 24,
  },
  featuresContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
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
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
});
