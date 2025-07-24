import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/theme-context';
import { DriverStatus } from '@/types/status';

interface StatusButtonProps {
  status: DriverStatus;
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

export default function StatusButton({ status, label, isActive, onPress, icon }: StatusButtonProps) {
  const { colors, isDark } = useTheme();
  
  const getStatusColor = () => {
    switch (status) {
      case 'driving':
        return colors.driving;
      case 'onDuty':
        return colors.onDuty;
      case 'offDuty':
        return colors.offDuty;
      case 'sleeping':
        return colors.sleeping;
      case 'yardMoves':
        return colors.warning;
      default:
        return colors.primary;
    }
  };
  
  const statusColor = getStatusColor();
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isActive 
            ? statusColor 
            : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text 
          style={[
            styles.label, 
            { 
              color: isActive 
                ? isDark ? '#000' : '#fff' 
                : colors.text,
              marginLeft: icon ? 8 : 0,
            }
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});