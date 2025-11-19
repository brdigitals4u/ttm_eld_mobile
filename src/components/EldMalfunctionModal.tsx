/**
 * ELD Malfunction Modal Component
 *
 * Full-screen modal for ELD compliance malfunctions (Codes P, E, L, T)
 * Regulatory requirement - cannot be dismissed until acknowledged
 * Auto-reports to fleet with device diagnostics
 */

import React, { useRef, useEffect, useMemo, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native"
import * as Haptics from "expo-haptics"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { AlertTriangle, Send, Phone } from "lucide-react-native"

import { useReportMalfunction } from "@/api/notifications"
import { useObdData } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { colors } from "@/theme/colors"
import { EldComplianceMalfunction } from "@/types/JMBluetooth"

import { Text } from "./Text"

export interface EldMalfunctionModalProps {
  malfunction: EldComplianceMalfunction | null
  onDismiss?: () => void
}

const getMalfunctionDescription = (code: string): { title: string; steps: string[] } => {
  switch (code) {
    case "P":
      return {
        title: translate("eld.malfunction.powerCompliance" as any),
        steps: [
          translate("eld.malfunction.powerSteps.step1" as any),
          translate("eld.malfunction.powerSteps.step2" as any),
          translate("eld.malfunction.powerSteps.step3" as any),
        ],
      }
    case "E":
      return {
        title: translate("eld.malfunction.engineSync" as any),
        steps: [
          translate("eld.malfunction.engineSteps.step1" as any),
          translate("eld.malfunction.engineSteps.step2" as any),
          translate("eld.malfunction.engineSteps.step3" as any),
          translate("eld.malfunction.engineSteps.step4" as any),
        ],
      }
    case "L":
      return {
        title: translate("eld.malfunction.positioningCompliance" as any),
        steps: [
          translate("eld.malfunction.positioningSteps.step1" as any),
          translate("eld.malfunction.positioningSteps.step2" as any),
          translate("eld.malfunction.positioningSteps.step3" as any),
          translate("eld.malfunction.positioningSteps.step4" as any),
        ],
      }
    case "T":
      return {
        title: translate("eld.malfunction.timingCompliance" as any),
        steps: [
          translate("eld.malfunction.timingSteps.step1" as any),
          translate("eld.malfunction.timingSteps.step2" as any),
          translate("eld.malfunction.timingSteps.step3" as any),
        ],
      }
    default:
      return {
        title: translate("eld.malfunction.title" as any),
        steps: [translate("eld.malfunction.contactFleet" as any)],
      }
  }
}

export const EldMalfunctionModal: React.FC<EldMalfunctionModalProps> = ({
  malfunction,
  onDismiss,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [isReporting, setIsReporting] = useState(false)
  const { eldHistoryRecords, eldDeviceId } = useObdData()
  const { vehicleAssignment } = useAuth()
  const reportMalfunction = useReportMalfunction()

  const snapPoints = useMemo(() => ["90%"], [])

  useEffect(() => {
    if (malfunction) {
      // Trigger haptic feedback
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }

      // Show modal
      setTimeout(() => {
        bottomSheetRef.current?.present()
      }, 100)
    }
  }, [malfunction])

  const handleReportToFleet = async () => {
    if (!malfunction) return

    setIsReporting(true)
    try {
      // Get last 10 records for diagnostics
      const last10Records = eldHistoryRecords.slice(-10).map((r) => ({
        eventTime: r.eventTime,
        eventType: r.eventType,
        latitude: r.latitude,
        longitude: r.longitude,
        raw: r.raw,
      }))

      // Report malfunction via API
      await reportMalfunction.mutateAsync({
        malfunction_type: getMalfunctionType(malfunction.code),
        diagnostic_code: `M${malfunction.code}`,
        description: malfunction.description,
        symptoms: `ELD Compliance Malfunction Code ${malfunction.code}. Device: ${eldDeviceId || malfunction.ecuId || "unknown"}. DataType: ${malfunction.dataType}, MsgSubtype: ${malfunction.msgSubtype}`,
        location: undefined, // Location would need to be extracted from malfunction data if available
      })

      // Show confirmation
      console.log("✅ Malfunction reported to fleet")
    } catch (error) {
      console.error("❌ Failed to report malfunction:", error)
    } finally {
      setIsReporting(false)
    }
  }

  const handleContactFleet = () => {
    // Open phone dialer or contact info
    // This would need fleet contact info from settings
    console.log("Contact fleet - to be implemented with fleet contact info")
  }

  const handleAcknowledge = () => {
    bottomSheetRef.current?.dismiss()
    onDismiss?.()
  }

  const getMalfunctionType = (code: string): string => {
    const typeMap: Record<string, string> = {
      P: "power_compliance",
      E: "engine_sync",
      L: "positioning_compliance",
      T: "timing_compliance",
    }
    return typeMap[code] || "other"
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="none" // Cannot dismiss by tapping backdrop
      opacity={0.9}
    />
  )

  if (!malfunction) {
    return null
  }

  const info = getMalfunctionDescription(malfunction.code)

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
          <AlertTriangle size={64} color="#EF4444" strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{info.title}</Text>

        {/* Code Badge */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>
            {translate("eld.malfunction.code" as any)} {malfunction.code}
          </Text>
        </View>

        {/* Required Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>{translate("eld.malfunction.requiredSteps" as any)}</Text>
          {info.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepBullet} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.reportButton]}
            onPress={handleReportToFleet}
            disabled={isReporting}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>
              {isReporting
                ? translate("eld.malfunction.reporting" as any)
                : translate("eld.malfunction.reportToFleet" as any)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.contactButton]}
            onPress={handleContactFleet}
          >
            <Phone size={20} color={colors.tint} />
            <Text style={styles.contactButtonText}>
              {translate("eld.malfunction.contactFleet" as any)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acknowledgeButton]}
            onPress={handleAcknowledge}
          >
            <Text style={styles.acknowledgeButtonText}>
              {translate("eld.malfunction.acknowledge" as any)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {translate("eld.malfunction.detected" as any)}:{" "}
          {new Date(parseInt(malfunction.timestamp)).toLocaleString()}
        </Text>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  acknowledgeButton: {
    backgroundColor: colors.tint,
  },
  acknowledgeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
    width: "100%",
  },
  codeBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  codeText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  contactButton: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.tint,
    borderWidth: 2,
  },
  contactButtonText: {
    color: colors.tint,
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    alignItems: "center",
    flex: 1,
    padding: 24,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  iconContainer: {
    marginBottom: 24,
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  reportButton: {
    backgroundColor: "#DC2626",
  },
  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  stepBullet: {
    backgroundColor: colors.tint,
    borderRadius: 4,
    height: 8,
    marginRight: 12,
    marginTop: 6,
    width: 8,
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 12,
  },
  stepText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  stepsContainer: {
    marginBottom: 32,
    width: "100%",
  },
  stepsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
})
