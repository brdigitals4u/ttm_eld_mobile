/**
 * Ride Overview Card Component
 *
 * Displays ride-related information and action buttons:
 * - Shipping No, Trailer No, Co Driver (disabled)
 * - Action buttons: View 7 days log, Vehicle Inspection, DOT inspection, Logout
 * - Supports dark/light themes and localization
 */

import { useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, Pressable } from "react-native"
import { router } from "expo-router"
import { FileCheck, BookOpen, LogOut, Truck, Package, User } from "lucide-react-native"

import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

interface RideOverviewCardProps {
  shippingNo?: string | null
  trailerNo?: string | null
  onViewLogs?: () => void
  onVehicleInspection?: () => void
  onDotInspection?: () => void
  onLogout?: () => void
}

export function RideOverviewCard({
  shippingNo,
  trailerNo,
  onViewLogs,
  onVehicleInspection,
  onDotInspection,
  onLogout,
}: RideOverviewCardProps) {
  // Get theme colors - supports both light and dark themes
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          elevation: 4,
          marginHorizontal: 16,
          marginVertical: 12,
          padding: 20,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        title: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 16,
        },
        // Two-column layout for info fields
        infoGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        },
        infoColumn: {
          flex: 1,
          minWidth: "45%",
        },
        infoRow: {
          marginBottom: 16,
        },
        infoLabel: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "500",
          marginBottom: 4,
        },
        infoValue: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
        },
        infoValueDisabled: {
          color: colors.textDim,
          fontSize: 16,
          fontWeight: "500",
        },
        // Action buttons section
        actionsSection: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          marginTop: 8,
          paddingTop: 16,
        },
        actionsTitle: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "600",
          marginBottom: 12,
        },
        actionButton: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 12,
          flexDirection: "row",
          marginBottom: 10,
          padding: 14,
        },
        actionButtonDisabled: {
          opacity: 0.5,
        },
        actionButtonIcon: {
          marginRight: 12,
        },
        actionButtonText: {
          color: colors.text,
          flex: 1,
          fontSize: 14,
          fontWeight: "600",
        },
        actionButtonTextDisabled: {
          color: colors.textDim,
        },
        logoutButton: {
          alignItems: "center",
          backgroundColor: colors.errorBackground,
          borderRadius: 12,
          flexDirection: "row",
          marginTop: 8,
          padding: 14,
        },
        logoutButtonText: {
          color: colors.error,
          flex: 1,
          fontSize: 14,
          fontWeight: "600",
        },
      }),
    [colors],
  )

  const handleViewLogs = () => {
    if (onViewLogs) {
      onViewLogs()
    } else {
      router.push("/(tabs)/logs")
    }
  }

  const handleVehicleInspection = () => {
    if (onVehicleInspection) {
      onVehicleInspection()
    } else {
      router.push("/(tabs)/dvir")
    }
  }

  const handleDotInspection = () => {
    if (onDotInspection) {
      onDotInspection()
    } else {
      router.push("/logs/transfer")
    }
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {translate("rideOverview.title" as any) || "Ride Overview"}
      </Text>

      {/* Info Grid - Two Column Layout */}
      <View style={styles.infoGrid}>
        {/* Left Column */}
        <View style={styles.infoColumn}>
          {/* Shipping No */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {translate("rideOverview.shippingNo" as any) || "Shipping No"}
            </Text>
            <Text style={styles.infoValue}>
              {shippingNo || "—"}
            </Text>
          </View>

          {/* Trailer No */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {translate("rideOverview.trailerNo" as any) || "Trailer No"}
            </Text>
            <Text style={styles.infoValue}>
              {trailerNo || "—"}
            </Text>
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.infoColumn}>
          {/* Co Driver - Disabled */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {translate("rideOverview.coDriver" as any) || "Co Driver"}
            </Text>
            <Text style={styles.infoValueDisabled}>
              {translate("rideOverview.notAssigned" as any) || "Not Assigned"}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsTitle}>
          {translate("rideOverview.actions" as any) || "Actions"}
        </Text>

        {/* View 7 days log */}
        <TouchableOpacity style={styles.actionButton} onPress={handleViewLogs}>
          <BookOpen
            size={20}
            color={colors.tint}
            style={styles.actionButtonIcon}
          />
          <Text style={styles.actionButtonText}>
            {translate("rideOverview.view7DaysLog" as any) || "View 7 days log"}
          </Text>
        </TouchableOpacity>

        {/* Vehicle Inspection */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            console.log("Vehicle Inspection Pressable pressed")
            handleVehicleInspection()
          }}
        >
          <FileCheck
            size={20}
            color={colors.tint}
            style={styles.actionButtonIcon}
          />
          <Text style={styles.actionButtonText}>
            {translate("rideOverview.vehicleInspection" as any) ||
              "Vehicle Inspection"}
          </Text>
        </Pressable>

        {/* DOT inspection */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDotInspection}
        >
          <FileCheck
            size={20}
            color={colors.tint}
            style={styles.actionButtonIcon}
          />
          <Text style={styles.actionButtonText}>
            {translate("rideOverview.dotInspection" as any) || "DOT Inspection"}
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut
            size={20}
            color={colors.error}
            style={styles.actionButtonIcon}
          />
          <Text style={styles.logoutButtonText}>
            {translate("rideOverview.logout" as any) || "Logout"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

