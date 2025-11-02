import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/context';

export default function ComplianceSettingsSkeleton() {
  const { theme } = useAppTheme();
  const { colors } = theme;
  
  // Create animated opacity values for shimmer effect
  const shimmerOpacity = useSharedValue(0.3);
  
  useEffect(() => {
    // Animate shimmer effect
    shimmerOpacity.value = withRepeat(
      withTiming(0.7, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse animation
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // This skeleton is minimal since compliance settings are mainly used
  // for formatting cycle labels in the HOS card, which is already handled
  // by the HOSServiceCardSkeleton. This is just a placeholder component
  // in case a dedicated settings UI is needed in the future.
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#FFFFFF' }]}>
      <Animated.View
        style={[
          styles.skeletonText,
          {
            backgroundColor: colors.textDim || '#E5E7EB',
            width: 200,
            height: 16,
          },
          shimmerStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonText,
          {
            backgroundColor: colors.textDim || '#E5E7EB',
            width: 150,
            height: 14,
            marginTop: 12,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  skeletonText: {
    borderRadius: 4,
  },
});

