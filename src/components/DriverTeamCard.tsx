import { useState } from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { X, Users } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { useAppTheme } from "@/theme/context"

import { TeamStatusUpdateDialog } from "./TeamStatusUpdateDialog"

export function DriverTeamCard() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { activeTeam, updateTeamStatus, isLoading } = useDriverTeamStore()
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  if (!activeTeam) {
    return null
  }

  const handleStatusUpdate = async (status: "active" | "inactive", reason?: string) => {
    try {
      await updateTeamStatus(activeTeam.id, status, reason)
      toast.success(
        translate("driverTeam.updateSuccess" as any) || "Team status updated successfully",
      )
      setShowStatusDialog(false)
    } catch (error: any) {
      console.error("Failed to update team status:", error)
      // Check for concurrency error
      if (
        error?.response?.data?.error?.includes("logged in") ||
        error?.message?.includes("logged in")
      ) {
        toast.error(
          translate("driverTeam.concurrencyError" as any) ||
            "Cannot switch. Co-driver is currently logged in.",
        )
      } else {
        toast.error(error?.message || "Failed to update team status")
      }
    }
  }

  const handleDeactivate = () => {
    setShowStatusDialog(true)
  }

  const styles = StyleSheet.create({
    activeBadge: {
      backgroundColor: colors.success || "#10B981",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    activeBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    cardContent: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    deactivateButton: {
      padding: 8,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 8,
    },
    teamInfo: {
      flex: 1,
    },
    teamName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 4,
    },
    teamSubtext: {
      color: colors.textDim,
      fontSize: 14,
    },
    iconSpacing: {
      marginRight: 8,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginRight: 8,
    },
  })

  const cardStyle = {
    marginBottom: 16,
    marginHorizontal: 16,
  }

  return (
    <>
      <ElevatedCard style={cardStyle}>
        <View style={styles.header}>
          <Users size={20} color={colors.tint} style={styles.iconSpacing} />
          <Text style={styles.title}>
            {translate("driverTeam.activeTeam" as any) || "Active Team"}
          </Text>
          {activeTeam.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>
                {translate("driverTeam.statusActive" as any) || "ACTIVE"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>
              {translate("driverTeam.coDriver" as any) || "Co-Driver"}:{" "}
              {activeTeam.codriver_name || "Unknown"}
            </Text>
            {activeTeam.vehicle_name && (
              <Text style={styles.teamSubtext}>
                {translate("driverTeam.vehicle" as any) || "Vehicle"}: {activeTeam.vehicle_name}
              </Text>
            )}
            {activeTeam.primary_driver_name && (
              <Text style={styles.teamSubtext}>
                {translate("driverTeam.primaryDriver" as any) || "Primary Driver"}:{" "}
                {activeTeam.primary_driver_name}
              </Text>
            )}
          </View>
          {activeTeam.is_active && (
            <TouchableOpacity
              onPress={handleDeactivate}
              style={styles.deactivateButton}
              disabled={isLoading}
            >
              <X size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </ElevatedCard>

      <TeamStatusUpdateDialog
        visible={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        team={activeTeam}
        onUpdate={handleStatusUpdate}
      />
    </>
  )
}

