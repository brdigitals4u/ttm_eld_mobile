/**
 * Orange DTC (Diagnostic Trouble Code) indicator icon
 * Shows count badge when active DTCs are present
 * Navigates to DTC history screen on press
 */

import React from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { AlertTriangle } from "lucide-react-native"

import { useObdData } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"

export const DtcIndicator: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { recentMalfunctions } = useObdData()

  // Count DTC codes (each record now contains one code, so count = records.length)
  // But we sum codes.length for backward compatibility
  const activeDtcCount = recentMalfunctions.reduce((count, record) => {
    return count + record.codes.length
  }, 0)

  const handlePress = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Navigate to DTC history screen
    router.push("/dtc-history" as any)
  }

  // Always show icon, but use different styling when no DTCs
  const hasActiveDtcs = activeDtcCount > 0
  const iconColor = hasActiveDtcs ? colors.warning : colors.textDim

  // Dynamic styles based on theme
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        badge: {
          alignItems: "center",
          backgroundColor: colors.warning,
          borderColor: colors.cardBackground,
          borderRadius: 10,
          borderWidth: 2,
          height: 20,
          justifyContent: "center",
          minWidth: 20,
          paddingHorizontal: 6,
          position: "absolute",
          right: -6,
          top: -6,
        },
        badgeText: {
          color: colors.cardBackground,
          fontSize: 11,
          fontWeight: "700",
          textAlign: "center",
        },
        container: {
          alignItems: "center",
          backgroundColor: hasActiveDtcs ? colors.palette.primary100 : colors.sectionBackground,
          borderRadius: 20,
          height: 44,
          justifyContent: "center",
          position: "relative",
          width: 44,
        },
        iconContainer: {
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        },
      }),
    [colors, hasActiveDtcs],
  )

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <AlertTriangle size={24} color={iconColor} strokeWidth={2} />
        {hasActiveDtcs && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{translate("dtc.badge" as any)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
