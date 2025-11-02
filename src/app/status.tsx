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

import ElevatedCard from "@/components/EvevatedCard"
import { useStatus } from "@/contexts"
import { useAppTheme } from "@/theme/context"
import { DriverStatus } from "@/types/status"
import { Header } from "@/components/Header"
import { useHOSClock, useChangeDutyStatus, hosApi } from "@/api/hos"
import { useAuth } from "@/stores/authStore"
import { useLocation } from "@/contexts/location-context"
import { useStatusStore } from "@/stores/statusStore"
import { useObdData } from "@/contexts/obd-data-context"
import { useToast } from "@/providers/ToastProvider"
import { ActivityIndicator } from "react-native"

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
          backgroundColor: isActive ? colors.palette.primary500 : isDark ? colors.cardBackground : "#f3f4f6",
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
  const { isAuthenticated, updateHosStatus, hosStatus, logout } = useAuth()
  const { currentLocation, requestLocation } = useLocation()
  const { setCurrentStatus, setHoursOfService } = useStatusStore()
  const { obdData } = useObdData()
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

  // Get HOS clock data and sync to auth store
  const { 
    data: hosClock, 
    isLoading: isClockLoading,
    isFetching: isClockFetching 
  } = useHOSClock({
    enabled: isAuthenticated,
    refetchInterval: 60000, // Sync every 60 seconds
    refetchIntervalInBackground: false,
  })

  // Sync HOS clock data to auth store and status store when it updates
  useEffect(() => {
    if (hosClock && isAuthenticated) {
      console.log('🔄 StatusScreen: Syncing HOS clock data from backend', hosClock)
      
      // Map HOSClock to HOSStatus format for auth store
      updateHosStatus({
        driver_id: hosClock.driver,
        driver_name: hosClock.driver_name,
        current_status: hosClock.current_duty_status?.toUpperCase() || 'OFF_DUTY',
        driving_time_remaining: hosClock.driving_time_remaining || 0,
        on_duty_time_remaining: hosClock.on_duty_time_remaining || 0,
        cycle_time_remaining: hosClock.cycle_time_remaining || 0,
        time_remaining: {
          driving_time_remaining: hosClock.driving_time_remaining || 0,
          on_duty_time_remaining: hosClock.on_duty_time_remaining || 0,
          cycle_time_remaining: hosClock.cycle_time_remaining || 0,
        },
      })
      
      // Sync current status from clock data
      const appStatus = hosApi.getAppDutyStatus(hosClock.current_duty_status || 'off_duty')
      setCurrentStatus(appStatus as DriverStatus)
      
      // Sync HOS times to status store
      setHoursOfService({
        driveTimeRemaining: hosClock.driving_time_remaining || 0,
        shiftTimeRemaining: hosClock.on_duty_time_remaining || 0,
        cycleTimeRemaining: hosClock.cycle_time_remaining || 0,
        breakTimeRemaining: hoursOfService.breakTimeRemaining, // Keep existing break time
        lastCalculated: Date.now(),
      })
    }
  }, [hosClock, isAuthenticated, updateHosStatus, setCurrentStatus, setHoursOfService, hoursOfService.breakTimeRemaining])

  // Mutation hook for changing duty status
  const changeDutyStatusMutation = useChangeDutyStatus()

  // Get odometer from OBD data
  const getOdometer = (): number => {
    const odometerItem = obdData.find(
      (item) =>
        item.name.includes('Total Vehicle Distance') ||
        item.name.includes('Odometer') ||
        item.name.includes('Vehicle Distance')
    )
    return odometerItem ? parseFloat(odometerItem.value) || 0 : 0
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
    console.log('🚀 handleConfirmStatusChange called')
    
    if (!selectedStatus) {
      console.warn('⚠️ No selected status')
      return
    }

    // Determine the final reason text
    const finalReason = isOtherSelected ? otherReasonText.trim() : selectedReason

    if (!finalReason) {
      toast.error(isOtherSelected ? "Please enter a reason" : "Please select a reason for the status change")
      return
    }

    console.log('✅ Validation passed, setting submitting state')
    setIsSubmittingStatus(true)

    try {
      console.log('📍 Step 1: Getting location data')
      
      // Get location - try to request if not available, but don't block
      let locationData = currentLocation
      if (!locationData) {
        console.log('📍 No current location, requesting (with 5s timeout)...')
        try {
          // Request location with timeout - don't wait longer than 5 seconds
          const locationPromise = requestLocation()
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => {
              console.log('📍 Location request timed out after 5s, continuing with defaults')
              resolve(null)
            }, 5000)
          )
          
          locationData = await Promise.race([locationPromise, timeoutPromise])
          console.log('📍 Location request completed:', locationData ? 'Success' : 'Timeout/Failed')
        } catch (locationError: any) {
          console.warn('⚠️ Location request failed:', locationError?.message)
          locationData = null
        }
      } else {
        console.log('📍 Using cached location data')
      }

      // Get location data - ensure we have valid values
      const location = locationData?.address || currentLocation?.address || "Unknown location"
      const latitude = locationData?.latitude ?? currentLocation?.latitude ?? null
      const longitude = locationData?.longitude ?? currentLocation?.longitude ?? null
      const odometer = getOdometer()

      console.log('📍 Location data for API:', { location, latitude, longitude, odometer })
      console.log('🕐 HOS Clock ID:', hosClock?.id)
      console.log('🕐 HOS Clock full object:', JSON.stringify(hosClock, null, 2))
      console.log('📝 Selected Status:', selectedStatus)
      console.log('📝 Final Reason:', finalReason)

      // Validate that we have a clock ID
      if (!hosClock?.id) {
        console.error('❌ No HOS clock ID available!')
        console.log('⚠️ HOS Clock data:', JSON.stringify(hosClock, null, 2))
        toast.error("No HOS clock found. Please wait for clock to sync.")
        setIsSubmittingStatus(false)
        return
      }

      const apiStatus = hosApi.getAPIDutyStatus(selectedStatus)
      console.log('📊 API Status mapped:', apiStatus, 'from app status:', selectedStatus)

      // Build payload exactly as API expects
      const requestPayload: any = {
        duty_status: apiStatus,
        location: location,
        notes: finalReason,
      }

      // Only include lat/long if we have them
      if (latitude !== null && latitude !== undefined) {
        requestPayload.latitude = latitude
      }
      if (longitude !== null && longitude !== undefined) {
        requestPayload.longitude = longitude
      }
      
      // Only include odometer if we have a value
      if (odometer && odometer > 0) {
        requestPayload.odometer = odometer
      }

      console.log('📤 StatusScreen: About to call mutation')
      console.log('📤 Endpoint will be:', `/hos/clocks/${hosClock.id}/change_duty_status/`)
      console.log('📤 Full payload:', JSON.stringify(requestPayload, null, 2))

      try {
        console.log('🔄 Calling mutateAsync with:', {
          clockId: hosClock.id,
          request: requestPayload,
        })
        
        const result = await changeDutyStatusMutation.mutateAsync({
          clockId: hosClock.id,
          request: requestPayload,
        })

          console.log('✅ StatusScreen: HOS API call successful', result)
          
          // Show success toast
          toast.success("Status updated successfully")
          
          // Update HOS status immediately with the response data (if available)
          if (result.clock) {
            console.log('✅ StatusScreen: Clock data in response, updating immediately')
            updateHosStatus({
              driver_id: result.clock.driver,
              driver_name: result.clock.driver_name,
              current_status: result.clock.current_duty_status?.toUpperCase() || 'OFF_DUTY',
              driving_time_remaining: result.clock.driving_time_remaining || 0,
              on_duty_time_remaining: result.clock.on_duty_time_remaining || 0,
              cycle_time_remaining: result.clock.cycle_time_remaining || 0,
              time_remaining: {
                driving_time_remaining: result.clock.driving_time_remaining || 0,
                on_duty_time_remaining: result.clock.on_duty_time_remaining || 0,
                cycle_time_remaining: result.clock.cycle_time_remaining || 0,
              },
            })
            
            // Sync status from result to local store
            const appStatus = hosApi.getAppDutyStatus(result.clock.current_duty_status || 'off_duty')
            setCurrentStatus(appStatus as DriverStatus)
            
            // Update hours of service from result
            setHoursOfService({
              driveTimeRemaining: result.clock.driving_time_remaining || 0,
              shiftTimeRemaining: result.clock.on_duty_time_remaining || 0,
              cycleTimeRemaining: result.clock.cycle_time_remaining || 0,
              breakTimeRemaining: hoursOfService.breakTimeRemaining, // Keep existing
              lastCalculated: Date.now(),
            })
            
            console.log('✅ StatusScreen: Updated local state from API response')
          } else {
            console.log('⚠️ StatusScreen: No clock data in response, updating from selected status')
            // API returned success but no clock data - update local state from selected status
            // The query invalidation will trigger a refetch to get updated clock data
            setCurrentStatus(selectedStatus as DriverStatus)
            console.log('✅ StatusScreen: Updated local status, clock data will be refetched')
          }
          
          // Close modal after success
          setShowReasonModal(false)
          setSelectedStatus(null)
          setSelectedReason("")
          setIsOtherSelected(false)
          setOtherReasonText("")
        } catch (error: any) {
          console.error('❌ StatusScreen: Failed to update HOS status via API')
          console.error('❌ Error type:', error?.constructor?.name)
          console.error('❌ Error status:', error?.status)
          console.error('❌ Error message:', error?.message)
          console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
          
          // Handle 404 - clock might not exist
          if (error?.status === 404) {
            toast.error("HOS clock not found. Please refresh or contact support.")
            console.error('❌ Clock ID was:', hosClock?.id)
          } else {
            toast.error(error?.message || `Error ${error?.status || 'unknown'}: Failed to update status`)
          }
          
          // Update local state only (don't make duplicate API calls)
          setCurrentStatus(selectedStatus as DriverStatus)
          console.log('⚠️ StatusScreen: Updated local state only due to API error')
          
          // Close modal on error
          setShowReasonModal(false)
          setSelectedStatus(null)
          setSelectedReason("")
          setIsOtherSelected(false)
          setOtherReasonText("")
        }
    } catch (error: any) {
      console.error("❌ Status change outer error:", error)
      console.error("❌ Error type:", error?.constructor?.name)
      console.error("❌ Error message:", error?.message)
      console.error("❌ Error stack:", error?.stack)
      console.error("❌ Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      
      toast.error("Failed to update status. Please try again.")
      setShowReasonModal(false)
      setSelectedStatus(null)
      setSelectedReason("")
      setIsOtherSelected(false)
      setOtherReasonText("")
    } finally {
      console.log('✅ Finally block: Resetting submitting state')
      setIsSubmittingStatus(false)
    }
  }

  const handleGoOffDuty = async (reason: string = "Going off duty") => {
    setIsGoingOffDuty(true)
    
    try {
      // Request location if not available
      if (!currentLocation) {
        await requestLocation()
      }

      const location = currentLocation?.address || "Unknown location"
      const latitude = currentLocation?.latitude
      const longitude = currentLocation?.longitude
      const odometer = getOdometer()

      console.log('🚀 handleGoOffDuty: Starting off duty API call', {
        clockId: hosClock?.id,
        location,
        latitude,
        longitude,
        odometer,
        reason,
      })

      // Call HOS API if we have a clock ID
      if (hosClock?.id) {
        try {
          const apiStatus = hosApi.getAPIDutyStatus("offDuty")

          const result = await changeDutyStatusMutation.mutateAsync({
            clockId: hosClock.id,
            request: {
              duty_status: apiStatus,
              location: location,
              latitude: latitude,
              longitude: longitude,
              odometer: odometer || undefined,
              notes: reason,
            },
          })

          console.log('✅ StatusScreen: Off duty status synced to backend', result)
          toast.success("Status updated successfully")
          
          // Update local status store (without making API calls - they're already done)
          setCurrentStatus("offDuty" as DriverStatus)
          
          // Update HOS status with response data
          if (result.clock) {
            updateHosStatus({
              driver_id: result.clock.driver,
              driver_name: result.clock.driver_name,
              current_status: result.clock.current_duty_status?.toUpperCase() || 'OFF_DUTY',
              driving_time_remaining: result.clock.driving_time_remaining || 0,
              on_duty_time_remaining: result.clock.on_duty_time_remaining || 0,
              cycle_time_remaining: result.clock.cycle_time_remaining || 0,
              time_remaining: {
                driving_time_remaining: result.clock.driving_time_remaining || 0,
                on_duty_time_remaining: result.clock.on_duty_time_remaining || 0,
                cycle_time_remaining: result.clock.cycle_time_remaining || 0,
              },
            })
          } else {
            // No clock in response - update from selected status
            setCurrentStatus("offDuty" as DriverStatus)
            console.log('✅ StatusScreen: Updated local status, clock data will be refetched')
          }
        } catch (error: any) {
          console.error('❌ StatusScreen: Failed to sync off duty status:', error)
          toast.error(error?.message || "Failed to update status. Please try again.")
          // Update local state only (don't make duplicate API calls)
          setCurrentStatus("offDuty" as DriverStatus)
        }
      } else {
        // No clock ID - update local state only
        console.warn('⚠️ StatusScreen: No clock ID available, cannot make API call')
        setCurrentStatus("offDuty" as DriverStatus)
        toast.success("Status updated (no API sync - no clock ID)")
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
        title="Update Your Status"
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
        <View style={{ padding: 16, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.palette.primary500} />
          <Text style={[styles.infoText, { color: colors.textDim, marginTop: 8 }]}>
            {changeDutyStatusMutation.isPending ? "Updating status..." : "Syncing HOS data..."}
          </Text>
        </View>
      )}

      <View style={styles.statusButtons}>
        <StatusButton
          status="driving"
          label="Driving"
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
          label="On Duty (Not Driving)"
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
          label="Off Duty"
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
          label="Sleeper Berth"
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
                currentStatus === "personalConveyance" ? (isDark ? "#000" : "#fff") : colors.palette.primary500
              }
            />
          }
        />

        <StatusButton
          status="yardMoves"
          label="Yard Moves"
          isActive={currentStatus === "yardMoves"}
          onPress={() => handleStatusChange("yardMoves")}
          icon={
            <MoreHorizontal
              size={20}
              color={currentStatus === "yardMoves" ? (isDark ? "#000" : "#fff") : colors.warning}
            />
          }
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Sleep Settings</Text>

      <ElevatedCard>
        <View style={styles.splitSleepRow}>
          <View style={styles.splitSleepInfo}>
            <Text style={[styles.splitSleepLabel, { color: colors.text }]}>Split Sleep Toggle</Text>
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
                color: (hosClock?.driving_time_remaining ?? hoursOfService.driveTimeRemaining) < 60 ? colors.error : colors.text,
              },
            ]}
          >
            {formatDuration(hosClock?.driving_time_remaining ?? hoursOfService.driveTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Shift Time Remaining:</Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hosClock?.on_duty_time_remaining ?? hoursOfService.shiftTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Cycle Time Remaining:</Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hosClock?.cycle_time_remaining ?? hoursOfService.cycleTimeRemaining)}
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
              You have less than {formatDuration(hoursOfService.driveTimeRemaining)} of driving time
              remaining. Plan to take a break soon.
            </Text>
          </View>
        </ElevatedCard>
      )}

      <Text style={[styles.infoText, { color: colors.textDim }]}>
        Remember to update your status whenever your duty status changes to maintain accurate records.
      </Text>

      {/* Reason Selection Modal */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Reason for {selectedStatus ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1).replace(/([A-Z])/g, ' $1') : ''}
            </Text>

            <ScrollView style={{ maxHeight: 300, marginBottom: 20 }}>
              <View style={styles.reasonChipsContainer}>
                {selectedStatus && getStatusReasons(selectedStatus).map((reason) => {
                  const isSelected = !isOtherSelected && selectedReason === reason.text
                  const isOther = reason.text === "Other"
                  const isOtherOptionSelected = isOther && isOtherSelected
                  
                  return (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: (isSelected || isOtherOptionSelected) ? colors.palette.primary500 : colors.cardBackground,
                          borderColor: (isSelected || isOtherOptionSelected) ? colors.palette.primary500 : colors.border,
                        },
                      ]}
                      onPress={() => handleReasonSelect(reason.text)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          {
                            color: (isSelected || isOtherOptionSelected) ? "#fff" : colors.text,
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.primaryModalButton,
                  { 
                    backgroundColor: colors.palette.primary500,
                    opacity: ((!isOtherSelected && selectedReason) || (isOtherSelected && otherReasonText.trim())) && !isSubmittingStatus ? 1 : 0.5 
                  },
                ]}
                disabled={((!isOtherSelected && !selectedReason) || (isOtherSelected && !otherReasonText.trim())) || isSubmittingStatus}
                onPress={handleConfirmStatusChange}
              >
                {isSubmittingStatus ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                <Text style={[styles.secondaryModalButtonText, { color: colors.palette.primary500 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
                    opacity: (isGoingOffDuty || isSigningOut) ? 0.6 : 1 
                  }
                ]}
                disabled={isGoingOffDuty || isSigningOut}
                onPress={handleGoOffDutyAndSignOut}
              >
                {isSigningOut ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.primaryModalButtonText}>Signing out...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryModalButtonText}>Go Off Duty & Sign Out</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.secondaryModalButton,
                  { opacity: (isGoingOffDuty || isSigningOut) ? 0.6 : 1 }
                ]}
                disabled={isGoingOffDuty || isSigningOut}
                onPress={() => handleGoOffDuty("End of shift")}
              >
                {isGoingOffDuty ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.palette.primary500} />
                    <Text style={[styles.secondaryModalButtonText, { color: colors.palette.primary500 }]}>
                      Updating...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.secondaryModalButtonText, { color: colors.palette.primary500 }]}>
                    Go Off Duty
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.secondaryModalButton,
                  { opacity: (isGoingOffDuty || isSigningOut) ? 0.6 : 1 }
                ]}
                disabled={isGoingOffDuty || isSigningOut}
                onPress={() => setShowDoneForDayModal(false)}
              >
                <Text style={[styles.secondaryModalButtonText, { color: colors.palette.primary500 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign out loading modal */}
      <Modal
        visible={isSigningOut}
        transparent
        animationType="fade"
      >
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
  primaryModalButton: {
    backgroundColor: "#0071ce", // Will be overridden by inline style
  },
  primaryModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
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
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
   backButton: {
    padding: 8,
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 10,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  otherInputContainer: {
    marginTop: 16,
    width: '100%',
  },
  otherInputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  otherTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
})
