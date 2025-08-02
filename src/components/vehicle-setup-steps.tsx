import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInUp, 
  SlideOutDown, 
  ZoomIn, 
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence
} from 'react-native-reanimated';
import { useVehicleSetup, SetupStep, ConnectionStage } from '@/context/vehicle-setup-context';
import { Search, Bluetooth, CheckCircle, XCircle, Activity, Wifi } from 'lucide-react-native';

// Theme colors (replace with your theme context if available)
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Scan Devices Step Component
export const ScanDevicesStep: React.FC = () => {
  const { scannedDevices, isScanning } = useVehicleSetup();
  
  const pulseAnimation = useSharedValue(1);
  const rotateAnimation = useSharedValue(0);

  React.useEffect(() => {
    if (isScanning) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
      
      rotateAnimation.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
    }
  }, [isScanning]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnimation.value}deg` }],
  }));

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Animated.View style={[styles.iconContainer, pulseStyle]}>
          <Animated.View style={rotateStyle}>
            <Search size={48} color={isScanning ? colors.primary : colors.inactive} />
          </Animated.View>
        </Animated.View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {isScanning ? 'Scanning for Devices...' : 'Ready to Scan'}
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          {isScanning 
            ? `Found ${scannedDevices.length} device${scannedDevices.length !== 1 ? 's' : ''} so far`
            : 'Tap the scan button above to discover nearby ELD devices'
          }
        </Text>

        {isScanning && (
          <View style={styles.scanningIndicators}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.scanningText, { color: colors.primary }]}>
              Searching for ELD devices...
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Device Selected Step Component
export const DeviceSelectedStep: React.FC = () => {
  const { selectedDevice } = useVehicleSetup();

  return (
    <Animated.View entering={SlideInUp} exiting={SlideOutDown} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Bluetooth size={48} color={colors.primary} />
        </View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Device Selected
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          {selectedDevice?.name || 'Selected device'} is ready for connection
        </Text>

        <View style={[styles.deviceInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {selectedDevice?.name || 'Unknown Device'}
          </Text>
          <Text style={[styles.deviceId, { color: colors.inactive }]}>
            ID: {selectedDevice?.id?.substring(selectedDevice.id.length - 8) || 'N/A'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Connecting Step Component
export const ConnectingStep: React.FC = () => {
  const { connectionStage, progress, selectedDevice } = useVehicleSetup();
  
  const spinAnimation = useSharedValue(0);
  const progressAnimation = useSharedValue(0);

  React.useEffect(() => {
    spinAnimation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    );
    
    progressAnimation.value = withTiming(progress, { duration: 500 });
  }, [progress]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAnimation.value}deg` }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  const getStageText = (stage: ConnectionStage | null) => {
    switch (stage) {
      case ConnectionStage.IDENTIFY_DEVICE:
        return 'Identifying device...';
      case ConnectionStage.GATHERING_INFO:
        return 'Gathering device information...';
      case ConnectionStage.CAPTURING_ID:
        return 'Capturing device ID...';
      case ConnectionStage.PAIRING:
        return 'Pairing with device...';
      default:
        return 'Establishing connection...';
    }
  };

  return (
    <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
          <Animated.View style={spinStyle}>
            <Wifi size={48} color={colors.warning} />
          </Animated.View>
        </Animated.View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Connecting to Device
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          {getStageText(connectionStage)}
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { backgroundColor: colors.warning },
                progressStyle
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.inactive }]}>
            {Math.round(progress)}% Complete
          </Text>
        </View>

        <View style={[styles.deviceInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {selectedDevice?.name || 'Connecting...'}
          </Text>
          <Text style={[styles.deviceId, { color: colors.inactive }]}>
            Please wait while we establish the connection
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Success Step Component
export const SuccessStep: React.FC = () => {
  const { selectedDevice } = useVehicleSetup();
  
  const scaleAnimation = useSharedValue(0);

  React.useEffect(() => {
    scaleAnimation.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );
  }, []);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  return (
    <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }, scaleStyle]}>
          <CheckCircle size={48} color={colors.success} />
        </Animated.View>
        
        <Text style={[styles.stepTitle, { color: colors.success }]}>
          Connection Successful!
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          Successfully connected to {selectedDevice?.name || 'your ELD device'}
        </Text>

        <View style={[styles.deviceInfo, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {selectedDevice?.name || 'ELD Device'}
          </Text>
          <Text style={[styles.deviceId, { color: colors.success }]}>
            ✓ Connected and ready for data collection
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Error Step Component
export const ErrorStep: React.FC = () => {
  const { error, selectedDevice, resetState } = useVehicleSetup();
  
  const shakeAnimation = useSharedValue(0);

  React.useEffect(() => {
    shakeAnimation.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  return (
    <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }, shakeStyle]}>
          <XCircle size={48} color={colors.error} />
        </Animated.View>
        
        <Text style={[styles.stepTitle, { color: colors.error }]}>
          Connection Failed
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          {error?.message || 'Unable to connect to the ELD device'}
        </Text>

        {error?.details && (
          <View style={[styles.errorDetails, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
            <Text style={[styles.errorDetailsText, { color: colors.text }]}>
              {error.details}
            </Text>
            {error.code && (
              <Text style={[styles.errorCode, { color: colors.error }]}>
                Error Code: {error.code}
              </Text>
            )}
          </View>
        )}

        <AnimatedPressable
          entering={SlideInUp.delay(300)}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={resetState}
        >
          <Text style={[styles.retryButtonText, { color: colors.background }]}>
            Try Again
          </Text>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
};

// Data Collection Step Component
export const DataCollectionStep: React.FC = () => {
  const { selectedDevice } = useVehicleSetup();
  
  const pulseAnimation = useSharedValue(1);

  React.useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }, pulseStyle]}>
          <Activity size={48} color={colors.primary} />
        </Animated.View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Collecting Data
        </Text>
        
        <Text style={[styles.stepDescription, { color: colors.inactive }]}>
          Receiving real-time data from {selectedDevice?.name || 'your ELD device'}
        </Text>

        <View style={[styles.dataStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>Active</Text>
            <Text style={[styles.statLabel, { color: colors.inactive }]}>Status</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>Real-time</Text>
            <Text style={[styles.statLabel, { color: colors.inactive }]}>Collection</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stepContent: {
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  deviceInfo: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
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
    textAlign: 'center',
  },
  scanningIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  scanningText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorDetails: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorDetailsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  errorCode: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dataStats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});
