import React, { useState, useEffect } from "react"
import { Modal, StyleSheet, TextInput, View } from "react-native"
import { z } from "zod"

import { CreateContactRequest } from "@/api/contacts"
import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useShipperStore } from "@/stores/shipperStore"
import { useAppTheme } from "@/theme/context"

interface AddShipperDialogProps {
  visible: boolean
  onClose: () => void
  existingShipperId?: string // If provided, will activate existing shipper instead of creating new
}

const ShipperFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
})

export function AddShipperDialog({ visible, onClose, existingShipperId }: AddShipperDialogProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { organizationSettings } = useAuth()
  const { createShipper, updateShipper, isLoading } = useShipperStore()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill company name from organization settings
  useEffect(() => {
    if (organizationSettings?.organization_name && !companyName) {
      setCompanyName(organizationSettings.organization_name)
    }
  }, [organizationSettings, companyName])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!visible) {
      setFirstName("")
      setLastName("")
      setCompanyName(organizationSettings?.organization_name || "")
      setErrors({})
    }
  }, [visible, organizationSettings])

  const validateForm = (): boolean => {
    try {
      ShipperFormSchema.parse({
        first_name: firstName.trim(),
      })
      setErrors({})
      return true
    } catch (error) {
      console.log(error)
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
      toast.warning("Please fill in all required fields")
      return
    }

    try {
      if (existingShipperId) {
        // Activate existing shipper
        await updateShipper(existingShipperId, {
          is_active: true,
          contact_type: "CUSTOMER",
        })
        toast.success(
          translate("shippers.updateSuccess" as any) || "Shipper activated successfully",
        )
      } else {
        // Create new shipper
        const data: CreateContactRequest = {
          first_name: firstName.trim(),
          last_name: ".",
          company_name: organizationSettings?.organization_id.trim() || undefined,
          contact_type: "CUSTOMER",
          is_active: true,
        }

        await createShipper(data)
        toast.success(translate("shippers.createSuccess" as any) || "Shipper created successfully")
      }

      onClose()
    } catch (error: any) {
      console.error("Failed to save shipper:", error)
      toast.error(error?.message || "Failed to save shipper")
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
            {existingShipperId
              ? translate("shippers.activateShipper" as any) || "Activate Shipper"
              : translate("shippers.addShipper" as any) || "Add Shipper"}
          </Text>

          <TextInput
            style={[styles.input, errors.first_name && styles.inputError]}
            placeholder={translate("shippers.firstName" as any) || "First Name"}
            placeholderTextColor={colors.textDim}
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text)
              if (errors.first_name) {
                setErrors({ ...errors, first_name: "" })
              }
            }}
            editable={!existingShipperId}
            autoCapitalize="words"
          />
          {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}

          <TextInput
            style={styles.input}
            placeholder={translate("shippers.companyName" as any) || "Company Name (optional)"}
            placeholderTextColor={colors.textDim}
            value={companyName}
            autoCapitalize="words"
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
              title={
                existingShipperId
                  ? translate("shippers.activate" as any) || "Activate"
                  : translate("common.add" as any) || "Add"
              }
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
