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
              {device.deviceType || 'Unknown Type'}
            </Text>
            {device.signalStrength && (
              <Text style={[styles.signal, { color: colors.inactive }]}>
                Signal: {device.signalStrength}%
              </Text>
            )}
          </View>
          <View style={styles.statusContainer}>
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
});

export default DeviceCard;
