import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/theme-context';

interface StatusClockProps {
  title: string;
  time: string;
  color?: string;
  warning?: boolean;
}

export default function StatusClock({ title, time, color, warning = false }: StatusClockProps) {
  const { colors, isDark } = useTheme();
  
  const clockColor = color || colors.primary;
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.card : '#F3F4F6',
        borderColor: warning ? colors.warning : clockColor,
      }
    ]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[
        styles.time, 
        { 
          color: warning ? colors.warning : clockColor,
        }
      ]}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  time: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
});