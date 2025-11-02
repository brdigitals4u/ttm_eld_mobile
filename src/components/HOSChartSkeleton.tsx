import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/context';
import { Calendar, User, Truck } from 'lucide-react-native';
import { Text } from '@/components/Text';

const SCREEN_WIDTH = Dimensions.get('window').width - 64;
const CHART_WIDTH = SCREEN_WIDTH;
const CHART_HEIGHT = 160;
const PADDING = 40;

export default function HOSChartSkeleton() {
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

  // Shared animated style for all segments
  const segmentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // Create skeleton chart segments (simulating HOS chart appearance)
  const segmentWidth = (CHART_WIDTH - PADDING * 2) / 8;
  const segmentHeights = [60, 80, 100, 120, 100, 80, 120, 100]; // Varying heights
  const segmentYPositions = [100, 80, 60, 40, 60, 80, 40, 60]; // Varying Y positions
  
  const chartSegments = segmentHeights.map((height, i) => {
    const x = PADDING + i * segmentWidth;
    const width = segmentWidth - 4;
    const y = PADDING + segmentYPositions[i];
    
    return (
      <Animated.View
        key={`segment-${i}`}
        style={[
          styles.skeletonSegment,
          {
            left: x,
            width: width,
            top: y,
            height: height,
            backgroundColor: colors.textDim || '#E5E7EB',
          },
          segmentAnimatedStyle,
        ]}
      />
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[shimmerStyle]}>
            <Calendar size={20} color={colors.textDim || '#D1D5DB'} />
          </Animated.View>
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 200,
                height: 16,
                marginLeft: 8,
              },
              shimmerStyle,
            ]}
          />
        </View>
        <View style={styles.headerRight}>
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 100,
                height: 12,
                marginBottom: 4,
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || '#E5E7EB',
                width: 80,
                height: 12,
              },
              shimmerStyle,
            ]}
          />
        </View>
      </View>

      {/* Chart Container Skeleton */}
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
          {/* Background grid lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={`grid-h-${i}`}
              style={[
                styles.gridLine,
                {
                  top: PADDING + (i * (CHART_HEIGHT - PADDING * 2)) / 4,
                  backgroundColor: colors.border || '#F3F4F6',
                },
              ]}
            />
          ))}
          
          {Array.from({ length: 7 }).map((_, i) => (
            <View
              key={`grid-v-${i}`}
              style={[
                styles.gridLineVertical,
                {
                  left: PADDING + (i * (CHART_WIDTH - PADDING * 2)) / 6,
                  backgroundColor: colors.border || '#F3F4F6',
                },
              ]}
            />
          ))}

          {/* Chart segments skeleton */}
          {chartSegments}

          {/* Status labels skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Animated.View
              key={`status-label-${i}`}
              style={[
                styles.skeletonText,
                {
                  position: 'absolute',
                  left: -35,
                  top: PADDING + (i * (CHART_HEIGHT - PADDING * 2)) / 3.5 - 8,
                  width: 30,
                  height: 12,
                  backgroundColor: colors.textDim || '#E5E7EB',
                },
                shimmerStyle,
              ]}
            />
          ))}

          {/* Hour labels skeleton */}
          {Array.from({ length: 7 }).map((_, i) => (
            <Animated.View
              key={`hour-label-${i}`}
              style={[
                styles.skeletonText,
                {
                  position: 'absolute',
                  left: PADDING + (i * (CHART_WIDTH - PADDING * 2)) / 6 - 4,
                  bottom: -20,
                  width: 16,
                  height: 10,
                  backgroundColor: colors.textDim || '#E5E7EB',
                },
                shimmerStyle,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Legend Skeleton */}
      <View style={styles.legendContainer}>
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || '#E5E7EB',
              width: 100,
              height: 14,
              marginBottom: 8,
            },
            shimmerStyle,
          ]}
        />
        <View style={styles.legendGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={`legend-${i}`} style={styles.legendItem}>
              <Animated.View
                style={[
                  styles.legendColorSkeleton,
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
                    width: 60 + i * 20,
                    height: 12,
                  },
                  shimmerStyle,
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  chartContainer: {
    height: 200,
    marginBottom: 16,
  },
  chart: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  skeletonSegment: {
    position: 'absolute',
    borderRadius: 2,
  },
  skeletonText: {
    borderRadius: 4,
  },
  legendContainer: {
    marginTop: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minWidth: '48%',
  },
  legendColorSkeleton: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
});

