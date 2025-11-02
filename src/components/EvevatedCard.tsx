import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme/context';

interface CardProps extends Omit<ViewProps, 'style'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  style?: ViewStyle | ViewStyle[];
}

export default function EvelvatedCard({ children, variant = 'default', style, ...props }: CardProps) {
  const { theme } = useAppTheme();
  const {colors, isDark} = theme;
  
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: isDark ? '#FFFFFF' : '#000000',
          shadowOpacity: isDark ? 0.3 : (variant === 'elevated' ? 0.1 : 0.05),
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
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
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
});