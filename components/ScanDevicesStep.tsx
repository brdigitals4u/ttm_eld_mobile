import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  Easing,
  FadeIn,
  SlideInUp
} from 'react-native-reanimated';
import { useVehicleSetup, SetupStep } from '@/context/vehicle-setup-context';
import { Search, Bluetooth, CheckCircle } from 'lucide-react-native';

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

export default function ScanDevicesStep() {
  const { 
    isScanning, 
    scannedDevices, 
    setStep, 
    setSelectedDevice,
    addLog
  } = useVehicleSetup();
  
  const scanAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      scanAnimation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
      pulseAnimation.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scanAnimation.value = withTiming(0, { duration: 300 });
      pulseAnimation.value = withTiming(1, { duration: 300 });
    }
  }, [isScanning]);

  const animatedScanStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${scanAnimation.value}deg` }],
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });

  const handleDeviceSelect = (device: any) => {
    setSelectedDevice(device);
    addLog(`Device selected: ${device.name || 'Unknown'} (${device.id})`);
    setStep(SetupStep.DEVICE_SELECTED);
  };

  const renderDeviceCard = (device: any, index: number) => (
    <Animated.View
      key={device.id}
      entering={SlideInUp.delay(index * 100)}
      style={styles.deviceCard}
    >
      <Pressable
        style={styles.devicePressable}
        onPress={() => handleDeviceSelect(device)}
      >
        <View style={styles.deviceIcon}>
          <Bluetooth size={24} color={colors.primary} />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceId}>ID: {device.id.substring(device.id.length - 8)}</Text>
          {device.signal && (
            <Text style={styles.deviceSignal}>Signal: {device.signal} dBm</Text>
          )}
        </View>
        <View style={styles.deviceStatus}>
          <CheckCircle size={20} color={colors.success} />
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconContainer, animatedPulseStyle]}>
          <Animated.View style={animatedScanStyle}>
            <Search size={48} color={isScanning ? colors.primary : colors.success} />
          </Animated.View>
        </Animated.View>
        
        <Text style={styles.title}>
          {isScanning ? 'Scanning for ELD Devices' : 'Scan Complete'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isScanning 
            ? 'Looking for nearby Electronic Logging Devices...'
            : `Found ${scannedDevices.length} device${scannedDevices.length !== 1 ? 's' : ''}`
          }
        </Text>

        {isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.scanningText}>Scanning in progress...</Text>
          </View>
        )}
      </View>

      {scannedDevices.length > 0 && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.devicesSection}>
          <Text style={styles.devicesSectionTitle}>
            Available Devices ({scannedDevices.length})
          </Text>
          <Text style={styles.devicesSectionSubtitle}>
            Tap on a device to connect
          </Text>
          
          <View style={styles.devicesList}>
            {scannedDevices.map((device, index) => renderDeviceCard(device, index))}
          </View>
        </Animated.View>
      )}

      {!isScanning && scannedDevices.length === 0 && (
        <Animated.View entering={FadeIn.delay(500)} style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Devices Found</Text>
          <Text style={styles.emptyStateText}>
            Make sure your ELD device is powered on and in pairing mode
          </Text>
        </Animated.View>
      )}
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  scanningText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  devicesSection: {
    flex: 1,
  },
  devicesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  devicesSectionSubtitle: {
    fontSize: 14,
    color: colors.inactive,
    marginBottom: 16,
  },
  devicesList: {
    flex: 1,
  },
  deviceCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  devicePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
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
  deviceSignal: {
    fontSize: 12,
    color: colors.inactive,
    marginTop: 2,
  },
  deviceStatus: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 20,
  },
});
