import React, { useState, useEffect } from "react"
import { Modal, StyleSheet, TextInput, View } from "react-native"
import { z } from "zod"

import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useTrailerStore } from "@/stores/trailerStore"
import { useAppTheme } from "@/theme/context"

interface AddTrailerDialogProps {
  visible: boolean
  onClose: () => void
}

const TrailerFormSchema = z.object({
  name: z.string().min(1, "Trailer name is required"),
})

export function AddTrailerDialog({ visible, onClose }: AddTrailerDialogProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { createAndAssignTrailer, isLoading } = useTrailerStore()

  const [name, setName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!visible) {
      setName("")
      setErrors({})
    }
  }, [visible])

  const validateForm = (): boolean => {
    try {
      TrailerFormSchema.parse({
        name: name.trim(),
      })
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.warning("Please enter a trailer name")
      return
    }

    try {
      await createAndAssignTrailer(name.trim())
      toast.success(
        translate("trailers.createSuccess" as any) || "Trailer created and assigned successfully",
      )
      onClose()
    } catch (error: any) {
      console.error("Failed to create and assign trailer:", error)
      toast.error(error?.message || "Failed to create and assign trailer")
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
    inputError: {
      borderColor: colors.error,
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
      marginBottom: 24,
      textAlign: "center",
    },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {translate("trailers.addTrailer" as any) || "Add Trailer"}
          </Text>

          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder={translate("trailers.name" as any) || "Trailer Name"}
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={(text) => {
              setName(text)
              if (errors.name) {
                setErrors({ ...errors, name: "" })
              }
            }}
            autoCapitalize="words"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 16 }}>
            {translate("trailers.assetId" as any) || "Asset ID"} will be auto-generated
          </Text>

          <View style={styles.modalButtons}>
            <LoadingButton
              title={translate("common.cancel" as any) || "Cancel"}
              onPress={onClose}
              variant="outline"
              style={styles.modalButton}
              disabled={isLoading}
            />
            <LoadingButton
              title={translate("common.add" as any) || "Add"}
              onPress={handleSubmit}
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

