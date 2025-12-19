import React, { useState } from "react"
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native"
import { Plus, X } from "lucide-react-native"

import { Text } from "@/components/Text"
import ElevatedCard from "@/components/EvevatedCard"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import { useTrailerStore } from "@/stores/trailerStore"
import { TrailerAssignment } from "@/api/trailers"
import { toast } from "@/components/Toast"
import { AddTrailerDialog } from "./AddTrailerDialog"

interface TrailerListProps {
  onTrailerSelect?: (assignment: TrailerAssignment) => void
}

export function TrailerList({ onTrailerSelect }: TrailerListProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { assignments, updateAssignment, removeAssignment, isLoading } = useTrailerStore()
  const [showAddDialog, setShowAddDialog] = useState(false)

  const handleToggleActive = async (assignment: TrailerAssignment) => {
    try {
      await updateAssignment(assignment.id, {
        status: assignment.status === "active" ? "inactive" : "active",
      })
      toast.success(
        assignment.status === "active"
          ? translate("trailers.deactivated" as any) || "Trailer deactivated"
          : translate("trailers.activated" as any) || "Trailer activated",
      )
    } catch (error: any) {
      console.error("Failed to update trailer assignment:", error)
      toast.error(error?.message || "Failed to update trailer assignment")
    }
  }

  const handleRemove = async (assignment: TrailerAssignment) => {
    try {
      await removeAssignment(assignment.id)
      toast.success(
        translate("trailers.removeSuccess" as any) || "Trailer assignment removed successfully",
      )
    } catch (error: any) {
      console.error("Failed to remove trailer assignment:", error)
      toast.error(error?.message || "Failed to remove trailer assignment")
    }
  }

  const handleAddNew = () => {
    setShowAddDialog(true)
  }

  const styles = StyleSheet.create({
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    addButton: {
      alignItems: "center",
      borderRadius: 8,
      borderStyle: "dashed",
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 8,
      padding: 16,
      borderColor: colors.tint,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 8,
      color: colors.tint,
    },
    emptyText: {
      fontSize: 14,
      padding: 16,
      textAlign: "center",
      color: colors.textDim,
    },
    itemCard: {
      marginBottom: 12,
    },
    itemRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    itemDetails: {
      fontSize: 14,
      color: colors.textDim,
    },
    statusBadge: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 12,
    },
    statusBadgeActive: {
      backgroundColor: colors.success || "#10B981",
    },
    statusBadgeInactive: {
      backgroundColor: colors.textDim,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    removeButton: {
      padding: 8,
      marginLeft: 8,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
  })

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {translate("trailers.title" as any) || "Trailers"}
        </Text>
        <TouchableOpacity onPress={handleAddNew} style={{ padding: 4 }}>
          <Text style={{ color: colors.tint, fontSize: 16, fontWeight: "600" }}>
            {translate("trailers.addTrailer" as any) || "Add Trailer"}
          </Text>
        </TouchableOpacity>
      </View>

      {assignments.length === 0 ? (
        <Text style={styles.emptyText}>
          {translate("trailers.noTrailers" as any) || "No trailers available"}
        </Text>
      ) : (
        assignments.map((assignment) => (
          <ElevatedCard key={assignment.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      assignment.status === "active"
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {assignment.status === "active"
                        ? translate("trailers.active" as any) || "Active"
                        : translate("trailers.inactive" as any) || "Inactive"}
                    </Text>
                  </View>
                  <Text style={styles.itemName}>
                    {assignment.trailer_name || 'Trailer'}
                  </Text>
                </View>
                {assignment.is_primary && (
                  <Text style={styles.itemDetails}>
                    {translate("trailers.primary" as any) || "Primary"}
                  </Text>
                )}
              </View>
              <View style={styles.controlsRow}>
                <Switch
                  value={assignment.status === "active"}
                  onValueChange={() => handleToggleActive(assignment)}
                  disabled={isLoading}
                  trackColor={{ false: colors.border, true: colors.tint }}
                  thumbColor={assignment.status === "active" ? "#FFFFFF" : colors.textDim}
                />
                <TouchableOpacity
                  onPress={() => handleRemove(assignment)}
                  style={styles.removeButton}
                >
                  <X size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </ElevatedCard>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
        <Plus size={20} color={colors.tint} />
        <Text style={styles.addButtonText}>
          {translate("trailers.addTrailer" as any) || "Add Trailer"}
        </Text>
      </TouchableOpacity>

      <AddTrailerDialog visible={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </View>
  )
}

