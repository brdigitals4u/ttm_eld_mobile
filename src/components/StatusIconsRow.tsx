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
  icon: typeof Truck
  color: string
  bgColor: string
  textColor: string
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

  // Status configuration with icons and labels
  const STATUS_CONFIG: Record<DriverStatus, StatusConfigEntry> = useMemo(
    () => ({
      driving: {
        label: "Driving",
        icon: Truck,
        color: colors.success,
        bgColor: colors.successBackground,
        textColor: colors.success,
      },
      onDuty: {
        label: "On Duty",
        icon: Briefcase,
        color: colors.tint,
        bgColor: `${colors.tint}20`,
        textColor: colors.buttonPrimaryText,
      },
      offDuty: {
        label: "Off Duty",
        icon: MapPin,
        color: colors.textDim,
        bgColor: "transparent",
        textColor: colors.textDim,
      },
      sleeperBerth: {
        label: "Sleeper",
        icon: Bed,
        color: colors.textDim,
        bgColor: "transparent",
        textColor: colors.textDim,
      },
      sleeping: {
        label: "Sleeper",
        icon: Bed,
        color: colors.textDim,
        bgColor: "transparent",
        textColor: colors.textDim,
      },
      personalConveyance: {
        label: "PC",
        icon: User,
        color: colors.textDim,
        bgColor: "transparent",
        textColor: colors.textDim,
      },
      yardMove: {
        label: "YM",
        icon: Navigation,
        color: colors.textDim,
        bgColor: "transparent",
        textColor: colors.textDim,
      },
    }),
    [colors],
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
          borderColor: colors.PRIMARY,
          borderRadius: 35,
          borderWidth: 2,
          height: 70,
          justifyContent: "center",
          paddingHorizontal: 8,
          paddingVertical: 8,
          width: screenWidth < 600 ? (screenWidth - 64) / 3 : 70,
        },
        statusButtonActive: {
          backgroundColor: colors.tint,
          borderColor: colors.textDim,
        },
        statusButtonDisabled: {
          opacity: 0.5,
        },
        statusButtonInactive: {
          backgroundColor: colors.transparent,
          borderColor: colors.text,
        },
        statusIcon: {
          marginBottom: 4,
        },
        statusLabel: {
          fontSize: 11,
          fontWeight: "600",
          textAlign: "center",
        },
        statusRow: {
          flexDirection: "row",
          flexWrap: screenWidth < 600 ? "wrap" : "nowrap",
          gap: 12,
          justifyContent: "space-between",
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
          const IconComponent = config.icon

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                isActive ? styles.statusButtonActive : styles.statusButtonInactive,
                disabled && styles.statusButtonDisabled,
              ]}
              onPress={() => handleStatusPress(status)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <IconComponent
                size={20}
                color={isActive ? colors.buttonPrimaryText : colors.text}
                style={styles.statusIcon}
              />
              <Text
                style={[
                  styles.statusLabel,
                  {
                    color: isActive ? colors.buttonPrimaryText : colors.text,
                    fontWeight: (isActive ? "700" : "500") as "700" | "500",
                  },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
