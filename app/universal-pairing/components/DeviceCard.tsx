import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import Card from '@/components/Card';
import { useTheme } from '@/context/theme-context';
import { UniversalDevice } from '../types';

interface DeviceCardProps {
  device: UniversalDevice;
  onPress?: () => void;
  isSelected?: boolean;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onPress, isSelected }) => {
  const { colors } = useTheme();
  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      pulseAnimation.value = withRepeat(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseAnimation.value = withTiming(1, { duration: 300 });
    }
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });
  
  const getDeviceIcon = () => {
    // Check for ELD devices first (highest priority)
    if (device.deviceType === '181' || 
        device.deviceCategory === 'eld' || 
        device.protocol === 'ELD_DEVICE' ||
        device.name?.toUpperCase().includes('KD032') ||
        device.name?.toUpperCase().includes('ELD') ||
        device.name?.toUpperCase().includes('JIMI')) {
      return '🚛';
    }
    
    // Check for camera devices
    if (device.deviceType === '168' || 
        device.deviceCategory === 'camera' || 
        device.protocol === 'CAMERA_DEVICE' ||
        device.name?.toUpperCase().includes('CAMERA') ||
        device.name?.toUpperCase().includes('CAM')) {
      return '📷';
    }
    
    // Check for tracking devices
    if (device.deviceType === '165' || 
        device.deviceCategory === 'tracking' || 
        device.protocol === 'TRACKING_DEVICE' ||
        device.name?.toUpperCase().includes('TRACKER') ||
        device.name?.toUpperCase().includes('GPS')) {
      return '📍';
    }
    
    // Check for IoT sensors
    if (device.deviceCategory === 'sensor' || 
        device.protocol === 'IOT_SENSOR' ||
        device.name?.toUpperCase().includes('SENSOR')) {
      return '🔬';
    }
    
    // Check for general Bluetooth devices
    if (device.deviceCategory === 'bluetooth' || 
        device.protocol === 'UNKNOWN') {
      return '📶';
    }
    
    // Default fallback
    return '🛠️';
  };
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Animated.View style={animatedCardStyle}>
        <Card 
          style={[
            styles.card, 
            isSelected && { 
              borderColor: colors.primary, 
              borderWidth: 2 
            }
          ]}
        >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getDeviceIcon()}</Text>
          </View>
          <View style={styles.details}>
            <Text style={[styles.name, { color: colors.text }]}>
              {device.name || 'Unknown Device'}
            </Text>
            <Text style={[styles.address, { color: colors.inactive }]}>
              {device.address}
            </Text>
            <Text style={[styles.type, { color: colors.inactive }]}>
              {device.protocol === 'ELD_DEVICE' ? 'ELD Device' :
               device.protocol === 'CAMERA_DEVICE' ? 'Camera Device' :
               device.protocol === 'TRACKING_DEVICE' ? 'Tracking Device' :
               device.deviceType === '181' ? 'ELD Device' :
               device.deviceType === '168' ? 'Camera Device' :
               device.deviceType === '165' ? 'Tracking Device' :
               device.deviceType || 'Unknown Type'}
            </Text>
            {device.signalStrength && (
              <Text style={[styles.signal, { color: colors.inactive }]}>
                Signal: {device.signalStrength}%
              </Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            {device.protocol && device.protocol !== 'UNKNOWN' && (
              <View style={[
                styles.protocolBadge, 
                { backgroundColor: device.protocol === 'ELD_DEVICE' ? colors.success : colors.primary }
              ]}>
                <Text style={[styles.protocolText, { color: '#fff' }]}>
                  {device.protocol.replace('_DEVICE', '')}
                </Text>
              </View>
            )}
            <View style={[
              styles.statusBadge, 
              { backgroundColor: device.isConnected ? colors.success : colors.inactive }
            ]}>
              <Text style={[styles.status, { color: '#fff' }]}>
                {device.isConnected ? 'Connected' : 'Available'}
              </Text>
            </View>
          </View>
        </View>
        </Card>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    marginBottom: 2,
  },
  signal: {
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  protocolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DeviceCard;
