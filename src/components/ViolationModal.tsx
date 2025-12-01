/**
 * Violation Modal Component
 *
 * Full-screen bottom sheet for critical violations.
 * Cannot be dismissed - driver must acknowledge.
 */

import React, { useMemo, useRef, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Platform } from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { AlertTriangle } from "lucide-react-native"

import { useViolationNotifications, ActiveViolation } from "@/contexts/ViolationNotificationContext"
import { useAppTheme } from "@/theme/context"

interface ViolationModalProps {
  violation: ActiveViolation
}

export const ViolationModal: React.FC<ViolationModalProps> = ({ violation }) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { removeViolation } = useViolationNotifications()

  // Auto-present when violation is set
  useEffect(() => {
    if (violation) {
      // Trigger haptic feedback
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        // Also trigger impact for stronger feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }

      // Show modal
      setTimeout(() => {
        bottomSheetRef.current?.present()
      }, 100)
    }
  }, [violation])

  const snapPoints = useMemo(() => ["90%"], [])

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignItems: "center",
          borderRadius: 16,
          justifyContent: "center",
          minHeight: 56,
          paddingHorizontal: 24,
          paddingVertical: 16,
        },
        buttonContainer: {
          gap: 12,
          width: "100%",
        },
        content: {
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          padding: 24,
        },
        handleIndicator: {
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          width: 40,
        },
        iconContainer: {
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 60,
          height: 120,
          justifyContent: "center",
          marginBottom: 24,
          width: 120,
        },
        message: {
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: 18,
          fontWeight: "600",
          lineHeight: 26,
          marginBottom: 32,
          paddingHorizontal: 16,
          textAlign: "center",
        },
        metadataContainer: {
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderRadius: 16,
          marginBottom: 32,
          padding: 20,
          width: "100%",
        },
        metadataLabel: {
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 16,
          fontWeight: "600",
        },
        metadataRow: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
        },
        metadataValue: {
          color: colors.cardBackground,
          fontSize: 18,
          fontWeight: "800",
        },
        modalBackground: {
          backgroundColor: colors.error, // Red background for critical violations
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        okayButton: {
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderColor: colors.cardBackground,
          borderWidth: 2,
        },
        okayButtonText: {
          color: colors.cardBackground,
          fontSize: 18,
          fontWeight: "800",
        },
        title: {
          color: colors.cardBackground,
          fontSize: 28,
          fontWeight: "900",
          lineHeight: 36,
          marginBottom: 16,
          textAlign: "center",
        },
        viewDetailsButton: {
          backgroundColor: colors.cardBackground,
        },
        viewDetailsButtonText: {
          color: colors.error,
          fontSize: 18,
          fontWeight: "800",
        },
      }),
    [colors],
  )

  const handleViewDetails = () => {
    bottomSheetRef.current?.dismiss()
    router.push("/violations" as any)
  }

  const handleOkay = () => {
    // Note: For critical violations, we don't remove them on "Okay"
    // They should remain until resolved by backend
    bottomSheetRef.current?.dismiss()
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

  if (!violation) {
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
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={64} color={colors.cardBackground} strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{violation.title}</Text>

        {/* Message */}
        <Text style={styles.message}>{violation.message}</Text>

        {/* Metadata Section */}
        {violation.metadata && (
          <View style={styles.metadataContainer}>
            {violation.metadata.remaining_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Time Remaining:</Text>
                <Text style={styles.metadataValue}>
                  {violation.metadata.remaining_minutes} minutes
                </Text>
              </View>
            )}
            {violation.metadata.used_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Time Used:</Text>
                <Text style={styles.metadataValue}>
                  {Math.floor(violation.metadata.used_minutes / 60)}h{" "}
                  {violation.metadata.used_minutes % 60}m
                </Text>
              </View>
            )}
            {violation.metadata.limit_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Limit:</Text>
                <Text style={styles.metadataValue}>
                  {Math.floor(violation.metadata.limit_minutes / 60)}h{" "}
                  {violation.metadata.limit_minutes % 60}m
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.viewDetailsButton]}
            onPress={handleViewDetails}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.okayButton]} onPress={handleOkay}>
            <Text style={styles.okayButtonText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}
