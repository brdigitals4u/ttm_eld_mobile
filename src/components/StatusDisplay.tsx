import React, { useMemo } from "react"
import { View, StyleSheet } from "react-native"

import { Text } from "@/components/Text"
import { useCurrentStatus, useHoursOfService, useStatusActions } from "@/stores/statusStore"
import { useAppTheme } from "@/theme/context"

/**
 * Example component showing how to use Zustand store directly for real-time synchronization
 * This component will automatically update when status changes anywhere in the app
 */
export const StatusDisplay: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors } = theme

  // Direct access to Zustand store state - automatically re-renders on changes
  const currentStatus = useCurrentStatus()
  const hoursOfService = useHoursOfService()
  const { formatDuration } = useStatusActions()

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.sectionBackground,
          borderRadius: 8,
          margin: 8,
          padding: 16,
        },
        hosContainer: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        label: {
          flex: 1,
          fontSize: 14,
        },
        title: {
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 12,
          textAlign: "center",
        },
        value: {
          fontSize: 14,
          fontWeight: "600",
        },
      }),
    [colors],
  )

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Current Status: {currentStatus.toUpperCase()}
      </Text>

      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>Driving Time Remaining:</Text>
        <Text
          style={[
            styles.value,
            {
              color: hoursOfService.driveTimeRemaining < 60 ? colors.error : colors.text,
            },
          ]}
        >
          {formatDuration(hoursOfService.driveTimeRemaining)}
        </Text>
      </View>

      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>Shift Time Remaining:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatDuration(hoursOfService.shiftTimeRemaining)}
        </Text>
      </View>

      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>Cycle Time Remaining:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatDuration(hoursOfService.cycleTimeRemaining)}
        </Text>
      </View>
    </View>
  )
}

export default StatusDisplay
