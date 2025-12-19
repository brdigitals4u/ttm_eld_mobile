import React from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { X } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useCoDriverStore } from "@/stores/codriverStore"
import { useAppTheme } from "@/theme/context"

export function CoDriverCard() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { activeAssignment, removeAssignment, isLoading } = useCoDriverStore()

  if (!activeAssignment) {
    return null
  }

  const handleDeactivate = async () => {
    try {
      await removeAssignment(activeAssignment.id)
      toast.success(
        translate("codriver.removeSuccess" as any) || "Co-driver assignment removed",
      )
    } catch (error: any) {
      console.error("Failed to remove co-driver assignment:", error)
      toast.error(error?.message || "Failed to remove co-driver assignment")
    }
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    coDriverInfo: {
      flex: 1,
    },
    coDriverName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 4,
    },
    coDriverSubtext: {
      color: colors.textDim,
      fontSize: 14,
    },
    deactivateButton: {
      padding: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      marginRight: 8,
    },
  })

  return (
    <ElevatedCard style={{ marginBottom: 16 }}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {translate("codriver.activeCoDriver" as any) || "Active Co-Driver"}
        </Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>
            {translate("codriver.currentlyActive" as any) || "ACTIVE"}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.coDriverInfo}>
          <Text style={styles.coDriverName}>
            {activeAssignment.codriver_name || "Unknown Co-Driver"}
          </Text>
          {activeAssignment.vehicle_name && (
            <Text style={styles.coDriverSubtext}>
              Vehicle: {activeAssignment.vehicle_name}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleDeactivate}
          style={styles.deactivateButton}
          disabled={isLoading}
        >
          <X size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </ElevatedCard>
  )
}

