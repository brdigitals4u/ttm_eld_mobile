import React, { useState, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, Modal, Pressable } from "react-native"
import { LogOut } from "lucide-react-native"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"

import { Text } from "@/components/Text"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { translate } from "@/i18n/translate"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * Floating Logout Button Component
 * 
 * Fixed position at bottom of screen (above tab bar)
 * Shows confirmation dialog before logout
 * Theme-aware styling
 */
export const FloatingLogoutButton: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { logout } = useAuth()
  const insets = useSafeAreaInsets()
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleLogoutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowConfirmModal(true)
  }

  const handleConfirmLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowConfirmModal(false)
    try {
      await logout()
      router.replace("/login" as any)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleCancelLogout = () => {
    setShowConfirmModal(false)
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: "absolute",
          bottom: insets.bottom + 100, // Above tab bar (~80-100px + safe area)
          right: 20,
          zIndex: 1000,
        },
        button: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.error,
          borderRadius: 24,
          paddingHorizontal: 20,
          paddingVertical: 12,
          minHeight: 44,
          elevation: 8,
          shadowColor: colors.palette.neutral0 || "#171725",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        buttonText: {
          color: colors.buttonPrimaryText,
          fontSize: 15,
          fontWeight: "700",
          marginLeft: 8,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
        },
        modalContent: {
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          padding: 24,
          width: "85%",
          maxWidth: 400,
          borderWidth: 1,
          borderColor: colors.border,
        },
        modalTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12,
        },
        modalMessage: {
          color: colors.textDim,
          fontSize: 15,
          lineHeight: 22,
          marginBottom: 24,
        },
        modalButtons: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 12,
        },
        cancelButton: {
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.sectionBackground,
        },
        cancelButtonText: {
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
        },
        confirmButton: {
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.error,
        },
        confirmButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 15,
          fontWeight: "600",
        },
      }),
    [colors, insets.bottom],
  )

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogoutPress}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <LogOut size={20} color={colors.buttonPrimaryText} />
          <Text style={styles.buttonText}>
            {translate("common.logout" as any) || "Logout"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelLogout}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {translate("common.confirmLogout" as any) || "Confirm Logout"}
            </Text>
            <Text style={styles.modalMessage}>
              {translate("common.logoutMessage" as any) ||
                "Are you sure you want to logout? You will need to login again to access the app."}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelLogout}>
                <Text style={styles.cancelButtonText}>
                  {translate("common.cancel" as any) || "Cancel"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLogout}>
                <Text style={styles.confirmButtonText}>
                  {translate("common.logout" as any) || "Logout"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

