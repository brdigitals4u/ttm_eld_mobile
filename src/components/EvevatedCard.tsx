import React from "react"
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import { getShadowForTheme } from "@/theme/shadows"

interface CardProps extends Omit<ViewProps, "style"> {
  children: React.ReactNode
  variant?: "default" | "elevated"
  style?: ViewStyle | ViewStyle[]
}

export default function EvelvatedCard({
  children,
  variant = "default",
  style,
  ...props
}: CardProps) {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  const shadowPreset = variant === "elevated" ? "medium" : "small"
  const shadow = getShadowForTheme(isDark, shadowPreset)

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          ...shadow,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
  },
})
