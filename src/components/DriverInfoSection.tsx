import { useMemo, useState, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, Image } from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { XCircle, Bluetooth, Calendar, MapPin, Navigation, Clock } from "lucide-react-native"

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
          gap: 8,
        },
        row: {
          flexDirection: "row",
          gap: 8,
        },
        infoCard: {
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        infoCardRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        },
        iconContainer: {
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        label: {
          color: colors.textDim,
          fontSize: 10,
          fontWeight: "500",
          marginBottom: 2,
        },
        value: {
          color: colors.text,
          fontSize: 13,
          fontWeight: "600",
        },
        fullWidthCard: {
          backgroundColor: colors.background,
          borderRadius: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        timeSection: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flex: 1,
        },
        dateSection: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flex: 1,
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
          {translate("dashboard.driverInfo" as any) || "Driver Info"}
        </Text>
        
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
      </View>

      {/* Content Grid */}
      <View style={styles.grid}>
        {/* Row 1: Driver Name and Organization */}
        <View style={styles.row}>
          <View style={styles.infoCard}>
            <Text style={[styles.value, { color: colors.text, fontSize: 12 }]}>{driverName} {`(${driverUsername})`}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.value} numberOfLines={1}>{organizationName}</Text>
          </View>
        </View>

        {/* Row 2: Username */}


        {/* Row 3: Date and Time */}
        <View style={styles.fullWidthCard}>
          <View style={styles.dateSection}>
            <Calendar size={16} color={colors.textDim} />
            <View>
              <Text style={styles.value}>{vin}</Text>
            </View>
          </View>

          <View style={styles.timeSection}>
            <Clock size={16} color={colors.textDim} />
            <View>
              <Text style={styles.value}>{formattedDate + " " + formattedTime}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}