import React, { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"

import { useAppStore } from "@/stores/appStore"
import { useAppTheme } from "@/theme/context"

/**
 * Theme Transition Overlay Component
 * 
 * Provides Telegram-style smooth theme transitions by showing a fade overlay
 * during theme changes to hide the visual flash/flicker.
 * 
 * Usage: Add to root layout inside ThemeProvider
 */
export const ThemeTransitionOverlay: React.FC = () => {
  const themeChangeTrigger = useAppStore((state) => state.themeChangeTrigger)
  const { theme } = useAppTheme()
  const { isDark } = theme

  // Determine overlay color based on target theme
  // When switching to dark, use black overlay; when switching to light, use white overlay
  const overlayColor = isDark ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)"

  if (!themeChangeTrigger) {
    return null
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[styles.overlay, { backgroundColor: overlayColor }]}
      pointerEvents="none"
    />
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
})

