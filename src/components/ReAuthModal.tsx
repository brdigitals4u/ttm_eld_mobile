/**
 * Re-Authentication Modal Component
 *
 * Prompts user to re-authenticate before sensitive operations (USB transfer, etc.)
 * Required for ELD compliance when exporting driver files
 */

import React, { useState, useRef, useEffect, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, TextInput, Platform } from "react-native"
import * as Haptics from "expo-haptics"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { Lock, X, AlertCircle } from "lucide-react-native"

import { apiClient } from "@/api/client"
import { API_ENDPOINTS } from "@/api/constants"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { colors } from "@/theme/colors"

import { Text } from "./Text"

export interface ReAuthModalProps {
  visible: boolean
  onSuccess: () => void
  onCancel: () => void
  title?: string
  message?: string
  operation?: string // e.g., "USB Transfer", "Export Driver File"
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title: titleProp,
  message: messageProp,
  operation: operationProp,
}) => {
  const title = titleProp || translate("eld.reauth.title" as any)
  const message = messageProp || translate("eld.reauth.message" as any)
  const operation =
    operationProp || translate("eld.reauth.operation" as any, { operation: "this operation" })
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [password, setPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, driverProfile } = useAuth()

  const snapPoints = useMemo(() => ["50%"], [])

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }

      // Show modal
      setTimeout(() => {
        bottomSheetRef.current?.present()
      }, 100)
    } else {
      bottomSheetRef.current?.dismiss()
      // Reset state when hidden
      setPassword("")
      setError(null)
      setIsVerifying(false)
    }
  }, [visible])

  const handleVerify = async () => {
    if (!password.trim()) {
      setError(translate("eld.reauth.enterPassword" as any))
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      // Verify password by attempting to authenticate
      // This would typically call a re-auth endpoint
      const email = user?.email || driverProfile?.email

      if (!email) {
        throw new Error(translate("eld.reauth.userEmailNotFound" as any))
      }

      // Call re-authentication endpoint
      // Note: This endpoint should verify password without creating a new session
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        API_ENDPOINTS.AUTH?.REAUTH || "/api/auth/reauthenticate",
        {
          email,
          password,
        },
      )

      if (response.success) {
        // Success - trigger haptic feedback
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        // Clear password
        setPassword("")
        setError(null)

        // Call success callback
        onSuccess()
      } else {
        throw new Error(response.message || translate("eld.reauth.authenticationFailed" as any))
      }
    } catch (err: any) {
      console.error("Re-authentication failed:", err)
      setError(err?.message || translate("eld.reauth.invalidPassword" as any))

      // Haptic feedback for error
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCancel = () => {
    setPassword("")
    setError(null)
    onCancel()
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="none" // Cannot dismiss by tapping backdrop
      opacity={0.8}
    />
  )

  if (!visible) {
    return null
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={false} // Cannot dismiss by dragging
      enableDismissOnClose={false}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Lock size={48} color={colors.tint} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Operation Info */}
        <View style={styles.operationBox}>
          <AlertCircle size={16} color={colors.light?.textSecondary || colors.text} />
          <Text style={styles.operationText}>
            {translate("eld.reauth.operation" as any, { operation })}
          </Text>
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{translate("eld.reauth.password" as any)}</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              setError(null) // Clear error when typing
            }}
            placeholder={translate("eld.reauth.passwordPlaceholder" as any)}
            placeholderTextColor={colors.light?.textSecondary || colors.text}
            secureTextEntry
            autoFocus
            editable={!isVerifying}
            onSubmitEditing={handleVerify}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isVerifying}
          >
            <X size={20} color={colors.text} />
            <Text style={styles.cancelButtonText}>{translate("common.cancel" as any)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.verifyButton,
              (!password.trim() || isVerifying) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!password.trim() || isVerifying}
          >
            <Lock size={20} color="#FFFFFF" />
            <Text style={styles.verifyButtonText}>
              {isVerifying
                ? translate("eld.reauth.verifying" as any)
                : translate("eld.reauth.verify" as any)}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    alignItems: "center",
    flex: 1,
    padding: 24,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  iconContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 24,
    width: "100%",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  message: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center",
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  operationBox: {
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    padding: 12,
  },
  operationText: {
    color: colors.light?.textSecondary || colors.text,
    flex: 1,
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  verifyButton: {
    backgroundColor: colors.tint,
  },
  verifyButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
