import { useMemo, useState, useEffect, useContext } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { XCircle, Bluetooth, Calendar, Clock, X } from "lucide-react-native"

import { Text } from "@/components/Text"
import {
  DEFAULT_DRIVER_NAME,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_USERNAME,
} from "@/constants/dashboard"
import { ObdDataContext } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { toast } from "@/components/Toast"
import { useAuth } from "@/stores/authStore"
import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { useAppTheme } from "@/theme/context"

/**
 * Driver Info Section Component - Compact Design
 * Maximizes space usage with icons and dense layout
 */
export const DriverInfoSection: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { user, driverProfile, organizationSettings, vehicleAssignment } = useAuth()
  const { activeTeam, updateTeamStatus, isLoading: isTeamLoading } = useDriverTeamStore()

  // Safely get OBD data context - use useContext directly to avoid throwing error
  const obdContext = useContext(ObdDataContext)
  const eldConnected = obdContext?.isConnected ?? false
  const eldVin = obdContext?.eldVin ?? null
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const driverName = useMemo(() => {
    return driverProfile?.name || translate("dashboard.driverName" as any) || DEFAULT_DRIVER_NAME
  }, [driverProfile])

  // Get effective driver info (re-computed when activeTeam changes)
  const effectiveDriverName = useMemo(() => {
    return useDriverTeamStore.getState().getEffectiveDriverName() || driverName
  }, [driverName, activeTeam])

  const isTeamActive = useMemo(() => {
    return useDriverTeamStore.getState().isTeamActive()
  }, [activeTeam])

  // Show co-driver name if team is active, otherwise show primary driver name
  const displayDriverName = effectiveDriverName
  // When team is active, show co-driver as active and primary driver as secondary
  // When team is inactive, show primary driver only
  const secondaryDriverName = isTeamActive && activeTeam?.codriver_name ? activeTeam.codriver_name : null
  const primaryDriverName = driverProfile?.legal_name || driverProfile?.name || driverName

  const handleDeactivateTeam = async () => {
    if (!activeTeam) return
    try {
      await updateTeamStatus(activeTeam.id, "inactive")
      toast.success(translate("driverTeam.updateSuccess" as any) || "Team deactivated successfully")
    } catch (error: any) {
      console.error("Failed to deactivate team:", error)
      toast.error(error?.message || "Failed to deactivate team")
    }
  }

  const organizationName = useMemo(() => {
    return (
      organizationSettings?.organization_name ||
      translate("dashboard.organization" as any) ||
      DEFAULT_ORGANIZATION_NAME
    )
  }, [organizationSettings])

  const driverUsername = useMemo(() => {
    return driverProfile?.username || user?.email || DEFAULT_USERNAME
  }, [driverProfile, user])

  const formattedDate = useMemo(() => {
    return currentDateTime.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }, [currentDateTime])

  const formattedTime = useMemo(() => {
    return currentDateTime.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }, [currentDateTime])

  const handleConnectPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/device-scan" as any)
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderWidth: 1,
          marginHorizontal: 20,
          marginTop: 20,
          padding: 12,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexWrap: "wrap",
        },
        titleContainer: {
          flex: 1,
        },
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
        },
        secondaryDriverName: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "500",
          marginTop: 2,
        },
        badgesContainer: {
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        },
        teamDeactivateButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: colors.error + "20",
        },
        eldBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        },
        eldBadgeConnected: {
          backgroundColor: colors.tint + "20",
        },
        eldBadgeDisconnected: {
          backgroundColor: colors.error + "20",
        },
        eldBadgeText: {
          fontSize: 11,
          fontWeight: "600",
        },
        grid: {
          gap: 12,
        },
        driverNameContainer: {
          marginBottom: 4,
        },
        driverName: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
        },
        detailsRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        },
        detailItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flex: 1,
          minWidth: "30%",
        },
        detailValue: {
          color: colors.text,
          fontSize: 12,
          fontWeight: "500",
          flexShrink: 1,
        },
      }),
    [colors],
  )

  const vin = useMemo(() => {
    return eldVin || vehicleAssignment?.vehicle_info?.vin || "N/A"
  }, [eldVin, vehicleAssignment])

  return (
    <View style={styles.container}>
      {/* Header with Title, ELD Status, and Team Deactivate */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {displayDriverName} {`(${driverUsername})`}
          </Text>
          {isTeamActive && secondaryDriverName && (
            <Text style={styles.secondaryDriverName}>
              {translate("driverTeam.primaryDriver" as any) || "Primary Driver"}: {primaryDriverName}
            </Text>
          )}
        </View>

        <View style={styles.badgesContainer}>
          {eldConnected ? (
            <View style={styles.eldBadge}>
              <Bluetooth size={12} color={colors.tint} />
              <Text style={[styles.eldBadgeText, { color: colors.tint }]}>
                {translate("dashboard.eldConnected" as any) || "Connected"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.eldBadge}
              onPress={handleConnectPress}
              activeOpacity={0.7}
            >
              <XCircle size={12} color={colors.error} />
              <Text style={styles.eldBadgeText}>
                {translate("dashboard.eldNotConnected" as any) || "Disconnected"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Team Deactivate Button */}
          {isTeamActive && activeTeam && (
            <TouchableOpacity
              style={styles.teamDeactivateButton}
              onPress={handleDeactivateTeam}
              disabled={isTeamLoading}
              activeOpacity={0.7}
            >
              <X size={12} color={colors.error} />
              <Text style={[styles.eldBadgeText, { color: colors.error }]}>
                {translate("driverTeam.deactivate" as any) || "Disconnect"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Grid */}
      <View style={styles.grid}>

        {/* Row: Organization, VIN, Date/Time */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailValue} numberOfLines={1}>{organizationName}</Text>
          </View>

          <View style={styles.detailItem}>
            <Calendar size={14} color={colors.textDim} />
            <Text style={styles.detailValue} numberOfLines={1}>{vin}</Text>
          </View>

          <View style={styles.detailItem}>
            <Clock size={14} color={colors.textDim} />
            <Text style={styles.detailValue} numberOfLines={1}>{formattedDate + " " + formattedTime}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}