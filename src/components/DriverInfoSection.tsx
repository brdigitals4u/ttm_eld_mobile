import { useMemo, useState, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { XCircle, Bluetooth, Calendar, Clock } from "lucide-react-native"

import { Text } from "@/components/Text"
import {
  DEFAULT_DRIVER_NAME,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_USERNAME,
} from "@/constants/dashboard"
import { useObdData } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

/**
 * Driver Info Section Component - Compact Design
 * Maximizes space usage with icons and dense layout
 */
export const DriverInfoSection: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors } = theme
   const { user, driverProfile, organizationSettings, vehicleAssignment } = useAuth()
  const { isConnected: eldConnected, eldVin } = useObdData()
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
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
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
      {/* Header with Title and ELD Status */}
      <View style={styles.header}>
        <Text style={styles.title}>
        {driverName} {`(${driverUsername})`}
        </Text>
        
        {!eldConnected ? (
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