import { useCallback, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native"
import * as Haptics from "expo-haptics"
import { Truck, Briefcase, MapPin, Bed, User, Navigation } from "lucide-react-native"

import { Text } from "@/components/Text"
import { STATUS_ORDER } from "@/constants/dashboard"
import { useHOSCurrentStatus } from "@/api/driver-hooks"
import { useStatusStore } from "@/stores/statusStore"
import { useAppTheme } from "@/theme/context"
import { DriverStatus } from "@/types/status"
import { mapDriverStatusToAppStatus } from "@/utils/hos-status-mapper"

// Status configuration with icons
type StatusConfigEntry = {
  label: string
  shortCode: string
  fullName: string
  icon: typeof Truck
}

// STATUS_ORDER imported from constants

interface StatusIconsRowProps {
  onStatusChange?: (status: DriverStatus) => void
  onStatusPress?: (status: DriverStatus) => void
  disabled?: boolean
}

/**
 * Status Icons Row Component
 *
 * Visual-first design matching screenshot:
 * - Circular buttons with icons and labels
 * - Active state: Blue background + white icon (like "On Duty")
 * - Inactive state: Gray icon + gray text
 * - Large touch targets (48-56px)
 * - One-tap status change with haptic feedback
 * - Undo snackbar for 5 seconds
 */
export const StatusIconsRow: React.FC<StatusIconsRowProps> = ({
  onStatusChange,
  onStatusPress,
  disabled = false,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { width: screenWidth } = useWindowDimensions()

  // HOS status
  const { data: hosStatus } = useHOSCurrentStatus({
    enabled: true,
    refetchInterval: 30000,
  })

  const { currentStatus } = useStatusStore()

  // Remove undo snackbar and optimistic update state - no longer needed

  // Status configuration with short codes and full names
  const STATUS_CONFIG: Record<DriverStatus, StatusConfigEntry> = useMemo(
    () => ({
      offDuty: {
        label: "Off Duty",
        shortCode: "OFF",
        fullName: "Off Duty",
        icon: MapPin,
      },
      onDuty: {
        label: "On Duty",
        shortCode: "ON",
        fullName: "On Duty",
        icon: Briefcase,
      },
      sleeperBerth: {
        label: "Sleeper Berth",
        shortCode: "SB",
        fullName: "Sleeper Berth",
        icon: Bed,
      },
      driving: {
        label: "Driving",
        shortCode: "D",
        fullName: "Drive",
        icon: Truck,
      },
      personalConveyance: {
        label: "Personal Conveyance",
        shortCode: "PC",
        fullName: "Personal Use",
        icon: User,
      },
      yardMove: {
        label: "Yard Move",
        shortCode: "YM",
        fullName: "Yard Move",
        icon: Navigation,
      },
      sleeping: {
        label: "Sleeper",
        shortCode: "SB",
        fullName: "Sleeper Berth",
        icon: Bed,
      },
    }),
    [],
  )

  // Get current display status
  const displayStatus = useMemo(() => {
    if (currentStatus) return currentStatus
    if (hosStatus?.current_status) {
      return mapDriverStatusToAppStatus(hosStatus.current_status)
    }
    return "offDuty"
  }, [currentStatus, hosStatus])

  // Handle status button press - open modal instead of updating immediately
  const handleStatusPress = useCallback(
    (status: DriverStatus) => {
      if (disabled) return

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Call callback to open modal in UnifiedHOSCard
      onStatusPress?.(status)
      onStatusChange?.(status)
    },
    [disabled, onStatusPress, onStatusChange],
  )

  // Remove undo handler - no longer needed

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginHorizontal: 20,
          marginTop: 20,
        },
        statusButton: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          flex: 1,
          justifyContent: "center",
          minHeight: 80,
          paddingHorizontal: 8,
          paddingVertical: 12,
          position: "relative",
        },
        statusButtonActive: {
          borderColor: colors.text,
          borderWidth: 2,
        },
        statusButtonDisabled: {
          opacity: 0.5,
        },
        statusButtonDot: {
          backgroundColor: colors.text,
          borderRadius: 4,
          height: 8,
          position: "absolute",
          right: 8,
          top: 8,
          width: 8,
        },
        statusShortCode: {
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 4,
        },
        statusFullName: {
          fontSize: 11,
          fontWeight: "500",
          textAlign: "center",
        },
        statusRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "space-between",
          width: "100%",
        },
      }),
    [colors, screenWidth],
  )

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const isActive =
            displayStatus === status || (status === "sleeperBerth" && displayStatus === "sleeping")

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                isActive && styles.statusButtonActive,
                disabled && styles.statusButtonDisabled,
              ]}
              onPress={() => handleStatusPress(status)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.statusButtonDot} />}
              <Text
                style={[
                  styles.statusShortCode,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {config.shortCode}
              </Text>
              <Text
                style={[
                  styles.statusFullName,
                  {
                    color: colors.text,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {config.fullName}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
