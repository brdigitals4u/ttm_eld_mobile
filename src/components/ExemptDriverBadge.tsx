/**
 * Exempt Driver Badge Component
 *
 * Small indicator on dashboard showing exempt driver status
 * Opens bottom sheet with exempt driver details when clicked
 */

import React, { useRef, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { Shield, Info, X } from "lucide-react-native"

import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { colors } from "@/theme/colors"

import { Text } from "./Text"

export const ExemptDriverBadge: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { driverProfile } = useAuth()

  const snapPoints = useMemo(() => ["50%"], [])

  const isExempt = driverProfile?.eld_exempt === true
  const exemptReason = driverProfile?.eld_exempt_reason || "No reason provided"

  if (!isExempt) {
    return null // Don't show badge if driver is not exempt
  }

  const handlePress = () => {
    bottomSheetRef.current?.present()
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  )

  return (
    <>
      {/* Badge Indicator */}
      <TouchableOpacity style={styles.badge} onPress={handlePress} activeOpacity={0.7}>
        <Shield size={16} color="#F59E0B" />
        <Text style={styles.badgeText}>{translate("eld.exempt.badge" as any)}</Text>
      </TouchableOpacity>

      {/* Details Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield size={32} color="#F59E0B" />
            </View>
            <Text style={styles.title}>{translate("eld.exempt.title" as any)}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => bottomSheetRef.current?.dismiss()}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Info size={20} color={colors.tint} />
            <Text style={styles.infoText}>{translate("eld.exempt.info" as any)}</Text>
          </View>

          {/* Exempt Reason */}
          {exemptReason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>
                {translate("eld.exempt.exemptionReason" as any)}
              </Text>
              <Text style={styles.reasonText}>{exemptReason}</Text>
            </View>
          )}

          {/* Exempt Status Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate("eld.exempt.exemptStatus" as any)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{translate("eld.exempt.active" as any)}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate("eld.exempt.eldRecording" as any)}</Text>
              <Text style={styles.detailValue}>{translate("eld.exempt.stillActive" as any)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate("eld.exempt.diagnostics" as any)}</Text>
              <Text style={styles.detailValue}>{translate("eld.exempt.suspended" as any)}</Text>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{translate("eld.exempt.note" as any)}</Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  detailsContainer: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    position: "relative",
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  infoBox: {
    alignItems: "flex-start",
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    padding: 16,
  },
  infoText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  noteContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  reasonContainer: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  reasonLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  reasonText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  statusBadge: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
  },
})
