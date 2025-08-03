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
import { useTheme } from '@/context/theme-context';
import Button from '@/components/Button';
import { UniversalDevice } from '../types';

interface ConnectionScreenProps {
  device: UniversalDevice | null;
  onCancel: () => void;
}

const connectionSteps = [
  {
    title: 'Identifying Device',
    description: 'Verifying device compatibility',
    icon: '🔍',
    duration: 2000
  },
  {
    title: 'Establishing Connection',
    description: 'Creating secure link',
    icon: '🔗',
    duration: 3000
  },
  {
    title: 'Authenticating',
    description: 'Validating device credentials',
    icon: '🔐',
    duration: 2500
  },
  {
    title: 'Finalizing Setup',
    description: 'Configuring data stream',
    icon: '⚙️',
    duration: 2000
  }
];

const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ device, onCancel }) => {
  const { colors } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const pulseAnimation = useSharedValue(1);
  const progressAnimation = useSharedValue(0);
  const deviceIconScale = useSharedValue(1);

  useEffect(() => {
    // Start pulsing animation for device icon
    pulseAnimation.value = withRepeat(
      withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Device icon breathing effect
    deviceIconScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(0.95, { duration: 1000 })
      ),
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
    }
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

  const animatedDeviceIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: deviceIconScale.value }],
    };
  });

  const getDeviceIcon = () => {
    if (!device) return '🛠️';
    switch (device.deviceCategory) {
      case 'eld':
        return '🚛';
      case 'camera':
        return '📷';
      case 'tracking':
        return '📍';
      case 'bluetooth':
        return '📶';
      case 'sensor':
        return '🔬';
      default:
        return '🛠️';
    }
  };

  const renderConnectionStep = (step: any, index: number) => {
    const isActive = index === currentStepIndex;
    const isCompleted = index < currentStepIndex;
    
    return (
      <Animated.View
        key={index}
        entering={SlideInRight.delay(index * 200)}
        style={[
          styles.stepItem,
          isActive && [styles.stepItemActive, { borderColor: colors.primary }],
          isCompleted && [styles.stepItemCompleted, { backgroundColor: colors.success + '10', borderColor: colors.success }]
        ]}
      >
        <View style={[
          styles.stepIcon,
          isActive && [styles.stepIconActive, { backgroundColor: colors.primary + '20' }],
          isCompleted && [styles.stepIconCompleted, { backgroundColor: colors.success + '20' }]
        ]}>
          {isCompleted ? (
            <Text style={styles.checkmark}>✓</Text>
          ) : (
            <Text style={styles.stepEmoji}>{step.icon}</Text>
          )}
        </View>
        
        <View style={styles.stepContent}>
          <Text style={[
            styles.stepTitle,
            { color: colors.text },
            isActive && styles.stepTitleActive,
            isCompleted && [styles.stepTitleCompleted, { color: colors.success }]
          ]}>
            {step.title}
          </Text>
          <Text style={[
            styles.stepDescription,
            { color: colors.inactive },
            isActive && { color: colors.text }
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
    <Animated.View entering={FadeIn} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.deviceContainer, { backgroundColor: colors.card }, animatedPulseStyle]}>
          <Animated.View style={animatedDeviceIconStyle}>
            <Text style={styles.deviceIcon}>{getDeviceIcon()}</Text>
          </Animated.View>
        </Animated.View>
        
        <Text style={[styles.title, { color: colors.text }]}>Connecting to Device</Text>
        
        {device && (
          <Animated.View entering={ZoomIn.delay(300)} style={[styles.deviceInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {device.name || 'Unknown Device'}
            </Text>
            <Text style={[styles.deviceId, { color: colors.inactive }]}>
              ID: {device.id?.substring(device.id.length - 8) || 'N/A'}
            </Text>
          </Animated.View>
        )}
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary }, animatedProgressStyle]} />
          </View>
          <Text style={[styles.progressText, { color: colors.inactive }]}>
            {Math.round(progress)}% Complete
          </Text>
        </View>
      </View>
      
      <View style={styles.stepsContainer}>
        <Text style={[styles.stepsTitle, { color: colors.text }]}>Connection Process</Text>
        
        <View style={styles.stepsList}>
          {connectionSteps.map((step, index) => renderConnectionStep(step, index))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.inactive }]}>
          This may take a few moments. Please keep your device nearby.
        </Text>
        
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.cancelButton}
        />
      </View>
    </Animated.View>
  );
};

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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  deviceIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepsContainer: {
    flex: 1,
    marginTop: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepItemCompleted: {},
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconActive: {},
  stepIconCompleted: {},
  stepEmoji: {
    fontSize: 24,
  },
  checkmark: {
    fontSize: 24,
    color: '#10B981',
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepTitleActive: {},
  stepTitleCompleted: {},
  stepDescription: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButton: {
    minWidth: 120,
  },
});

export default ConnectionScreen;
