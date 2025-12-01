import React, { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import { Clock } from "lucide-react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export default function HOSServiceCardSkeleton() {
  const { theme } = useAppTheme()
  const { colors } = theme

  // Create animated opacity values for shimmer effect
  const shimmerOpacity = useSharedValue(0.3)

  useEffect(() => {
    // Animate shimmer effect
    shimmerOpacity.value = withRepeat(
      withTiming(0.7, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true, // Reverse animation
    )
  }, [])

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }))

  return (
    <View style={[styles.container, { backgroundColor: colors.background || "#FFFFFF" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={shimmerStyle}>
          <Clock size={20} color={colors.textDim || "#D1D5DB"} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || "#E5E7EB",
              width: 160,
              height: 18,
              marginLeft: 8,
            },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Big Timer Section */}
      <View style={[styles.bigTimerSection, { backgroundColor: colors.surface || "#F9FAFB" }]}>
        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || "#E5E7EB",
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
              backgroundColor: colors.textDim || "#E5E7EB",
              borderColor: colors.border || "#E5E7EB",
            },
            shimmerStyle,
          ]}
        />

        <Animated.View
          style={[
            styles.skeletonText,
            {
              backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.textDim || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.textDim || "#E5E7EB",
                borderColor: colors.border || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.border || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border || "#E5E7EB" }]} />

        {/* Shift Stat */}
        <View style={styles.statItem}>
          <Animated.View
            style={[
              styles.iconCircleSkeleton,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.textDim || "#E5E7EB",
                borderColor: colors.border || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.border || "#E5E7EB",
              },
              shimmerStyle,
            ]}
          />
        </View>
      </View>

      {/* Cycle Section */}
      <View style={[styles.cycleSection, { borderTopColor: colors.border || "#E5E7EB" }]}>
        <View style={styles.cycleLabelRow}>
          <Animated.View
            style={[
              styles.skeletonText,
              {
                backgroundColor: colors.textDim || "#E5E7EB",
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
                backgroundColor: colors.textDim || "#E5E7EB",
                width: 120,
                height: 14,
              },
              shimmerStyle,
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bigTimerSection: {
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 24,
  },
  circleSkeleton: {
    borderRadius: 40,
    borderWidth: 8,
    height: 80,
    width: 80,
  },
  container: {
    borderRadius: 24,
    elevation: 2,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cycleLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cycleSection: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  divider: {
    marginVertical: 8,
    width: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  horizontalStats: {
    flexDirection: "row",
    marginBottom: 20,
  },
  iconCircleSkeleton: {
    borderRadius: 18,
    height: 36,
    marginBottom: 8,
    width: 36,
  },
  miniBarSkeleton: {
    borderRadius: 3,
    height: 6,
    width: "80%",
  },
  skeletonText: {
    borderRadius: 4,
  },
  smallCircleSkeleton: {
    borderRadius: 21,
    borderWidth: 6,
    height: 42,
    marginBottom: 8,
    width: 42,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
})
