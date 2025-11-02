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
import { Clock } from 'lucide-react-native';
import { Text } from '@/components/Text';

export default function HOSServiceCardSkeleton() {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={shimmerStyle}>
          <Clock size={20} color={colors.textDim || '#D1D5DB'} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || '#E5E7EB',
              width: 160,
              height: 18,
              marginLeft: 8,
            },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Big Timer Section */}
      <View style={[styles.bigTimerSection, { backgroundColor: colors.surface || '#F9FAFB' }]}>
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || '#E5E7EB',
              width: 120,
              height: 13,
              marginBottom: 16,
            },
            shimmerStyle,
          ]}
        />
        
        {/* Circular Progress Skeleton */}
        <Animated.View
          style={[
            styles.circleSkeleton,
            {
              backgroundColor: colors.textDim || '#E5E7EB',
              borderColor: colors.border || '#E5E7EB',
            },
            shimmerStyle,
          ]}
        />
        
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || '#E5E7EB',
              width: 100,
              height: 13,
              marginTop: 12,
            },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Horizontal Stats */}
      <View style={styles.horizontalStats}>
        {/* Drive Stat */}
        <View style={styles.statItem}>
          <Animated.View
            style={[
              styles.iconCircleSkeleton,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 40,
                height: 12,
                marginBottom: 8,
              },
              shimmerStyle,
            ]}
          />
          
          {/* Small Circle Progress Skeleton */}
          <Animated.View
            style={[
              styles.smallCircleSkeleton,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                borderColor: colors.border || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
          
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 50,
                height: 20,
                marginBottom: 8,
              },
              shimmerStyle,
            ]}
          />
          
          {/* Mini Bar Skeleton */}
          <Animated.View
            style={[
              styles.miniBarSkeleton,
              {
                backgroundColor: colors.border || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border || '#E5E7EB' }]} />

        {/* Shift Stat */}
        <View style={styles.statItem}>
          <Animated.View
            style={[
              styles.iconCircleSkeleton,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 40,
                height: 12,
                marginBottom: 8,
              },
              shimmerStyle,
            ]}
          />
          
          {/* Small Circle Progress Skeleton */}
          <Animated.View
            style={[
              styles.smallCircleSkeleton,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                borderColor: colors.border || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
          
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 50,
                height: 20,
                marginBottom: 8,
              },
              shimmerStyle,
            ]}
          />
          
          {/* Mini Bar Skeleton */}
          <Animated.View
            style={[
              styles.miniBarSkeleton,
              {
                backgroundColor: colors.border || '#E5E7EB',
              },
              shimmerStyle,
            ]}
          />
        </View>
      </View>

      {/* Cycle Section */}
      <View style={[styles.cycleSection, { borderTopColor: colors.border || '#E5E7EB' }]}>
        <View style={styles.cycleLabelRow}>
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 80,
                height: 13,
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 120,
                height: 14,
              },
              shimmerStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  skeletonText: {
    borderRadius: 4,
  },
  bigTimerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  circleSkeleton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
  },
  horizontalStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  iconCircleSkeleton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 8,
  },
  smallCircleSkeleton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 6,
    marginBottom: 8,
  },
  miniBarSkeleton: {
    width: '80%',
    height: 6,
    borderRadius: 3,
  },
  divider: {
    width: 1,
    marginVertical: 8,
  },
  cycleSection: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cycleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});

