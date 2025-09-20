import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme/context';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme } = useAppTheme();
  
  const { colors, isDark } = theme;
  
  const getBackgroundColor = () => {
    if (disabled) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    switch (variant) {
      case 'primary':
        return colors.tint;
      case 'secondary':
        return colors.palette.accent500;
      case 'outline':
        return 'transparent';
      case 'danger':
        return colors.error;
      default:
        return colors.tint;
    }
  };
  
  const getTextColor = () => {
    if (disabled) return isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    
    switch (variant) {
      case 'outline':
        return colors.tint;
      case 'primary':
      case 'secondary':
      case 'danger':
        return '#fff';
      default:
        return '#fff';
    }
  };
  
  const getBorderColor = () => {
    if (disabled) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    switch (variant) {
      case 'outline':
        return colors.tint;
      default:
        return 'transparent';
    }
  };
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity: pressed ? 0.8 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.title, { color: getTextColor() }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});