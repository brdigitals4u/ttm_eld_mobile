import React, { useState } from "react"
import { Modal, StyleSheet, TextInput, View } from "react-native"

import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { DriverTeam } from "@/api/driver-teams"
import { useAppTheme } from "@/theme/context"

interface TeamStatusUpdateDialogProps {
  visible: boolean
  onClose: () => void
  team: DriverTeam
  onUpdate: (status: "active" | "inactive", reason?: string) => Promise<void>
}

export function TeamStatusUpdateDialog({
  visible,
  onClose,
  team,
  onUpdate,
}: TeamStatusUpdateDialogProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdate = async () => {
    setIsLoading(true)
    try {
      const newStatus = team.status === "active" ? "inactive" : "active"
      await onUpdate(newStatus, reason.trim() || undefined)
      setReason("")
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsLoading(false)
    }
  }

  const styles = StyleSheet.create({
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginBottom: 12,
      marginTop: -12,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 16,
    },
    modalButton: {
      flex: 1,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
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
      marginBottom: 8,
      textAlign: "center",
    },
    statusInfo: {
      backgroundColor: colors.sectionBackground,
      borderRadius: 8,
      marginBottom: 16,
      padding: 12,
    },
    statusText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
  })

  const newStatus = team.status === "active" ? "inactive" : "active"
  const actionText =
    newStatus === "active"
      ? translate("driverTeam.activate" as any) || "Activate Team"
      : translate("driverTeam.deactivate" as any) || "Deactivate Team"

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {translate("driverTeam.updateStatus" as any) || "Update Team Status"}
          </Text>

          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>
              {translate("driverTeam.currentStatus" as any) || "Current Status"}:{" "}
              <Text style={{ fontWeight: "700" }}>
                {team.status === "active"
                  ? translate("driverTeam.statusActive" as any) || "Active"
                  : translate("driverTeam.statusInactive" as any) || "Inactive"}
              </Text>
            </Text>
            <Text style={[styles.statusText, { marginTop: 4 }]}>
              {translate("driverTeam.newStatus" as any) || "New Status"}:{" "}
              <Text style={{ fontWeight: "700" }}>
                {newStatus === "active"
                  ? translate("driverTeam.statusActive" as any) || "Active"
                  : translate("driverTeam.statusInactive" as any) || "Inactive"}
              </Text>
            </Text>
          </View>

          <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 8 }}>
            {translate("driverTeam.reasonOptional" as any) ||
              "Reason (optional): Why are you changing the team status?"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={
              translate("driverTeam.reasonPlaceholder" as any) ||
              "e.g., End of shift, Starting new route..."
            }
            placeholderTextColor={colors.textDim}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.modalButtons}>
            <LoadingButton
              title={translate("common.cancel" as any) || "Cancel"}
              onPress={onClose}
              variant="outline"
              style={styles.modalButton}
              disabled={isLoading}
            />
            <LoadingButton
              title={actionText}
              onPress={handleUpdate}
              loading={isLoading}
              disabled={isLoading}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

