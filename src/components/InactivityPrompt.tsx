/**
 * Inactivity Prompt Component
 *
 * Modal that appears after 5 minutes of vehicle inactivity while in "On-Duty Driving" status.
 * Shows "Confirm driving?" or "Change duty status" message.
 * Auto-switches to "On-Duty Not Driving" after 1 minute if no response.
 */

import React, { useMemo, useRef, useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { AlertTriangle, Clock } from "lucide-react-native"
import * as Haptics from "expo-haptics"
import { useChangeDutyStatus } from "@/api/driver-hooks"
import { useLocationData } from "@/hooks/useLocationData"
import { useEldVehicleData } from "@/hooks/useEldVehicleData"
import { useToast } from "@/providers/ToastProvider"
import { inactivityMonitor } from "@/services/inactivity-monitor"
import { Text } from "@/components/Text"
import { colors } from "@/theme/colors"

interface InactivityPromptProps {
  visible: boolean
  onContinueDriving: () => void
  onStatusChange: () => void
}

const AUTO_SWITCH_DELAY_MS = 60 * 1000 // 1 minute

export const InactivityPrompt: React.FC<InactivityPromptProps> = ({
  visible,
  onContinueDriving,
  onStatusChange,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const changeDutyStatusMutation = useChangeDutyStatus()
  const { locationData } = useLocationData()
  const { odometer } = useEldVehicleData()
  const toast = useToast()
  const [timeRemaining, setTimeRemaining] = useState(AUTO_SWITCH_DELAY_MS)
  const autoSwitchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-present when visible becomes true
  useEffect(() => {
    if (visible) {
      // Show modal
      setTimeout(() => {
        bottomSheetRef.current?.present()
      }, 100)

      // Start countdown timer
      setTimeRemaining(AUTO_SWITCH_DELAY_MS)
      autoSwitchTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1000)
          if (newTime === 0) {
            // Time's up - trigger auto-switch
            handleAutoSwitch()
          }
          return newTime
        })
      }, 1000)
    } else {
      // Hide modal
      bottomSheetRef.current?.dismiss()
      // Clear timer
      if (autoSwitchTimerRef.current) {
        clearInterval(autoSwitchTimerRef.current)
        autoSwitchTimerRef.current = null
      }
      setTimeRemaining(AUTO_SWITCH_DELAY_MS)
    }

    return () => {
      if (autoSwitchTimerRef.current) {
        clearInterval(autoSwitchTimerRef.current)
        autoSwitchTimerRef.current = null
      }
    }
  }, [visible])

  const snapPoints = useMemo(() => ["50%"], [])

  /**
   * Handle auto-switch to On-Duty Not Driving
   */
  const handleAutoSwitch = async () => {
    // Clear timer
    if (autoSwitchTimerRef.current) {
      clearInterval(autoSwitchTimerRef.current)
      autoSwitchTimerRef.current = null
    }

    // Notify monitor that user responded (to prevent duplicate triggers)
    inactivityMonitor.handleUserResponse()

    try {
      // Get odometer value
      const odometerValue =
        odometer.source === "eld" && odometer.value !== null ? odometer.value : undefined

      // Build status change request
      const requestPayload = {
        duty_status: "on_duty" as const,
        location: {
          latitude: locationData.latitude !== 0 ? locationData.latitude : 0,
          longitude: locationData.longitude !== 0 ? locationData.longitude : 0,
          address: locationData.address || "",
        },
        odometer: odometerValue && odometerValue > 0 ? odometerValue : undefined,
        remark: "Auto-switched due to 5-minute inactivity",
      }

      await changeDutyStatusMutation.mutateAsync(requestPayload)

      toast.success("Status changed to On-Duty Not Driving")
      onStatusChange()
    } catch (error: any) {
      console.error("❌ InactivityPrompt: Failed to auto-switch status", error)
      toast.error(error?.message || "Failed to change status")
      // Still call onStatusChange to close prompt
      onStatusChange()
    }
  }

  /**
   * Handle "Continue Driving" button
   */
  const handleContinueDriving = () => {
    // Clear timer
    if (autoSwitchTimerRef.current) {
      clearInterval(autoSwitchTimerRef.current)
      autoSwitchTimerRef.current = null
    }

    // Notify monitor that user responded
    inactivityMonitor.handleUserResponse()

    // Close prompt
    bottomSheetRef.current?.dismiss()
    onContinueDriving()
  }

  /**
   * Handle "Change Status" button
   */
  const handleChangeStatus = () => {
    // Clear timer
    if (autoSwitchTimerRef.current) {
      clearInterval(autoSwitchTimerRef.current)
      autoSwitchTimerRef.current = null
    }

    // Notify monitor that user responded
    inactivityMonitor.handleUserResponse()

    // Close prompt and let user change status manually
    bottomSheetRef.current?.dismiss()
    onStatusChange()
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

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

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
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={48} color="#F59E0B" strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Confirm driving?</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your vehicle has been stopped for 5 minutes. Please confirm you're still driving or change
          your duty status.
        </Text>

        {/* Countdown Timer */}
        <View style={styles.timerContainer}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.timerText}>Auto-switching in {formatTime(timeRemaining)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={handleContinueDriving}
          >
            <Text style={styles.continueButtonText}>Continue Driving</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.changeStatusButton]}
            onPress={handleChangeStatus}
          >
            <Text style={styles.changeStatusButtonText}>Change Status</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#D1D5DB",
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 32,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 32,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F59E0B",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  continueButton: {
    backgroundColor: "#5750F1", // Indigo theme color
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  changeStatusButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  changeStatusButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },
})
