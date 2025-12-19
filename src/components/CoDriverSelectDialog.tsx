import React, { useState, useEffect } from "react"
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from "react-native"
import { Check } from "lucide-react-native"

import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useDrivers } from "@/api/drivers"
import { useCoDriverStore } from "@/stores/codriverStore"
import { useAuthStore } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

interface CoDriverSelectDialogProps {
  visible: boolean
  onClose: () => void
}

export function CoDriverSelectDialog({ visible, onClose }: CoDriverSelectDialogProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { driverProfile } = useAuthStore()
  const { activeAssignment, createAssignment, isLoading } = useCoDriverStore()
  const { data: drivers, isLoading: isDriversLoading } = useDrivers({ enabled: visible })

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedDriverId(null)
    }
  }, [visible])

  // Filter out current driver from the list
  const availableDrivers = drivers?.filter((driver) => driver.id !== driverProfile?.driver_id) || []

  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId)
  }

  const handleSubmit = async () => {
    if (!selectedDriverId) {
      toast.warning(translate("codriver.selectCoDriver" as any) || "Please select a co-driver")
      return
    }

    try {
      await createAssignment(selectedDriverId)
      toast.success(
        translate("codriver.createSuccess" as any) || "Co-driver assigned successfully",
      )
      onClose()
    } catch (error: any) {
      console.error("Failed to assign co-driver:", error)
      toast.error(error?.message || "Failed to assign co-driver")
    }
  }

  const handleDeactivate = async () => {
    if (!activeAssignment) return

    try {
      await useCoDriverStore.getState().removeAssignment(activeAssignment.id)
      toast.success(
        translate("codriver.removeSuccess" as any) || "Co-driver assignment removed",
      )
      onClose()
    } catch (error: any) {
      console.error("Failed to remove co-driver assignment:", error)
      toast.error(error?.message || "Failed to remove co-driver assignment")
    }
  }

  const renderDriverItem = ({ item }: { item: any }) => {
    const isSelected = selectedDriverId === item.id
    const isActive = activeAssignment?.codriver_id === item.id

    return (
      <TouchableOpacity
        style={[
          styles.driverItem,
          isSelected && { backgroundColor: colors.tint + "20", borderColor: colors.tint },
          isActive && { backgroundColor: colors.success + "20", borderColor: colors.success },
        ]}
        onPress={() => handleSelectDriver(item.id)}
        disabled={isActive}
      >
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.driver_name || item.driver_email}</Text>
          {item.company_driver_id && (
            <Text style={styles.driverId}>ID: {item.company_driver_id}</Text>
          )}
        </View>
        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.activeBadgeText}>
              {translate("codriver.currentlyActive" as any) || "ACTIVE"}
            </Text>
          </View>
        )}
        {isSelected && !isActive && (
          <Check size={24} color={colors.tint} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    )
  }

  const styles = StyleSheet.create({
    activeBadge: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    activeBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    checkIcon: {
      marginLeft: 8,
    },
    driverId: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 4,
    },
    driverInfo: {
      flex: 1,
    },
    driverItem: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 2,
      flexDirection: "row",
      marginBottom: 12,
      padding: 16,
    },
    driverName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 14,
      padding: 32,
      textAlign: "center",
    },
    listContainer: {
      maxHeight: 400,
    },
    modalButton: {
      flex: 1,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: "80%",
      maxWidth: 400,
      padding: 24,
      width: "100%",
    },
    modalOverlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 24,
      textAlign: "center",
    },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {translate("codriver.selectCoDriver" as any) || "Select Co-Driver"}
          </Text>

          {activeAssignment && (
            <View
              style={{
                backgroundColor: colors.warning + "20",
                borderRadius: 8,
                marginBottom: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
                {translate("codriver.activeCoDriver" as any) || "Active Co-Driver"}:{" "}
                {activeAssignment.codriver_name}
              </Text>
            </View>
          )}

          {isDriversLoading ? (
            <Text style={styles.emptyText}>Loading drivers...</Text>
          ) : availableDrivers.length === 0 ? (
            <Text style={styles.emptyText}>
              {translate("codriver.noCoDriver" as any) || "No drivers available"}
            </Text>
          ) : (
            <FlatList
              data={availableDrivers}
              renderItem={renderDriverItem}
              keyExtractor={(item) => item.id}
              style={styles.listContainer}
              showsVerticalScrollIndicator={true}
            />
          )}

          <View style={styles.modalButtons}>
            <LoadingButton
              title={translate("common.cancel" as any) || "Cancel"}
              onPress={onClose}
              variant="outline"
              style={styles.modalButton}
              disabled={isLoading}
            />
            {activeAssignment ? (
              <LoadingButton
                title={translate("codriver.deactivate" as any) || "Deactivate"}
                onPress={handleDeactivate}
                loading={isLoading}
                disabled={isLoading}
                variant="outline"
                style={styles.modalButton}
              />
            ) : (
              <LoadingButton
                title={translate("codriver.activate" as any) || "Activate"}
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading || !selectedDriverId}
                style={styles.modalButton}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

