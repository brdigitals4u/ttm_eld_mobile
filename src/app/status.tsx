import React, { useState, useEffect } from "react"
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  Pressable,
  TextInput,
} from "react-native"
import { ActivityIndicator } from "react-native"
import { router } from "expo-router"
import {
  AlertTriangle,
  ArrowLeft,
  Bed,
  Briefcase,
  Coffee,
  MoreHorizontal,
  Truck,
  User,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useHOSCurrentStatus, useChangeDutyStatus } from "@/api/driver-hooks"
import { hosApi } from "@/api/hos"
import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import { useStatus } from "@/contexts"
import { useEldVehicleData } from "@/hooks/useEldVehicleData"
import { useLocationData } from "@/hooks/useLocationData"
import { usePreTripCheck } from "@/hooks/usePreTripCheck"
import { translate } from "@/i18n/translate"
import { useToast } from "@/providers/ToastProvider"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { DriverStatus } from "@/types/status"
import {
  mapDriverStatusToAppStatus,
  mapAppStatusToDriverStatus,
  mapHOSStatusToAuthFormat,
} from "@/utils/hos-status-mapper"
import { useStatusStore } from "@/stores/statusStore"

// Simple StatusButton component replacement
const StatusButton = ({
  status,
  label,
  isActive,
  onPress,
  icon,
}: {
  status: string
  label: string
  isActive: boolean
  onPress: () => void
  icon: React.ReactNode
}) => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors

  return (
    <TouchableOpacity
      style={[
        styles.statusButton,
        {
          backgroundColor: isActive
            ? colors.palette.primary500
            : isDark
              ? colors.cardBackground
              : "#f3f4f6",
          borderColor: isActive ? colors.palette.primary500 : colors.border,
        },
      ]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[
          styles.statusButtonLabel,
          {
            color: isActive ? "#fff" : colors.text,
            fontWeight: isActive ? "600" : "400",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default function StatusScreen() {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const {
    currentStatus,
    hoursOfService,
    formatDuration,
    splitSleepSettings,
    toggleSplitSleep,
    updateStatus,
    getStatusReasons,
  } = useStatus()
  const {
    isAuthenticated,
    updateHosStatus,
    hosStatus: authHosStatus,
    logout,
    driverProfile,
    user,
  } = useAuth()
  const { setCurrentStatus, setHoursOfService } = useStatusStore()
  const { odometer: eldOdometer } = useEldVehicleData()
  const locationData = useLocationData()
  const toast = useToast()
  const [showDoneForDayModal, setShowDoneForDayModal] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | null>(null)
  const [selectedReason, setSelectedReason] = useState<string>("")
  const [isOtherSelected, setIsOtherSelected] = useState(false)
  const [otherReasonText, setOtherReasonText] = useState<string>("")
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isGoingOffDuty, setIsGoingOffDuty] = useState(false)
  const insets = useSafeAreaInsets()

  // Get HOS status from new driver API (polls every 30s)
  const {
    data: currentHosStatus,
    isLoading: isClockLoading,
    isFetching: isClockFetching,
  } = useHOSCurrentStatus({
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30 seconds per spec
  })

  // Sync HOS status data to auth store and status store when it updates
  useEffect(() => {
    if (currentHosStatus && isAuthenticated) {
      console.log("🔄 StatusScreen: Syncing HOS status data from backend", currentHosStatus)

      // Map HOSCurrentStatus to HOSStatus format for auth store
      const mappedStatus = mapHOSStatusToAuthFormat(currentHosStatus)
      if (user?.firstName && user?.lastName) {
        mappedStatus.driver_name = `${user.firstName} ${user.lastName}`
      }
      updateHosStatus(mappedStatus)

      // Sync current status from new API response
      const appStatus = mapDriverStatusToAppStatus(currentHosStatus.current_status)
      setCurrentStatus(appStatus)

      // Sync HOS times to status store
      setHoursOfService({
        driveTimeRemaining: currentHosStatus.clocks.drive.remaining_minutes || 0,
        shiftTimeRemaining: currentHosStatus.clocks.shift.remaining_minutes || 0,
        cycleTimeRemaining: currentHosStatus.clocks.cycle.remaining_minutes || 0,
        breakTimeRemaining: hoursOfService.breakTimeRemaining, // Keep existing break time
        lastCalculated: Date.now(),
      })
    }
  }, [
    currentHosStatus,
    isAuthenticated,
    updateHosStatus,
    setCurrentStatus,
    setHoursOfService,
    hoursOfService.breakTimeRemaining,
    user?.firstName,
    user?.lastName,
  ])

  // Mutation hook for changing duty status
  const changeDutyStatusMutation = useChangeDutyStatus()

  // Pre-trip inspection check
  const { hasCompletedPreTrip } = usePreTripCheck()

  // Get odometer from ELD device using the hook
  const getOdometer = (): number => {
    if (eldOdometer.source === "eld" && eldOdometer.value !== null) {
      return eldOdometer.value
    }
    return 0
  }

  const handleStatusChange = (status: DriverStatus) => {
    // Show "Done for the day?" modal when selecting Off Duty
    if (status === "offDuty") {
      setShowDoneForDayModal(true)
      return
    }

    // Show reason selection modal for other statuses
    setSelectedStatus(status)
    setSelectedReason("")
    setIsOtherSelected(false)
    setOtherReasonText("")
    setShowReasonModal(true)
  }

  const handleReasonSelect = (reason: string) => {
    if (reason === "Other") {
      setIsOtherSelected(true)
      setSelectedReason("")
      setOtherReasonText("")
    } else {
      setIsOtherSelected(false)
      setSelectedReason(reason)
      setOtherReasonText("")
    }
  }

  const handleConfirmStatusChange = async () => {
    console.log("🚀 handleConfirmStatusChange called")

    if (!selectedStatus) {
      console.warn("⚠️ No selected status")
      return
    }

    // Determine the final reason text
    const finalReason = isOtherSelected ? otherReasonText.trim() : selectedReason

    if (!finalReason) {
      toast.error(
        isOtherSelected ? "Please enter a reason" : "Please select a reason for the status change",
      )
      return
    }

    // Check for pre-trip inspection before allowing driving status
    if (selectedStatus === "driving" && !hasCompletedPreTrip) {
      // Show warning but allow status change (per user requirement)
      toast.warning(
        translate("status.pretripWarning" as any) ||
          "Pre-trip inspection not completed. UDT event will be recorded.",
      )

      // Create UDT event
      try {
        if (driverProfile?.driver_id) {
          await hosApi.createHOSELDEvent({
            driver: driverProfile.driver_id,
            event_type: "udt",
            event_code: "UDT",
            event_time: new Date().toISOString(),
            location: locationData.address || "",
            event_data: {
              new_duty_status: "driving",
              previous_duty_status: currentHosStatus?.current_status || "unknown",
              missing_inspection: "pre-trip",
              driver_id: driverProfile.driver_id,
            },
          })
          console.log("✅ UDT event created for missing pre-trip inspection")
        }
      } catch (error) {
        console.error("❌ Failed to create UDT event:", error)
        // Don't block status change if UDT event creation fails
      }
    }

    console.log("✅ Validation passed, setting submitting state")
    setIsSubmittingStatus(true)

    try {
      // Get odometer - no location blocking
      const odometer = getOdometer()

      // Map app status to driver API status format
      const apiStatus = mapAppStatusToDriverStatus(selectedStatus)
      console.log("📊 API Status mapped:", apiStatus, "from app status:", selectedStatus)

      // Build payload for new driver API (no clockId needed)
      // Location must have valid lat/lng (use 0,0 as fallback if needed)
      const requestPayload = {
        duty_status: apiStatus as any,
        location: {
          latitude: locationData.latitude !== 0 ? locationData.latitude : 0,
          longitude: locationData.longitude !== 0 ? locationData.longitude : 0,
          address: locationData.address || "",
        },
        odometer: odometer > 0 ? odometer : undefined,
        remark: finalReason,
      }

      console.log("📤 StatusScreen: About to call new driver API")
      console.log("📤 Full payload:", JSON.stringify(requestPayload, null, 2))

      try {
        const result = await changeDutyStatusMutation.mutateAsync(requestPayload)

        // Show success toast
        toast.success("Status updated successfully")

        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(result.warnings.join(", "))
        }

        // Update local state from selected status (HOS status will be refetched automatically)
        setCurrentStatus(selectedStatus)

        // Update hours of service from response if available
        // Note: new_clocks.remaining is in "HH:mm" format, convert to minutes
        if (result.new_clocks) {
          const parseTimeToMinutes = (timeStr: string): number => {
            const [hours, minutes] = timeStr.split(":").map(Number)
            return (hours || 0) * 60 + (minutes || 0)
          }

          setHoursOfService({
            driveTimeRemaining: result.new_clocks.drive?.remaining
              ? parseTimeToMinutes(result.new_clocks.drive.remaining)
              : hoursOfService.driveTimeRemaining,
            shiftTimeRemaining: result.new_clocks.shift?.remaining
              ? parseTimeToMinutes(result.new_clocks.shift.remaining)
              : hoursOfService.shiftTimeRemaining,
            cycleTimeRemaining: hoursOfService.cycleTimeRemaining,
            breakTimeRemaining: hoursOfService.breakTimeRemaining,
            lastCalculated: Date.now(),
          })
        }

        // Close modal after success
        setShowReasonModal(false)
        setSelectedStatus(null)
        setSelectedReason("")
        setIsOtherSelected(false)
        setOtherReasonText("")
      } catch (error: any) {
        // Handle errors
        if (error?.status === 403) {
          toast.error("Cannot change status: " + (error.message || "Insufficient time remaining"))
        } else {
          toast.error(
            error?.message || `Error ${error?.status || "unknown"}: Failed to update status`,
          )
        }

        // Close modal on error
        setShowReasonModal(false)
        setSelectedStatus(null)
        setSelectedReason("")
        setIsOtherSelected(false)
        setOtherReasonText("")
      }
    } catch (error: any) {
      toast.error("Failed to update status. Please try again.")
      setShowReasonModal(false)
      setSelectedStatus(null)
      setSelectedReason("")
      setIsOtherSelected(false)
      setOtherReasonText("")
    } finally {
      console.log("✅ Finally block: Resetting submitting state")
      setIsSubmittingStatus(false)
    }
  }

  const handleGoOffDuty = async (reason: string = "Going off duty") => {
    setIsGoingOffDuty(true)

    try {
      // Get odometer - no location blocking
      const odometer = getOdometer()

      // Call new driver API (no clockId needed)
      try {
        const requestPayload = {
          duty_status: "off_duty" as any,
          location: {
            latitude: locationData.latitude !== 0 ? locationData.latitude : 0,
            longitude: locationData.longitude !== 0 ? locationData.longitude : 0,
            address: locationData.address || "",
          },
          odometer: odometer > 0 ? odometer : undefined,
          remark: reason,
        }

        const result = await changeDutyStatusMutation.mutateAsync(requestPayload)

        console.log("✅ StatusScreen: Off duty status synced to backend", result)
        toast.success("Status updated successfully")

        // Update local status store
        setCurrentStatus("offDuty" as DriverStatus)

        // Update hours of service from response if available
        if (result.new_clocks) {
          const parseTimeToMinutes = (timeStr: string): number => {
            const [hours, minutes] = timeStr.split(":").map(Number)
            return (hours || 0) * 60 + (minutes || 0)
          }

          setHoursOfService({
            driveTimeRemaining: result.new_clocks.drive?.remaining
              ? parseTimeToMinutes(result.new_clocks.drive.remaining)
              : hoursOfService.driveTimeRemaining,
            shiftTimeRemaining: result.new_clocks.shift?.remaining
              ? parseTimeToMinutes(result.new_clocks.shift.remaining)
              : hoursOfService.shiftTimeRemaining,
            cycleTimeRemaining: hoursOfService.cycleTimeRemaining,
            breakTimeRemaining: hoursOfService.breakTimeRemaining,
            lastCalculated: Date.now(),
          })
        }
      } catch (error: any) {
        console.error("❌ StatusScreen: Failed to sync off duty status:", error)
        toast.error(error?.message || "Failed to update status. Please try again.")
        // Update local state only
        setCurrentStatus("offDuty" as DriverStatus)
      }

      // Close modal after API call completes (success or error)
      setShowDoneForDayModal(false)
    } catch (error) {
      console.error("Failed to go off duty:", error)
      toast.error("Failed to update status. Please try again.")
      setShowDoneForDayModal(false)
    } finally {
      setIsGoingOffDuty(false)
    }
  }

  const handleGoOffDutyAndSignOut = async () => {
    setShowDoneForDayModal(false)
    setIsSigningOut(true)

    try {
      // First update status to off duty
      await handleGoOffDuty("Going off duty and signing out")

      // Then logout
      await logout()
      toast.success("Signed out successfully")

      // Navigate to login
      router.replace("/login")
    } catch (error) {
      console.error("Failed to go off duty and sign out:", error)
      toast.error("Failed to sign out. Please try again.")
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={translate("status.changeStatus" as any)}
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
        }}
        leftIcon="back"
        leftIconColor={colors.palette.primary500}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.06)",
          shadowColor: colors.palette.primary500,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
        style={{
          paddingHorizontal: 16,
        }}
        safeAreaEdges={["top"]}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          Select your current duty status
        </Text>

        {/* Loading indicator */}
        {(isClockLoading || isClockFetching || changeDutyStatusMutation.isPending) && (
          <View style={{ padding: 16, alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.palette.primary500} />
            <Text style={[styles.infoText, { color: colors.textDim, marginTop: 8 }]}>
              {changeDutyStatusMutation.isPending ? "Updating status..." : "Syncing HOS data..."}
            </Text>
          </View>
        )}

        <View style={styles.statusButtons}>
          <StatusButton
            status="driving"
            label={translate("status.driving" as any)}
            isActive={currentStatus === "driving"}
            onPress={() => handleStatusChange("driving")}
            icon={
              <Truck
                size={20}
                color={currentStatus === "driving" ? (isDark ? "#000" : "#fff") : "#10B981"}
              />
            }
          />

          <StatusButton
            status="onDuty"
            label={translate("status.onDuty" as any)}
            isActive={currentStatus === "onDuty"}
            onPress={() => handleStatusChange("onDuty")}
            icon={
              <Briefcase
                size={20}
                color={currentStatus === "onDuty" ? (isDark ? "#000" : "#fff") : "#F59E0B"}
              />
            }
          />

          <StatusButton
            status="offDuty"
            label={translate("status.offDuty" as any)}
            isActive={currentStatus === "offDuty"}
            onPress={() => handleStatusChange("offDuty")}
            icon={
              <Coffee
                size={20}
                color={currentStatus === "offDuty" ? (isDark ? "#000" : "#fff") : "#3B82F6"}
              />
            }
          />

          <StatusButton
            status="sleeperBerth"
            label={translate("status.sleeping" as any)}
            isActive={currentStatus === "sleeperBerth"}
            onPress={() => handleStatusChange("sleeperBerth")}
            icon={
              <Bed
                size={20}
                color={currentStatus === "sleeperBerth" ? (isDark ? "#000" : "#fff") : "#6366F1"}
              />
            }
          />

          <StatusButton
            status="personalConveyance"
            label="Personal Conveyance"
            isActive={currentStatus === "personalConveyance"}
            onPress={() => handleStatusChange("personalConveyance")}
            icon={
              <User
                size={20}
                color={
                  currentStatus === "personalConveyance"
                    ? isDark
                      ? "#000"
                      : "#fff"
                    : colors.palette.primary500
                }
              />
            }
          />

          <StatusButton
            status="yardMove"
            label="Yard Moves"
            isActive={currentStatus === "yardMove"}
            onPress={() => handleStatusChange("yardMove")}
            icon={
              <MoreHorizontal
                size={20}
                color={currentStatus === "yardMove" ? (isDark ? "#000" : "#fff") : colors.warning}
              />
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Sleep Settings</Text>

        <ElevatedCard>
          <View style={styles.splitSleepRow}>
            <View style={styles.splitSleepInfo}>
              <Text style={[styles.splitSleepLabel, { color: colors.text }]}>
                Split Sleep Toggle
              </Text>
              <Text style={[styles.splitSleepDescription, { color: colors.textDim }]}>
                Adds {splitSleepSettings.additionalHours} hours to driving time
              </Text>
            </View>
            <Switch
              value={splitSleepSettings.enabled}
              onValueChange={(enabled) =>
                toggleSplitSleep(enabled, splitSleepSettings.additionalHours)
              }
              trackColor={{ false: colors.textDim, true: colors.palette.primary500 }}
              thumbColor={splitSleepSettings.enabled ? "#fff" : "#f4f3f4"}
            />
          </View>
        </ElevatedCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hours of Service Summary</Text>

        <ElevatedCard>
          <View style={styles.hosRow}>
            <Text style={[styles.hosLabel, { color: colors.textDim }]}>Drive Time Remaining:</Text>
            <Text
              style={[
                styles.hosValue,
                {
                  color:
                    (currentHosStatus?.clocks?.drive?.remaining_minutes ??
                      hoursOfService.driveTimeRemaining) < 60
                      ? colors.error
                      : colors.text,
                },
              ]}
            >
              {formatDuration(
                currentHosStatus?.clocks?.drive?.remaining_minutes ??
                  hoursOfService.driveTimeRemaining,
              )}
            </Text>
          </View>

          <View style={styles.hosRow}>
            <Text style={[styles.hosLabel, { color: colors.textDim }]}>Shift Time Remaining:</Text>
            <Text style={[styles.hosValue, { color: colors.text }]}>
              {formatDuration(
                currentHosStatus?.clocks?.shift?.remaining_minutes ??
                  hoursOfService.shiftTimeRemaining,
              )}
            </Text>
          </View>

          <View style={styles.hosRow}>
            <Text style={[styles.hosLabel, { color: colors.textDim }]}>Cycle Time Remaining:</Text>
            <Text style={[styles.hosValue, { color: colors.text }]}>
              {formatDuration(
                currentHosStatus?.clocks?.cycle?.remaining_minutes ??
                  hoursOfService.cycleTimeRemaining,
              )}
            </Text>
          </View>

          <View style={styles.hosRow}>
            <Text style={[styles.hosLabel, { color: colors.textDim }]}>Break Required In:</Text>
            <Text
              style={[
                styles.hosValue,
                {
                  color: hoursOfService.breakTimeRemaining < 30 ? colors.error : colors.text,
                },
              ]}
            >
              {formatDuration(hoursOfService.breakTimeRemaining)}
            </Text>
          </View>
        </ElevatedCard>

        {hoursOfService.driveTimeRemaining < 60 && (
          <ElevatedCard style={[styles.warningCard, { backgroundColor: colors.error }]}>
            <View style={styles.warningContent}>
              <AlertTriangle size={24} color={isDark ? "#000" : "#fff"} />
              <Text style={[styles.warningText, { color: isDark ? "#000" : "#fff" }]}>
                You have less than {formatDuration(hoursOfService.driveTimeRemaining)} of driving
                time remaining. Plan to take a break soon.
              </Text>
            </View>
          </ElevatedCard>
        )}

        <Text style={[styles.infoText, { color: colors.textDim }]}>
          Remember to update your status whenever your duty status changes to maintain accurate
          records.
        </Text>

        {/* Reason Selection Modal */}
        <Modal
          visible={showReasonModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReasonModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.cardBackground, maxHeight: "80%" },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Reason for{" "}
                {selectedStatus
                  ? selectedStatus.charAt(0).toUpperCase() +
                    selectedStatus.slice(1).replace(/([A-Z])/g, " $1")
                  : ""}
              </Text>

              <ScrollView style={{ maxHeight: 300, marginBottom: 20 }}>
                <View style={styles.reasonChipsContainer}>
                  {selectedStatus &&
                    getStatusReasons(selectedStatus).map((reason) => {
                      const isSelected = !isOtherSelected && selectedReason === reason.text
                      const isOther = reason.text === "Other"
                      const isOtherOptionSelected = isOther && isOtherSelected

                      return (
                        <TouchableOpacity
                          key={reason.id}
                          style={[
                            styles.reasonChip,
                            {
                              backgroundColor:
                                isSelected || isOtherOptionSelected
                                  ? colors.palette.primary500
                                  : colors.cardBackground,
                              borderColor:
                                isSelected || isOtherOptionSelected
                                  ? colors.palette.primary500
                                  : colors.border,
                            },
                          ]}
                          onPress={() => handleReasonSelect(reason.text)}
                        >
                          <Text
                            style={[
                              styles.reasonChipText,
                              {
                                color: isSelected || isOtherOptionSelected ? "#fff" : colors.text,
                              },
                            ]}
                          >
                            {reason.text}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                </View>

                {/* Other Text Input */}
                {isOtherSelected && (
                  <View style={styles.otherInputContainer}>
                    <Text style={[styles.otherInputLabel, { color: colors.text }]}>
                      Please specify the reason:
                    </Text>
                    <TextInput
                      style={[
                        styles.otherTextInput,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Enter reason..."
                      placeholderTextColor={colors.textDim}
                      value={otherReasonText}
                      onChangeText={setOtherReasonText}
                      multiline
                      numberOfLines={3}
                      editable={!isSubmittingStatus}
                    />
                  </View>
                )}
              </ScrollView>

              <SafeAreaContainer edges={["bottom"]} bottomPadding={16}>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.primaryModalButton,
                      {
                        backgroundColor: colors.palette.primary500,
                        opacity:
                          ((!isOtherSelected && selectedReason) ||
                            (isOtherSelected && otherReasonText.trim())) &&
                          !isSubmittingStatus
                            ? 1
                            : 0.5,
                      },
                    ]}
                    disabled={
                      (!isOtherSelected && !selectedReason) ||
                      (isOtherSelected && !otherReasonText.trim()) ||
                      isSubmittingStatus
                    }
                    onPress={handleConfirmStatusChange}
                  >
                    {isSubmittingStatus ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.primaryModalButtonText}>Updating...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryModalButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.secondaryModalButton]}
                    disabled={isSubmittingStatus}
                    onPress={() => {
                      setShowReasonModal(false)
                      setSelectedStatus(null)
                      setSelectedReason("")
                      setIsOtherSelected(false)
                      setOtherReasonText("")
                    }}
                  >
                    <Text
                      style={[
                        styles.secondaryModalButtonText,
                        { color: colors.palette.primary500 },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaContainer>
            </View>
          </View>
        </Modal>

        {/* Done for the day modal */}
        <Modal
          visible={showDoneForDayModal}
          transparent
          animationType="fade"
          onRequestClose={() => !isGoingOffDuty && !isSigningOut && setShowDoneForDayModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Done for the day?</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.primaryModalButton,
                    {
                      backgroundColor: colors.palette.primary500,
                      opacity: isGoingOffDuty || isSigningOut ? 0.6 : 1,
                    },
                  ]}
                  disabled={isGoingOffDuty || isSigningOut}
                  onPress={handleGoOffDutyAndSignOut}
                >
                  {isSigningOut ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.primaryModalButtonText}>Signing out...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryModalButtonText}>
                      {translate("status.offDuty" as any)} & Sign Out
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.secondaryModalButton,
                    { opacity: isGoingOffDuty || isSigningOut ? 0.6 : 1 },
                  ]}
                  disabled={isGoingOffDuty || isSigningOut}
                  onPress={() => handleGoOffDuty("End of shift")}
                >
                  {isGoingOffDuty ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator size="small" color={colors.palette.primary500} />
                      <Text
                        style={[
                          styles.secondaryModalButtonText,
                          { color: colors.palette.primary500 },
                        ]}
                      >
                        Updating...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.secondaryModalButtonText,
                        { color: colors.palette.primary500 },
                      ]}
                    >
                      {translate("status.offDuty" as any)}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.secondaryModalButton,
                    { opacity: isGoingOffDuty || isSigningOut ? 0.6 : 1 },
                  ]}
                  disabled={isGoingOffDuty || isSigningOut}
                  onPress={() => setShowDoneForDayModal(false)}
                >
                  <Text
                    style={[styles.secondaryModalButtonText, { color: colors.palette.primary500 }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Sign out loading modal */}
        <Modal visible={isSigningOut} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <ActivityIndicator size="large" color={colors.palette.primary500} />
              <Text style={[styles.modalTitle, { color: colors.text, marginTop: 20 }]}>
                We are signing you out please wait...
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  certificationWarning: {
    marginBottom: 24,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  hosLabel: {
    fontSize: 16,
  },
  hosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hosValue: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  infoText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalButtons: {
    gap: 12,
    width: "100%",
  },
  modalContent: {
    alignItems: "center",
    borderRadius: 12,
    maxWidth: 320,
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
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 24,
    textAlign: "center",
  },
  otherInputContainer: {
    marginTop: 16,
    width: "100%",
  },
  otherInputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  otherTextInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
    padding: 12,
    textAlignVertical: "top",
  },
  primaryModalButton: {
    backgroundColor: "#0071ce", // Will be overridden by inline style
  },
  primaryModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  reasonChip: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  reasonChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 10,
  },
  secondaryModalButton: {
    backgroundColor: "transparent",
  },
  secondaryModalButtonText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  splitSleepDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  splitSleepInfo: {
    flex: 1,
  },
  splitSleepLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  splitSleepRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 16,
  },
  statusButtonLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  statusButtons: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  warningCard: {
    marginBottom: 24,
    marginTop: 16,
  },
  warningContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    marginLeft: 12,
  },
})
