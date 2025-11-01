import React, { useEffect } from "react"
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import Svg, { Circle } from "react-native-svg"
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  Easing,
} from "react-native-reanimated"
import { Text } from "@/components/Text"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

export type CompactRingItem = {
  value: number // 0-100
  topLabel?: string
  bottomLabel?: string
  color?: string // optional override
  onPress?: () => void
  remainingColor?: string
}

export type CompactRingRowProps = {
  items: CompactRingItem[]
  size?: number // px for each ring (default 48)
  strokeWidth?: number // stroke width for ring
  gap?: number // horizontal gap between items
  primary?: string // default primary color
  /** fixed logo element rendered as a ring on the left */
  logo?: React.ReactNode
  /** size of the fixed logo */
  logoSize?: number
}

/**
 * CompactRingRow - animated compact ring row that accepts an array of items.
 * Uses react-native-reanimated for animated ScrollView and ring animations.
 * The row is horizontally scrollable. A fixed logo (ring) can be provided and will stay glued to the left.
 * Default primary color is '#0071ce'.
 */
export default function CompactRingRow({
  items,
  size = 48,
  strokeWidth = 6,
  gap = 12,
  primary = "#0071ce",
  logo,
  logoSize = 56,
}: CompactRingRowProps) {
  // shared scroll value
  const scrollX = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x
  })

  // content padding to make space for fixed logo
  const paddingLeft = logo ? logoSize + 20 : 8

  const animatedLogoStyle = useAnimatedStyle(() => {
    // shrink logo slightly as user scrolls right
    const s = interpolate(scrollX.value, [0, 80], [1, 0.92], Extrapolate.CLAMP)
    const op = interpolate(scrollX.value, [0, 80], [1, 0.85], Extrapolate.CLAMP)
    return {
      transform: [{ scale: s }],
      opacity: op,
    }
  })

  return (
    <View style={containerStyles.wrapper}>
      {/* fixed logo (left) */}
      {logo && (
        <Animated.View
          style={[
            containerStyles.logoWrapper,
            { width: logoSize, height: logoSize, borderRadius: logoSize / 2 },
            animatedLogoStyle,
          ]}
        >
          {/* draw a ring around logo to match style */}
          <Svg width={logoSize} height={logoSize} style={{ position: "absolute", left: 0, top: 0 }}>
            <Circle
              cx={logoSize / 2}
              cy={logoSize / 2}
              r={(logoSize - strokeWidth) / 2}
              stroke={primary}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          </Svg>
          <View style={containerStyles.logoInner}>{logo}</View>
        </Animated.View>
      )}

      <AnimatedScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft, alignItems: "flex-start" }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[cStyles.container, { paddingHorizontal: 0 }]}> 
          {items.map((it, idx) => (
            <RingItem
              key={idx}
              item={it}
              size={size}
              strokeWidth={strokeWidth}
              primary={primary}
              style={{ marginRight: idx === items.length - 1 ? 0 : gap }}
            />
          ))}
        </View>
      </AnimatedScrollView>
    </View>
  )
}

function RingItem({
  item,
  size,
  strokeWidth,
  primary,
  style,
}: {
  item: CompactRingItem
  size: number
  strokeWidth: number
  primary: string
  style?: any
}) {
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  // shared value for animation
  const prog = useSharedValue(Math.max(0, Math.min(100, item.value)))

  useEffect(() => {
    // animate to new value when item.value changes
    const clamped = Math.max(0, Math.min(100, item.value))
    prog.value = withTiming(clamped, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    })
  }, [item.value])

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference * (1 - prog.value / 100)
    return {
      strokeDashoffset: offset,
    } as any
  })

  const ringColor = item.color || primary
  const remaining = item.remainingColor || "#f4f4f5" // light gray for remaining portion

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={item.onPress} style={[cStyles.item, style]}>
      <Svg width={size} height={size}>
        {/* remaining path (full circle) */}
        <Circle cx={cx} cy={cy} r={radius} stroke={remaining} strokeWidth={strokeWidth} fill="transparent" />

        {/* animated progress (on top) */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      <Text style={cStyles.topLabel}>{item.topLabel}</Text>
      <Text style={cStyles.bottomLabel}>{item.bottomLabel}</Text>
    </TouchableOpacity>
  )
}

const cStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  item: {
    alignItems: "center",
    width: 72,
  },
  topLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  bottomLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
})

const containerStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
    minHeight: 88,
    justifyContent: "center",
  },
  logoWrapper: {
    position: "absolute",
    left: 12,
    top: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: "70%",
    height: "70%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
})