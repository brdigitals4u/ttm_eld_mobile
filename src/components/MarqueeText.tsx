/**
 * MarqueeText Component
 * Horizontal scrolling text component for displaying fleet-related messages
 * Uses react-native-reanimated for smooth infinite scrolling animation
 */

import React, { useEffect, useRef } from "react"
import { View, StyleSheet, Dimensions } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated"

import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

export interface MarqueeTextProps {
  messages: string[]
  speed?: number // Duration in milliseconds for one full cycle
  style?: any
  textStyle?: any
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  messages,
  speed = 15000, // 15 seconds for one full cycle
  style,
  textStyle,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const translateX = useSharedValue(0)
  const containerWidth = useRef(0)
  const textWidth = useRef(0)

  useEffect(() => {
    if (textWidth.current > 0 && containerWidth.current > 0) {
      // Calculate the distance to scroll (text width + some padding)
      const scrollDistance = textWidth.current + containerWidth.current

      translateX.value = withRepeat(
        withTiming(-scrollDistance, {
          duration: speed,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false, // Don't reverse
      )
    }
  }, [messages, speed, translateX])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    }
  })

  // Combine all messages into one long string
  const combinedText = messages.join(" • ")

  // Dynamic styles based on theme
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: 70,
          justifyContent: "center",
          overflow: "hidden",
        },
        text: {
          color: colors.textDim,
          fontSize: 13,
        },
        textContainer: {
          alignItems: "center",
          flexDirection: "row",
        },
      }),
    [colors],
  )

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => {
        containerWidth.current = e.nativeEvent.layout.width
      }}
    >
      <Animated.View style={[styles.textContainer, animatedStyle]}>
        <Text
          style={[styles.text, textStyle]}
          onLayout={(e) => {
            textWidth.current = e.nativeEvent.layout.width
          }}
        >
          {combinedText} • {combinedText} • {combinedText}
        </Text>
      </Animated.View>
    </View>
  )
}
