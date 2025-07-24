import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '@/context/theme-context';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
}

export default function Card({ children, variant = 'default', style, ...props }: CardProps) {
  const { colors, isDark } = useTheme();
  
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.card : '#fff',
          shadowOpacity: variant === 'elevated' ? 0.15 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
});