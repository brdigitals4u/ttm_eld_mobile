/**
 * SafeAreaContainer Component
 *
 * Provides consistent safe area padding across the app, especially for bottom buttons
 * that might overlap with device navigation bars.
 *
 * Usage:
 * <SafeAreaContainer>
 *   <YourContent />
 * </SafeAreaContainer>
 *
 * Or with custom padding:
 * <SafeAreaContainer bottomPadding={20}>
 *   <YourContent />
 * </SafeAreaContainer>
 */

import React from "react"
import { View, ViewStyle, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface SafeAreaContainerProps {
  children: React.ReactNode
  /**
   * Custom bottom padding override (in addition to safe area insets)
   * Default: 0
   */
  bottomPadding?: number
  /**
   * Custom top padding override (in addition to safe area insets)
   * Default: 0
   */
  topPadding?: number
  /**
   * Custom left padding override (in addition to safe area insets)
   * Default: 0
   */
  leftPadding?: number
  /**
   * Custom right padding override (in addition to safe area insets)
   * Default: 0
   */
  rightPadding?: number
  /**
   * Apply safe area insets to all edges
   * Default: false (only bottom)
   */
  edges?: ("top" | "bottom" | "left" | "right")[]
  /**
   * Additional style to apply
   */
  style?: ViewStyle
}

export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  children,
  bottomPadding = 0,
  topPadding = 0,
  leftPadding = 0,
  rightPadding = 0,
  edges = ["bottom"],
  style,
}) => {
  const insets = useSafeAreaInsets()

  const containerStyle: ViewStyle = {
    paddingBottom: edges.includes("bottom")
      ? Math.max(insets.bottom, bottomPadding)
      : bottomPadding,
    paddingTop: edges.includes("top") ? Math.max(insets.top, topPadding) : topPadding,
    paddingLeft: edges.includes("left") ? Math.max(insets.left, leftPadding) : leftPadding,
    paddingRight: edges.includes("right") ? Math.max(insets.right, rightPadding) : rightPadding,
  }

  return <View style={[styles.container, containerStyle, style]}>{children}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
















