/**
 * Centralized Shadow System
 *
 * Provides consistent shadow definitions across the app for both iOS and Android.
 * iOS uses shadowColor/shadowOffset/shadowRadius, Android uses elevation.
 */

import { ViewStyle } from "react-native"

export interface ShadowStyle {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

/**
 * Shadow presets for consistent styling
 */
export const shadows = {
  /**
   * Small shadow - for subtle elevation (cards, inputs)
   */
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  } as ShadowStyle,

  /**
   * Medium shadow - for standard elevation (buttons, cards)
   */
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ShadowStyle,

  /**
   * Large shadow - for prominent elevation (modals, headers)
   */
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  } as ShadowStyle,

  /**
   * Elevated shadow - for maximum elevation (floating elements)
   */
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  } as ShadowStyle,
}

/**
 * Create a custom shadow style
 */
export function createShadow(
  color: string = "#000",
  offset: { width: number; height: number } = { width: 0, height: 4 },
  opacity: number = 0.1,
  radius: number = 8,
  elevation: number = 4,
): ShadowStyle {
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  }
}

/**
 * Get shadow style for dark mode
 */
export function getShadowForTheme(
  isDark: boolean,
  preset: keyof typeof shadows = "medium",
): ShadowStyle {
  const baseShadow = shadows[preset]
  return {
    ...baseShadow,
    shadowColor: isDark ? "#FFFFFF" : "#000",
    shadowOpacity: isDark ? baseShadow.shadowOpacity * 0.5 : baseShadow.shadowOpacity,
  }
}

/**
 * Apply shadow to a ViewStyle
 */
export function applyShadow(
  style: ViewStyle,
  preset: keyof typeof shadows = "medium",
  customColor?: string,
): ViewStyle {
  const shadow = customColor
    ? createShadow(
        customColor,
        shadows[preset].shadowOffset,
        shadows[preset].shadowOpacity,
        shadows[preset].shadowRadius,
        shadows[preset].elevation,
      )
    : shadows[preset]

  return {
    ...style,
    ...shadow,
  }
}
