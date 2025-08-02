import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  SlideInRight,
  ZoomIn
} from 'react-native-reanimated';
import { useVehicleSetup, ConnectionStage, SetupStep } from '@/context/vehicle-setup-context';
import { Bluetooth, CheckCircle, Clock, Settings, Wifi } from 'lucide-react-native';

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
};

const connectionSteps = [
  {
    key: ConnectionStage.IDENTIFY_DEVICE,
    title: 'Identifying Device',
    description: 'Verifying device compatibility',
    icon: Bluetooth,
    duration: 2000
  },
  {
    key: ConnectionStage.GATHERING_INFO,
    title: 'Gathering Information',
    description: 'Collecting device specifications',
    icon: Settings,
    duration: 3000
  },
  {
    key: ConnectionStage.CAPTURING_ID,
    title: 'Capturing Device ID',
    description: 'Securing device identification',
    icon: Clock,
    duration: 2500
  },
  {
    key: ConnectionStage.PAIRING,
    title: 'Pairing with Device',
    description: 'Establishing secure connection',
    icon: Wifi,
    duration: 4000
  }
];

export default function ConnectingStep() {
  const { 
    connectionStage, 
    selectedDevice, 
    progress,
    setProgress,
    setConnectionStage,
    setStep,
    addLog,
    setError
  } = useVehicleSetup();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const pulseAnimation = useSharedValue(1);
  const progressAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Start pulsing animation
    pulseAnimation.value = withRepeat(
      withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    // Simulate connection process
    simulateConnectionProcess();
  }, []);
  
  const simulateConnectionProcess = async () => {
    for (let i = 0; i < connectionSteps.length; i++) {
      const step = connectionSteps[i];
      setCurrentStepIndex(i);
      setConnectionStage(step.key);
      addLog(`Starting: ${step.title}`);
      
      // Animate progress for this step
      const startProgress = (i / connectionSteps.length) * 100;
      const endProgress = ((i + 1) / connectionSteps.length) * 100;
      
      progressAnimation.value = withTiming(endProgress, {
        duration: step.duration,
        easing: Easing.inOut(Easing.ease)
      });
      
      setProgress(endProgress);
      
      // Wait for step duration
      await new Promise(resolve => setTimeout(resolve, step.duration));
      addLog(`Completed: ${step.title}`);
    }
    
    // Connection successful
    addLog('Device connection established successfully');
    setTimeout(() => {
      setStep(SetupStep.SUCCESS);
    }, 500);
  };
  
  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });
  
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value}%`,
    };
  });
  
  const renderConnectionStep = (step: any, index: number) => {
    const isActive = index === currentStepIndex;
    const isCompleted = index < currentStepIndex;
    const IconComponent = step.icon;
    
    return (
      <Animated.View
        key={step.key}
        entering={SlideInRight.delay(index * 200)}
        style={[
          styles.stepItem,
          isActive && styles.stepItemActive,
          isCompleted && styles.stepItemCompleted
        ]}
      >
        <View style={[
          styles.stepIcon,
          isActive && styles.stepIconActive,
          isCompleted && styles.stepIconCompleted
        ]}>
          {isCompleted ? (
            <CheckCircle size={24} color={colors.success} />
          ) : (
            <IconComponent 
              size={24} 
              color={isActive ? colors.primary : colors.inactive} 
            />
          )}
        </View>
        
        <View style={styles.stepContent}>
          <Text style={[
            styles.stepTitle,
            isActive && styles.stepTitleActive,
            isCompleted && styles.stepTitleCompleted
          ]}>
            {step.title}
          </Text>
          <Text style={[
            styles.stepDescription,
            isActive && styles.stepDescriptionActive
          ]}>
            {step.description}
          </Text>
        </View>
        
        {isActive && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </Animated.View>
    );
  };
  
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.deviceContainer, animatedPulseStyle]}>
          <View style={styles.deviceIcon}>
            <Bluetooth size={48} color={colors.primary} />
          </View>
        </Animated.View>
        
        <Text style={styles.title}>Connecting to Device</Text>
        
        {selectedDevice && (
          <Animated.View entering={ZoomIn.delay(300)} style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {selectedDevice.name || 'Unknown Device'}
            </Text>
            <Text style={styles.deviceId}>
              ID: {selectedDevice.id?.substring(selectedDevice.id.length - 8) || 'N/A'}
            </Text>
          </Animated.View>
        )}
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress)}% Complete
          </Text>
        </View>
      </View>
      
      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Connection Process</Text>
        
        <View style={styles.stepsList}>
          {connectionSteps.map((step, index) => renderConnectionStep(step, index))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This may take a few moments. Please keep your device nearby.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  deviceContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deviceIcon: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: colors.inactive,
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: colors.inactive,
    fontWeight: '500',
  },
  stepsContainer: {
    flex: 1,
    marginTop: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  stepsList: {
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepItemActive: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepItemCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.success,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconActive: {
    backgroundColor: colors.primary + '20',
  },
  stepIconCompleted: {
    backgroundColor: colors.success + '20',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inactive,
    marginBottom: 2,
  },
  stepTitleActive: {
    color: colors.text,
  },
  stepTitleCompleted: {
    color: colors.success,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.inactive,
  },
  stepDescriptionActive: {
    color: colors.text,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 20,
  },
});
