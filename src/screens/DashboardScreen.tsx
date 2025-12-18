import React, { useMemo, useEffect, useCallback, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  Pressable,
  Linking,
  StatusBar,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect } from "expo-router"
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet"
import { format } from "date-fns/format"
import i18n from "i18next"
import {
  FileCheck,
  BookOpen,
  Bell,
  AlertTriangle,
  BluetoothConnectedIcon,
  Building2Icon,
  Settings,
  User,
  LogOut,
} from "lucide-react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated"

import {
  useHOSClocks,
  useHOSLogs,
  useViolations,
  useMyVehicle,
  useMyTrips,
} from "@/api/driver-hooks"
import { useNotifications, useMarkAllNotificationsRead } from "@/api/driver-hooks"
import { useTrailerAssignments } from "@/api/trailers"
import { DriverInfoSection } from "@/components/DriverInfoSection"
import { DtcIndicator } from "@/components/DtcIndicator"
import { EldGpsWarning } from "@/components/EldGpsWarning"
import { EldMalfunctionModal } from "@/components/EldMalfunctionModal"
import { ExemptDriverBadge } from "@/components/ExemptDriverBadge"
import { Header } from "@/components/Header"
import { HistoryFetchSheet } from "@/components/HistoryFetchSheet"
import { InactivityPrompt } from "@/components/InactivityPrompt"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { LiveVehicleData } from "@/components/LiveVehicleData"
import { MandatorySetupScreen } from "@/components/MandatorySetupScreen"
import { NotificationsPanel } from "@/components/NotificationsPanel"
import { RideOverviewCard } from "@/components/RideOverviewCard"
import { StatusIconsRow } from "@/components/StatusIconsRow"
import { Text } from "@/components/Text"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { UnifiedHOSCard, UnifiedHOSCardRef } from "@/components/UnifiedHOSCard"
import { ViolationBanner } from "@/components/ViolationBanner"
import { ViolationModal } from "@/components/ViolationModal"
import { ViolationToast } from "@/components/ViolationToast"
import { usePermissions, useStatus } from "@/contexts"
import { useHOSStatusContext } from "@/contexts/hos-status-context"
import { useLocation } from "@/contexts/location-context"
import { useObdData } from "@/contexts/obd-data-context"
import { useViolationNotifications } from "@/contexts/ViolationNotificationContext"
import { useLanguage } from "@/hooks/useLanguage"
import { useLocationData } from "@/hooks/useLocationData"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useStatusStore } from "@/stores/statusStore"
import { useAppTheme } from "@/theme/context"
import { applyShadow } from "@/theme/shadows"
import { mapDriverStatusToAppStatus, mapHOSStatusToAuthFormat } from "@/utils/hos-status-mapper"

export const DashboardScreen = React.memo(() => {
  // Trigger re-render when language changes
  useLanguage()

  // Get theme colors - supports both light and dark themes
  const { theme, themeContext } = useAppTheme()
  const { colors } = theme
  const isDark = themeContext === "dark"

  const {
    user,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    updateHosStatus,
    logout,
  } = useAuth()
  const { logEntries, certification, hoursOfService } = useStatus()
  const { requestPermissions } = usePermissions()
  const { currentLocation } = useLocation()
  const locationData = useLocationData()
  const {
    obdData,
    isConnected: eldConnected,
    recentAutoDutyChanges,
    showInactivityPrompt,
    setShowInactivityPrompt,
    activeMalfunction,
    setActiveMalfunction,
    gpsWarningVisible,
    gpsLossDurationMinutes,
    setGpsWarningVisible,
    onGpsNoteAdded,
  } = useObdData()
  const { setCurrentStatus, setHoursOfService } = useStatusStore()

  // Ref for UnifiedHOSCard to open status modal
  const unifiedHOSCardRef = useRef<UnifiedHOSCardRef>(null)

  // Violation notifications from WebSocket
  const { criticalViolations, highPriorityViolations, mediumPriorityViolations, removeViolation } =
    useViolationNotifications()

  // Vehicle and Trip assignment checks
  const { isLoading: vehicleLoading } = useMyVehicle(isAuthenticated)
  const { data: tripsData, isLoading: tripsLoading } = useMyTrips(
    { status: "active" },
    isAuthenticated,
  )

  // Get trailer assignments for trailer number
  const { data: trailerAssignments } = useTrailerAssignments(
    { driver: driverProfile?.driver_id || undefined, status: "active" },
    { enabled: isAuthenticated && !!driverProfile?.driver_id },
  )

  // Get trailer number from assignments (primary trailer)
  const trailerNo = useMemo(() => {
    if (vehicleAssignment?.vehicle_info?.vehicle_unit) {
      return `TRAILER_${new Date().getMilliseconds()}`
    }
    return (
      vehicleAssignment?.vehicle_info?.vehicle_unit || `TRAILER_${new Date().getMilliseconds()}`
    )
  }, [vehicleAssignment])

  const hasVehicleAssignment = useMemo(
    () =>
      Boolean(
        vehicleAssignment?.has_vehicle_assigned &&
          vehicleAssignment?.vehicle_info &&
          vehicleAssignment?.vehicle_info.status === "active",
      ),
    [vehicleAssignment],
  )

  const activeTrip = useMemo(() => {
    if (!tripsData?.trips) return null
    const activeTrips = tripsData.trips.filter(
      (t) => t.status === "active" || t.status === "assigned",
    )
    return activeTrips.length > 0 ? activeTrips[0] : tripsData.trips[0]
  }, [tripsData])

  const hasTrip = useMemo(() => !!activeTrip, [activeTrip])
  const shipperId = useMemo(() => `SHIP_${user?.id?.toString()?.slice(0, 8)}` ?? null, [user?.id])
  const hasShipperId = useMemo(() => Boolean(shipperId), [shipperId])

  // HOS/ELD can be used if (vehicle OR trip) is assigned AND shipping ID is present
  // Either vehicle assignment OR trip assignment is sufficient
  const requiresMandatorySetup = useMemo(
    () => (!hasVehicleAssignment && !hasTrip) || !hasShipperId,
    [hasVehicleAssignment, hasTrip, hasShipperId],
  )
  const canUseHOS = useMemo(
    () => (hasVehicleAssignment || hasTrip) && hasShipperId,
    [hasVehicleAssignment, hasTrip, hasShipperId],
  )
  const canUseELD = useMemo(
    () => (hasVehicleAssignment || hasTrip) && hasShipperId,
    [hasVehicleAssignment, hasTrip, hasShipperId],
  )
  const showMandatorySetup = useMemo(
    () => !vehicleLoading && !tripsLoading && requiresMandatorySetup,
    [vehicleLoading, tripsLoading, requiresMandatorySetup],
  )

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showHistoryFetchSheet, setShowHistoryFetchSheet] = useState(false)
  const handleLogoPress = useCallback(() => {
    Linking.openURL("https://ttmkonnect.com").catch((error) =>
      console.warn("Failed to open ttmkonnect.com", error),
    )
  }, [])

  const handleAddVehicle = useCallback(() => {
    router.push("/assignments" as any)
  }, [])

  const handleAddShipperId = useCallback(() => {
    router.push("/assignments" as any)
  }, [])

  // ScrollView ref for scrolling to HOS section
  const scrollViewRef = useRef<ScrollView>(null)
  const hosSectionRef = useRef<View>(null)
  const [hosSectionY, setHosSectionY] = useState<number | null>(null)
  const driverInfoSheetRef = useRef<BottomSheetModal>(null)
  const driverInfoSnapPoints = useMemo(() => ["75%"], [])

  // Fetch notifications using new driver API
  useFocusEffect(
    useCallback(() => {
      requestPermissions({ skipIfGranted: true }).catch((error) =>
        console.warn("⚠️ Dashboard: Permission request failed:", error),
      )
      return undefined
    }, [requestPermissions]),
  )

  const { data: notificationsData, refetch: refetchNotifications } = useNotifications({
    status: "unread",
    limit: 50,
    enabled: isAuthenticated,
    refetchInterval: 60000, // 60 seconds
  })
  const markAllReadMutation = useMarkAllNotificationsRead()

  // Fetch violations
  const { data: violationsData } = useViolations(isAuthenticated)

  // Filter to only unresolved violations
  const unresolvedViolations = useMemo(() => {
    if (!violationsData?.violations) return []
    return violationsData.violations.filter((v: any) => v.resolved === false)
  }, [violationsData])

  // Get HOS status from context (polls every 30s)
  const {
    hosStatus: contextHOSStatus,
    isLoading: isHOSLoading,
    error: hosError,
    refetch: refetchHOSClock,
  } = useHOSStatusContext()

  // Get detailed HOS clocks when dashboard is focused
  const [isDashboardFocused, setIsDashboardFocused] = useState(true)
  const { data: hosClocks } = useHOSClocks(isDashboardFocused && isAuthenticated)

  // Request location non-blocking on mount (for fallback when ELD not available)
  useEffect(() => {
    // Request location in background without blocking
    locationData.refreshLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Track if we've already started ELD reporting to prevent duplicate calls
  const eldReportingStartedRef = useRef(false)

  // Automatically start ELD reporting when dashboard loads/focuses and ELD is connected
  const checkAndStartEldReporting = useCallback(async () => {
    try {
      // Only proceed if authenticated
      if (!isAuthenticated) {
        console.log("⏭️ Dashboard: Skipping ELD reporting check - not authenticated")
        return
      }

      // Import service
      const JMBluetoothService = require("@/services/JMBluetoothService").default

      // Check connection status from native module
      const status = await JMBluetoothService.getConnectionStatus()
      console.log("🔍 Dashboard: Connection status check:", status)

      if (status.isConnected) {
        // Prevent duplicate calls
        if (eldReportingStartedRef.current) {
          console.log("ℹ️ Dashboard: ELD reporting already started, skipping duplicate call")
          return
        }

        console.log("✅ Dashboard: ELD is connected, starting ELD reporting...")

        // Wait a bit for stable connection
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Double-check connection is still stable
        const recheckStatus = await JMBluetoothService.getConnectionStatus()
        console.log("🔍 Dashboard: Rechecking connection status:", recheckStatus)

        if (recheckStatus.isConnected && !eldReportingStartedRef.current) {
          console.log("📊 Dashboard: Starting ELD reporting from dashboard...")
          try {
            const result = await JMBluetoothService.startReportEldData()
            console.log("✅ Dashboard: ELD reporting start result:", result)
            if (result) {
              console.log("✅ Dashboard: ELD reporting started successfully")
              eldReportingStartedRef.current = true
            } else {
              console.warn("⚠️ Dashboard: ELD reporting start returned false")
            }
          } catch (error) {
            console.error("❌ Dashboard: Exception starting ELD reporting:", error)
          }
        } else {
          if (!recheckStatus.isConnected) {
            console.log("⚠️ Dashboard: Connection lost during wait period")
          } else {
            console.log("ℹ️ Dashboard: ELD reporting already started")
          }
        }
      } else {
        console.log("ℹ️ Dashboard: ELD not connected, skipping ELD reporting start")
        eldReportingStartedRef.current = false // Reset flag when disconnected
      }
    } catch (error) {
      console.error("❌ Dashboard: Error checking ELD connection:", error)
    }
  }, [isAuthenticated])

  // Run when screen comes into focus (when user navigates to dashboard)
  useFocusEffect(
    useCallback(() => {
      console.log("📱 Dashboard: Screen focused - checking ELD connection...")

      // Wait a bit for screen to fully mount
      const timeout = setTimeout(() => {
        checkAndStartEldReporting()
      }, 1000)

      return () => {
        clearTimeout(timeout)
      }
    }, [checkAndStartEldReporting]),
  )

  // Also run on mount and when connection status changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkAndStartEldReporting()
    }, 2000) // Wait 2 seconds after mount

    return () => {
      clearTimeout(timeout)
    }
  }, [checkAndStartEldReporting, eldConnected]) // Re-run when connection status changes

  // Reset flag when disconnected
  useEffect(() => {
    if (!eldConnected) {
      eldReportingStartedRef.current = false
      console.log("🔄 Dashboard: ELD disconnected, reset ELD reporting flag")
    }
  }, [eldConnected])

  // Get today's HOS logs for chart (new API uses single date)
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0] // YYYY-MM-DD
  const {
    data: todayHOSLogs,
    isLoading: isHOSLogsLoading,
    refetch: refetchHOSLogs,
  } = useHOSLogs(
    todayStr, // Just date string YYYY-MM-DD
    isAuthenticated && !!driverProfile?.driver_id,
  )

  // Sync HOS status data to auth store and status store when it updates
  useEffect(() => {
    if (contextHOSStatus && isAuthenticated) {
      console.log("🔄 Dashboard: Syncing HOS status data from backend", contextHOSStatus)

      // Map HOSCurrentStatus to HOSStatus format for auth store
      const mappedStatus = mapHOSStatusToAuthFormat(contextHOSStatus)
      if (user?.firstName && user?.lastName) {
        mappedStatus.driver_name = `${user.firstName} ${user.lastName}`
      }
      updateHosStatus(mappedStatus)

      // Sync current status from new API response
      const appStatus = mapDriverStatusToAppStatus(contextHOSStatus.current_status)
      setCurrentStatus(appStatus)

      // Sync HOS times to status store
      setHoursOfService({
        driveTimeRemaining: contextHOSStatus.clocks.drive.remaining_minutes || 0,
        shiftTimeRemaining: contextHOSStatus.clocks.shift.remaining_minutes || 0,
        cycleTimeRemaining: contextHOSStatus.clocks.cycle.remaining_minutes || 0,
        breakTimeRemaining: hoursOfService.breakTimeRemaining, // Keep existing break time
        lastCalculated: Date.now(),
      })
    }
  }, [
    contextHOSStatus,
    isAuthenticated,
    updateHosStatus,
    setCurrentStatus,
    setHoursOfService,
    hoursOfService.breakTimeRemaining,
    user?.firstName,
    user?.lastName,
  ])

  // Track dashboard focus for detailed clocks
  useFocusEffect(
    useCallback(() => {
      setIsDashboardFocused(true)
      return () => setIsDashboardFocused(false)
    }, []),
  )

  // Log HOS sync errors
  useEffect(() => {
    if (hosError) {
      console.error("❌ Dashboard: HOS sync error", hosError)
    }
  }, [hosError])

  // Shorten location address - use locationData hook which prioritizes ELD -> Expo -> fallback

  // Extract speed and fuel level from OBD data
  const currentSpeed = useMemo(() => {
    const speedItem = obdData.find(
      (item) =>
        item.name.includes("Vehicle Speed") || item.name.includes("Wheel-Based Vehicle Speed"),
    )
    return speedItem ? parseFloat(speedItem.value) || 0 : 0
  }, [obdData])

  const fuelLevel = useMemo(() => {
    const fuelItem = obdData.find(
      (item) => item.name.includes("Fuel Level") || item.name.includes("Fuel Level Input"),
    )
    return fuelItem ? parseFloat(fuelItem.value) || 0 : 0
  }, [obdData])

  const data = useMemo(() => {
    if (!isAuthenticated || !user || !driverProfile || !hosStatus) {
      return {
        appTitle: "TTM Konnect",
        connected: false,
        driver: "Loading...",
        coDriver: "N/A",
        truck: "N/A",
        trailer: "N/A",
        duty: "OFF_DUTY",
        cycleLabel: "USA 70 hours / 8 days",
        stopIn: 0,
        driveLeft: 0,
        shiftLeft: 0,
        cycleLeft: 0,
        cycleDays: 0,
        dateTitle: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        vehicleUnit: "N/A",
      }
    }

    // Use new API status data, fallback to auth store hosStatus
    const drivingTimeRemaining =
      contextHOSStatus?.clocks?.drive?.remaining_minutes ??
      hosStatus.driving_time_remaining ??
      hosStatus.time_remaining?.driving_time_remaining ??
      0
    const onDutyTimeRemaining =
      contextHOSStatus?.clocks?.shift?.remaining_minutes ??
      hosStatus.on_duty_time_remaining ??
      hosStatus.time_remaining?.on_duty_time_remaining ??
      0
    const cycleTimeRemaining =
      contextHOSStatus?.clocks?.cycle?.remaining_minutes ??
      hosStatus.cycle_time_remaining ??
      hosStatus.time_remaining?.cycle_time_remaining ??
      0

    const cycleDays = Math.ceil(cycleTimeRemaining / (24 * 60))

    const vehicleInfo = vehicleAssignment?.vehicle_info
    const vehicleUnit = vehicleInfo?.vehicle_unit || "N/A"
    const truckMake = vehicleInfo?.make || "N/A"
    const truckModel = vehicleInfo?.model || "N/A"
    const truckYear = vehicleInfo?.year || "N/A"
    const licensePlate = vehicleInfo?.license_plate || "N/A"
    const vin = vehicleInfo?.vin || "N/A"

    const currentDate = new Date()
    const dateTitle = `Today | ${currentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    })}`

    const orgName = organizationSettings?.organization_name || "TTM Konnect"

    // Calculate uncertified count from HOS logs API or local logEntries
    let uncertifiedLogsCount = 0
    // New API returns { date, logs, summary, is_certified }
    const logsArray = todayHOSLogs?.logs || []
    if (logsArray.length > 0 && todayHOSLogs) {
      // Check if daily log is certified
      if (!todayHOSLogs.is_certified) {
        uncertifiedLogsCount = logsArray.length
      }
    } else {
      // Fallback to local logEntries
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)
      uncertifiedLogsCount = logEntries.filter((log) => {
        const logDate = new Date(log.startTime)
        return logDate >= todayStart && logDate <= todayEnd && !log.isCertified
      }).length
    }

    return {
      appTitle: orgName,
      connected: true,
      driver: `${user.firstName} ${user.lastName}`,
      coDriver: "N/A",
      truck: vehicleUnit,
      trailer: "N/A",
      duty:
        contextHOSStatus?.current_status?.toUpperCase() ?? hosStatus.current_status ?? "OFF_DUTY",
      cycleLabel: (() => {
        // Get cycle type from new API response
        const cycleType =
          contextHOSStatus?.clocks?.cycle?.type || hosClocks?.cycle_60_70hr?.cycle_type
        if (cycleType) {
          // Format: "70_8" -> "USA 70 hours / 8 days"
          const parts = cycleType.split("_")
          const hours = parts[0] || "70"
          const days = parts[1] || "8"
          return `USA ${hours} hours / ${days} days`
        }
        return organizationSettings?.hos_settings?.cycle_type || "USA 70 hours / 8 days"
      })(),
      stopIn: onDutyTimeRemaining,
      driveLeft: drivingTimeRemaining,
      shiftLeft: onDutyTimeRemaining,
      cycleLeft: cycleTimeRemaining,
      cycleDays: cycleDays,
      dateTitle: dateTitle,
      vehicleUnit: vehicleUnit,
      truckMake: truckMake,
      truckModel: truckModel,
      truckYear: truckYear,
      licensePlate: licensePlate,
      vin: vin,
      uncertifiedLogsCount: uncertifiedLogsCount,
      isCertified: certification.isCertified,
    }
  }, [
    user,
    driverProfile,
    hosStatus,
    contextHOSStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    logEntries,
    certification,
    todayHOSLogs,
  ]) as any

  const currentLocationLabel = useMemo(() => {
    const address = currentLocation?.address || locationData.address
    if (address) {
      const parts = address.split(",").map((part) => part.trim())
      return parts.slice(0, 2).join(", ")
    }
    if (currentLocation?.latitude && currentLocation?.longitude) {
      return `${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)}`
    }
    return translate("dashboard.locationUnavailable" as any)
  }, [
    currentLocation?.address,
    currentLocation?.latitude,
    currentLocation?.longitude,
    locationData.address,
  ])

  const vehicleInfo = vehicleAssignment?.vehicle_info
  const vehicleNameLabel = useMemo(() => {
    if (vehicleInfo) {
      const makeModel = [vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(" ")
      const parts = [vehicleInfo.vehicle_unit, makeModel].filter(
        (value) => value && value.length > 0,
      )
      if (parts.length > 0) {
        return parts.join(" • ")
      }
    }
    return data.vehicleUnit && data.vehicleUnit !== "N/A" ? data.vehicleUnit : "No vehicle assigned"
  }, [vehicleInfo, data.vehicleUnit])

  const driverName = useMemo(() => {
    if (user?.name) return user.name
    return data.driver
  }, [driverProfile?.name, user?.name, data.driver])

  const driverInitials = useMemo(() => {
    const name = driverName || "Driver"
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const initials = parts.map((part: string) => part.charAt(0).toUpperCase()).join("")
    return initials || "DR"
  }, [driverName])

  // Time-based greeting with translations
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: translate("dashboard.greeting.morning" as any), emoji: "🌅" }
    if (hour < 17) return { text: translate("dashboard.greeting.afternoon" as any), emoji: "☀️" }
    return { text: translate("dashboard.greeting.evening" as any), emoji: "🌙" }
  }, [])

  // Formatted date with locale support
  const formattedDate = useMemo(() => {
    const date = new Date()
    // Get locale from i18n
    const locale = i18n.language?.split("-")[0] || "en"
    let dateFnsLocale
    try {
      switch (locale) {
        case "es":
          dateFnsLocale = require("date-fns/locale/es").default
          break
        case "en":
        default:
          dateFnsLocale = require("date-fns/locale/en-US").default
          break
      }
    } catch {
      dateFnsLocale = require("date-fns/locale/en-US").default
    }
    return format(date, "EEE, d MMM yyyy", { locale: dateFnsLocale })
  }, [])

  // Notification count
  const notificationCount = useMemo(() => {
    if (!notificationsData) return 0
    // Check if it's the driver API format (has results array)
    if ("results" in notificationsData && Array.isArray(notificationsData.results)) {
      return notificationsData.results.length
    }
    // Check if it's the notifications API format (has notifications array)
    if (
      "notifications" in notificationsData &&
      Array.isArray((notificationsData as any).notifications)
    ) {
      return (notificationsData as any).notifications.length
    }
    return 0
  }, [notificationsData])

  const renderDriverBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  )

  const handleOpenDriverSheet = useCallback(() => {
    driverInfoSheetRef.current?.present()
  }, [])

  const handleCloseDriverSheet = useCallback(() => {
    driverInfoSheetRef.current?.dismiss()
  }, [])

  // Convert HOS logs API response to chart format
  // New API returns { date, logs, summary, is_certified }
  const logs = useMemo(() => {
    const logsArray = todayHOSLogs?.logs || []
    if (logsArray.length === 0) {
      return []
    }

    // Convert HOS logs to chart format
    // API returns individual log entries with start_time, end_time (or null if ongoing), duty_status
    const chartLogs: Array<{ start: string; end: string; status: string; note?: string }> = []

    logsArray.forEach((log: any) => {
      if (log.start_time && log.duty_status) {
        const status = mapDriverStatusToAppStatus(log.duty_status)
        // If end_time is null, use current time for ongoing status
        const endTime = log.end_time || new Date().toISOString()

        chartLogs.push({
          start: log.start_time,
          end: endTime,
          status: status,
          note: "",
        })
      }
    })

    // Sort by start time
    chartLogs.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return chartLogs
  }, [todayHOSLogs])

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Refetch all data
      await Promise.all([
        refetchHOSClock(),
        refetchHOSLogs(),
        refetchNotifications(),
        locationData.refreshLocation(),
      ])
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchHOSClock, refetchHOSLogs, refetchNotifications, locationData])

  const time = (m: number) =>
    `${String(Math.floor(Math.round(m) / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`

  const cycleTime = (m: number) =>
    `${Math.floor(Math.round(m) / 60)}:${String(Math.round(m) % 60).padStart(2, "0")}`

  const pct = (remain: number, total: number) =>
    Math.max(0, Math.min(100, ((total - remain) / total) * 100))

  const getDutyStatusStyle = (status: string) => {
    const normalizedStatus = status.toUpperCase()
    switch (normalizedStatus) {
      case "DRIVING":
        return {
          backgroundColor: colors.warningBackground,
          borderColor: colors.warning,
          textColor: colors.warning,
        }
      case "ON_DUTY":
      case "ON-DUTY":
        return {
          backgroundColor: colors.palette.primary100,
          borderColor: colors.tint,
          textColor: colors.tint,
        }
      case "OFF_DUTY":
      case "OFF-DUTY":
        return {
          backgroundColor: colors.sectionBackground,
          borderColor: colors.border,
          textColor: colors.textDim,
        }
      case "SLEEPER":
        return {
          backgroundColor: colors.warningBackground,
          borderColor: colors.warning,
          textColor: colors.warning,
        }
      default:
        return {
          backgroundColor: colors.sectionBackground,
          borderColor: colors.border,
          textColor: colors.textDim,
        }
    }
  }

  // Animated pulse for vehicle info card icon
  const vehicleIconScale = useSharedValue(1)
  const vehicleIconOpacity = useSharedValue(1)

  useEffect(() => {
    vehicleIconScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )
    vehicleIconOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )

    // Cleanup: Cancel animations on unmount to prevent "Illegal node ID" errors
    return () => {
      cancelAnimation(vehicleIconScale)
      cancelAnimation(vehicleIconOpacity)
    }
  }, [])

  // Removed excessive location requests - location is handled by:
  // 1. useLocationData hook (line 61) - automatically refreshes and prioritizes ELD location
  // 2. Initial mount refresh (line 68) - only runs once on mount
  // No need for additional requestLocation calls that cause excessive logs

  // Handle notification bell press - navigate directly to notification destination
  const handleNotificationBellPress = useCallback(async () => {
    // New API returns { count, limit, results }
    const notifications = notificationsData?.results || []
    if (notifications.length === 0) {
      // No notifications, open panel as fallback
      setShowNotifications(true)
      return
    }

    // Get first unread notification, or latest notification if all are read
    const unreadNotifications = notifications.filter((n: any) => !n.is_read)
    const targetNotification =
      unreadNotifications.length > 0
        ? unreadNotifications[0] // First unread
        : notifications[0] // Latest if all read

    // Mark as read if unread (using markAllRead for simplicity, or implement single mark)
    if (!targetNotification.is_read) {
      await markAllReadMutation.mutateAsync()
    }

    // Handle profile change notifications
    if (
      targetNotification.notification_type === "profile_change_approved" ||
      targetNotification.notification_type === "profile_change_rejected"
    ) {
      router.push({
        pathname: "/profile-requests",
        params: { notificationId: targetNotification.id },
      } as any)
      return
    }

    // Navigate to action if available (check data.action)
    if (
      targetNotification.data?.action &&
      !targetNotification.data.action.includes("/driver/profile/requests")
    ) {
      router.push(targetNotification.data.action as any)
      return
    }

    // Fallback: open notifications panel if no action
    setShowNotifications(true)
  }, [notificationsData, markAllReadMutation])

  // Dynamic styles based on theme
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { backgroundColor: colors.background, flex: 1, marginTop: 0 },
        cc: { paddingBottom: 80 }, // Extra padding for floating logout button

        // Top Header
        topHeader: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: 20,
          paddingHorizontal: 20,
          paddingTop: 60,
        },
        profileSection: {
          alignItems: "center",
          flexDirection: "row",
          gap: 12,
        },
        avatarText: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "900",
        },
        locationInfo: {
          gap: 4,
        },
        locationRow: {
          alignItems: "center",
          flexDirection: "row",
          gap: 4,
        },
        locationTitle: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "600",
        },
        locationAddress: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
        },
        notificationBtn: {
          alignItems: "center",
          backgroundColor: "transparent",
          borderRadius: 24,
          height: 68,
          justifyContent: "center",
          position: "relative",
          width: 68,
        },

        // Hero Card
        heroCard: {
          borderRadius: 24,
          flexDirection: "row",
          justifyContent: "space-between",
          marginHorizontal: 20,
          marginTop: 20,
          minHeight: 180,
          overflow: "hidden",
          padding: 24,
        },
        heroContent: {
          flex: 1,
          justifyContent: "center",
        },
        heroTitle: {
          color: colors.text,
          fontSize: 28,
          fontWeight: "900",
          lineHeight: 34,
        },
        heroButton: {
          alignSelf: "flex-start",
          backgroundColor: colors.text,
          borderRadius: 16,
          marginTop: 16,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        heroButtonText: {
          color: colors.tint,
          fontSize: 15,
          fontWeight: "800",
        },
        heroIllustration: {
          bottom: -10,
          position: "absolute",
          right: -10,
        },

        // Status Cards Row
        statusCardsRow: {
          flexDirection: "row",
          gap: 12,
          marginTop: 16,
          paddingHorizontal: 20,
        },
        quickCard: {
          alignItems: "center",
          borderRadius: 20,
          flex: 1,
          padding: 16,
        },
        quickCardIcon: {
          alignItems: "center",
          borderRadius: 22,
          height: 44,
          justifyContent: "center",
          marginBottom: 8,
          width: 44,
        },
        quickCardLabel: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 4,
        },
        quickCardValue: {
          fontSize: 14,
          fontWeight: "800",
        },

        // Professional Header with Greeting
        greetingSection: {
          backgroundColor: colors.tint,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          marginBottom: 20,
          paddingBottom: 30,
          paddingHorizontal: 20,
          paddingTop: 16,
        },
        headerTopRow: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        },
        avatarContainer: {
          alignItems: "center",
          backgroundColor: colors.background,
          borderRadius: 28,
          elevation: 3,
          height: 56,
          justifyContent: "center",
          overflow: "hidden",
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          width: 56,
        },
        avatarLogo: {
          height: 56,
          width: 56,
        },
        dateContainer: {
          alignItems: "center",
          flex: 1,
          flexDirection: "row",
          gap: 6,
          justifyContent: "center",
        },
        dateText: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
        },
        notificationButton: {
          alignItems: "center",
          height: 44,
          justifyContent: "center",
          position: "relative",
          width: 44,
        },
        notificationBadge: {
          alignItems: "center",
          backgroundColor: colors.error,
          borderRadius: 10,
          height: 20,
          justifyContent: "center",
          minWidth: 20,
          paddingHorizontal: 5,
          position: "absolute",
          right: 0,
          top: 0,
        },
        notificationBadgeText: {
          color: colors.background,
          fontSize: 11,
          fontWeight: "700",
        },
        greetingRow: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
        },
        greetingLeft: {
          flex: 1,
        },
        greetingText: {
          color: colors.text,
          fontSize: 26,
          fontWeight: "800",
          lineHeight: 32,
        },
        badgesRow: {
          flexDirection: "row",
          gap: 10,
        },
        badge: {
          alignItems: "center",
          borderRadius: 20,
          flex: 1,
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        badgeGreen: {
          backgroundColor: colors.successBackground,
        },
        badgeOrange: {
          backgroundColor: colors.warningBackground,
        },
        badgeText: {
          color: colors.text,
          fontSize: 12,
          fontWeight: "600",
        },

        // Service Card (Hours of Service)
        serviceCard: {
          backgroundColor: colors.cardBackground,
          borderRadius: 24,
          elevation: 2,
          marginHorizontal: 20,
          marginTop: 10,
          padding: 20,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        serviceHeader: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        },
        serviceHeaderLeft: {
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
        },
        serviceTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
        },
        violationBadge: {
          alignItems: "center",
          backgroundColor: colors.error,
          borderRadius: 10,
          flexDirection: "row",
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
        },
        violationBadgeText: {
          color: colors.text,
          fontSize: 11,
          fontWeight: "700",
        },
        viewAllText: {
          color: colors.tint,
          fontSize: 13,
          fontWeight: "600",
        },
        currentStatusRow: {
          marginBottom: 16,
        },
        statusBadge: {
          alignSelf: "flex-start",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
        },
        statusBadgeText: {
          fontSize: 13,
          fontWeight: "700",
        },
        cannotDriveText: {
          color: colors.error,
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        mainTimerWrapper: {
          alignItems: "center",
          marginBottom: 20,
        },
        mainTimerLabel: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 12,
        },
        violationIndicator: {
          alignItems: "center",
          flexDirection: "row",
          gap: 4,
          marginTop: 6,
        },
        violationText: {
          color: colors.error,
          fontSize: 11,
          fontWeight: "700",
        },
        clocksGrid: {
          flexDirection: "row",
          gap: 16,
          justifyContent: "space-around",
        },
        clockItem: {
          alignItems: "center",
          flex: 1,
          gap: 8,
        },
        circularProgressWrapper: {
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        },
        circularProgressText: {
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
        },
        circularClockValue: {
          fontSize: 14,
          fontWeight: "800",
        },
        clockHeader: {
          alignItems: "center",
          flexDirection: "row",
          gap: 6,
          justifyContent: "space-between",
        },
        clockLabel: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "600",
        },
        clockValue: {
          fontSize: 20,
          fontWeight: "800",
        },
        clockProgressBar: {
          backgroundColor: colors.border,
          borderRadius: 3,
          height: 4,
          overflow: "hidden",
        },
        clockProgressFill: {
          borderRadius: 3,
          height: "100%",
        },
        cycleDaysText: {
          color: colors.textDim,
          fontSize: 11,
          fontWeight: "500",
        },
        breakOffDutyRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
        },
        breakAlert: {
          alignItems: "center",
          backgroundColor: colors.warningBackground,
          borderRadius: 8,
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        breakAlertText: {
          color: colors.warning,
          fontSize: 11,
          fontWeight: "600",
        },
        offDutyAlert: {
          alignItems: "center",
          backgroundColor: colors.infoBackground,
          borderRadius: 8,
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        offDutyAlertText: {
          color: colors.info,
          fontSize: 11,
          fontWeight: "600",
        },
        splitSleeperInfo: {
          backgroundColor: colors.background,
          borderRadius: 8,
          marginTop: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        splitSleeperText: {
          color: colors.textDim,
          fontSize: 11,
          fontWeight: "500",
        },
        violationsSummary: {
          alignItems: "center",
          backgroundColor: colors.errorBackground,
          borderRadius: 8,
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        violationsSummaryText: {
          color: colors.error,
          fontSize: 12,
          fontWeight: "700",
        },
        signButton: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderRadius: 12,
          justifyContent: "center",
          marginTop: 16,
          paddingHorizontal: 24,
          paddingVertical: 14,
        },
        signButtonText: {
          color: colors.cardBackground,
          fontSize: 16,
          fontWeight: "700",
        },
        bigTimerSection: {
          alignItems: "center",
          backgroundColor: colors.background,
          borderRadius: 16,
          marginBottom: 20,
          paddingVertical: 24,
        },
        bigTimerLabel: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 8,
        },
        bigTimerValue: {
          color: colors.text,
          fontSize: 48,
          fontWeight: "900",
        },
        bigTimerSubtext: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
          marginTop: 4,
        },
        horizontalStats: {
          flexDirection: "row",
          marginBottom: 20,
        },
        statItem: {
          alignItems: "center",
          flex: 1,
        },
        statIconCircle: {
          alignItems: "center",
          backgroundColor: colors.background,
          borderRadius: 18,
          height: 36,
          justifyContent: "center",
          marginBottom: 8,
          width: 36,
        },
        statItemLabel: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 4,
        },
        statItemValue: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "900",
          marginBottom: 8,
        },
        miniBar: {
          backgroundColor: colors.border,
          borderRadius: 3,
          height: 6,
          overflow: "hidden",
          width: "80%",
        },
        miniBarFill: {
          borderRadius: 3,
          height: "100%",
        },
        statDivider: {
          backgroundColor: colors.border,
          marginVertical: 8,
          width: 1,
        },
        cycleSection: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 16,
        },
        cycleLabelRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        },
        cycleLabelText: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
        },
        cycleValueText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "800",
        },
        cycleProgressWrapper: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 10,
        },
        cycleProgressBar: {
          backgroundColor: colors.border,
          borderRadius: 4,
          height: 8,
          overflow: "hidden",
        },
        cycleProgressFill: {
          backgroundColor: colors.warning,
          borderRadius: 4,
          height: "100%",
        },

        // Quick Actions Section
        actionsSection: {
          marginTop: 24,
          paddingHorizontal: 20,
        },
        actionsTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
          marginBottom: 16,
        },
        actionsGrid: {
          flexDirection: "row",
          gap: 12,
        },
        actionCard: {
          borderRadius: 20,
          flex: 1,
          overflow: "hidden",
        },
        actionGradient: {
          minHeight: 140,
          padding: 20,
        },
        actionContent: {
          alignItems: "center",
        },
        actionIconContainer: {
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          borderRadius: 32,
          height: 64,
          justifyContent: "center",
          marginBottom: 12,
          width: 64,
        },
        actionTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "900",
          marginBottom: 4,
        },
        actionSubtitle: {
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 13,
          fontWeight: "600",
        },

        // Activity Card
        activityCard: {
          backgroundColor: colors.cardBackground,
          borderRadius: 24,
          elevation: 2,
          marginHorizontal: 20,
          marginTop: 24,
          padding: 20,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        activityHeader: {
          marginBottom: 20,
        },
        activityTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
        },
        activitySubtitle: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 4,
        },
        simpleChart: {
          gap: 12,
        },
        chartRow: {
          backgroundColor: colors.sectionBackground,
          borderRadius: 8,
          height: 24,
          overflow: "hidden",
          position: "relative",
        },
        chartBlock: {
          borderRadius: 6,
          bottom: 0,
          position: "absolute",
          top: 0,
        },
        chartLegend: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 16,
        },
        legendItem: {
          alignItems: "center",
          flexDirection: "row",
          gap: 6,
        },
        legendDot: {
          borderRadius: 5,
          height: 10,
          width: 10,
        },
        legendText: {
          color: colors.text,
          fontSize: 12,
          fontWeight: "600",
        },
        loginHeaderImage: {
          width: "100%",
        },

        fitnessHeader: {
          backgroundColor: colors.cardBackground,
          paddingBottom: 24,
          paddingHorizontal: 20,
          paddingTop: 60,
        },
        profileRow: {
          alignItems: "center",
          flexDirection: "row",
          gap: 12,
          marginBottom: 16,
        },
        avatarCircle: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderRadius: 28,
          height: 56,
          justifyContent: "center",
          width: 56,
        },
        avatarInitial: {
          color: colors.text,
          fontSize: 24,
          fontWeight: "900",
        },
        greetingBlock: { flex: 1 },
        hiText: {
          color: colors.textDim,
          fontSize: 16,
          fontWeight: "500",
        },
        motivationText: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "800",
          marginTop: 2,
        },
        headerActions: {
          flexDirection: "row",
          gap: 12,
        },
        iconButton: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 22,
          height: 44,
          justifyContent: "center",
          position: "relative",
          width: 44,
        },
        redDot: {
          backgroundColor: colors.error,
          borderRadius: 4,
          height: 8,
          position: "absolute",
          right: 8,
          top: 8,
          width: 8,
        },

        progressCard: {
          borderRadius: 24,
          elevation: 4,
          marginHorizontal: 20,
          marginTop: 20,
          overflow: "hidden",
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        progressGradient: { padding: 20 },
        progressHeader: {
          alignItems: "center",
          flexDirection: "row",
          marginBottom: 20,
        },
        progressIconBox: {
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 24,
          height: 48,
          justifyContent: "center",
          marginRight: 12,
          width: 48,
        },
        progressTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
        },
        progressDate: {
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: 13,
          fontWeight: "500",
          marginTop: 2,
        },
        progressStats: {
          flexDirection: "row",
          justifyContent: "space-around",
        },
        progressStatItem: { alignItems: "center" },
        progressStatValue: {
          color: colors.text,
          fontSize: 24,
          fontWeight: "900",
        },
        progressStatLabel: {
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },

        categoriesSection: {
          marginTop: 24,
          paddingLeft: 20,
        },
        sectionHeader: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingRight: 20,
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "800",
        },
        seeAllText: {
          color: colors.tint,
          fontSize: 14,
          fontWeight: "700",
        },
        categoriesScroll: {
          gap: 12,
          paddingRight: 20,
        },
        categoryBox: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 20,
          gap: 8,
          height: 100,
          justifyContent: "center",
          width: 100,
        },
        categoryBoxActive: {
          backgroundColor: colors.tint,
        },
        categoryText: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "700",
        },
        categoryTextActive: {
          color: colors.text,
          fontSize: 13,
          fontWeight: "700",
        },

        overviewSection: {
          marginTop: 24,
          paddingHorizontal: 20,
        },
        circularProgressRow: {
          flexDirection: "row",
          gap: 12,
          marginBottom: 12,
        },
        circularProgressCard: {
          backgroundColor: colors.text,
          borderRadius: 20,
          elevation: 2,
          flex: 1,
          padding: 16,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        overviewCardTitle: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "700",
          marginBottom: 12,
        },
        circularContainer: {
          alignItems: "center",
          justifyContent: "center",
        },
        circleValue: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "900",
        },
        circleLabel: {
          color: colors.textDim,
          fontSize: 11,
          fontWeight: "600",
        },

        popularSection: {
          marginTop: 24,
          paddingHorizontal: 20,
        },
        popularCard: {
          borderRadius: 24,
          elevation: 4,
          overflow: "hidden",
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        popularGradient: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 24,
        },
        popularContent: { flex: 1 },
        popularTitle: {
          color: colors.text,
          fontSize: 22,
          fontWeight: "800",
          lineHeight: 28,
        },
        popularBadge: {
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: 36,
          height: 72,
          justifyContent: "center",
          width: 72,
        },

        loginButton: {
          alignSelf: "flex-start",
          backgroundColor: colors.tint,
          borderRadius: 16,
          marginTop: 16,
          paddingHorizontal: 24,
          paddingVertical: 14,
        },
        loginButtonText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "800",
        },

        // Vehicle Information Card
        vehicleInfoCard: {
          backgroundColor: colors.cardBackground,
          borderRadius: 24,
          elevation: 4,
          marginHorizontal: 20,
          marginTop: 24,
          padding: 20,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        vehicleInfoHeader: {
          alignItems: "center",
          flexDirection: "row",
          gap: 16,
          marginBottom: 20,
        },
        vehicleIconContainer: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderRadius: 16,
          elevation: 6,
          height: 56,
          justifyContent: "center",
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          width: 56,
        },
        vehicleInfoTitle: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "800",
          marginBottom: 4,
        },
        vehicleInfoSubtitle: {
          color: colors.tint,
          fontSize: 14,
          fontWeight: "700",
        },
        vehicleDivider: {
          backgroundColor: colors.border,
          height: 1,
          marginBottom: 20,
        },
        vehicleDetails: {
          gap: 24,
        },
        vehicleDetailSection: {
          gap: 12,
        },
        vehicleDetailHeader: {
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
          marginBottom: 8,
        },
        vehicleSectionTitle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
        },
        vehicleAddressText: {
          color: colors.textDim,
          fontSize: 14,
          fontWeight: "500",
          lineHeight: 20,
          paddingLeft: 24,
        },
        vehicleDetailGrid: {
          flexDirection: "row",
          gap: 16,
        },
        vehicleDetailItem: {
          flex: 1,
          gap: 6,
        },
        vehicleDetailRow: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: 8,
        },
        driverSheet: {
          gap: 16,
          paddingHorizontal: 20,
          paddingVertical: 16,
        },
        driverSheetTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
        },
        driverSheetSection: {
          gap: 4,
        },
        driverSheetLabel: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        driverSheetValue: {
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
        },
        driverSheetSubValue: {
          color: colors.textDim,
          fontSize: 13,
        },
        driverSheetButton: {
          alignSelf: "flex-start",
          backgroundColor: colors.tint,
          borderRadius: 12,
          marginTop: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
        },
        driverSheetButtonText: {
          color: colors.cardBackground,
          fontSize: 14,
          fontWeight: "600",
        },
        vehicleDetailLabel: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        },
        vehicleDetailValue: {
          color: colors.text,
          fontSize: 15,
          fontWeight: "800",
          textAlign: "left",
        },
        vehicleVinText: {
          fontFamily: "monospace",
        },

        debugButton: {
          backgroundColor: colors.tint,
          borderRadius: 12,
          marginTop: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        debugButtonText: {
          color: colors.cardBackground,
          fontSize: 13,
          fontWeight: "700",
        },

        // Notifications Modal
        modalOverlay: {
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          flex: 1,
          justifyContent: "center",
          padding: 20,
        },
        modalContent: {
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          elevation: 10,
          maxWidth: 500,
          overflow: "hidden",
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          width: "100%",
        },

        // Critical Alert Banner
        criticalAlertBanner: {
          alignItems: "center",
          backgroundColor: colors.error,
          borderRadius: 16,
          elevation: 6,
          flexDirection: "row",
          marginHorizontal: 20,
          marginTop: 20,
          padding: 16,
          shadowColor: colors.error,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        alertIconContainer: {
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 24,
          height: 48,
          justifyContent: "center",
          marginRight: 12,
          width: 48,
        },
        alertContent: {
          flex: 1,
        },
        alertTitle: {
          color: colors.cardBackground,
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 4,
        },
        alertMessage: {
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 13,
          fontWeight: "500",
          lineHeight: 18,
        },
      }),
    [colors],
  )

  // Get driver username for header
  const driverUsername = useMemo(() => {
    return driverProfile?.username || user?.email?.split("@")[0] || ""
  }, [driverProfile, user])

  // Logo source based on theme
  const logoSource = useMemo(() => {
    return isDark
      ? require("assets/images/ttm-white-logo-border.png")
      : require("assets/images/ttm-logo.png")
  }, [isDark])

  // Get violation count for header
  const violationCount = useMemo(() => {
    return criticalViolations.length + highPriorityViolations.length
  }, [criticalViolations, highPriorityViolations])

  // Get notification count for header (reuse existing notificationsData)
  const headerNotificationCount = useMemo(() => {
    if (!notificationsData) return 0
    if ("results" in notificationsData && Array.isArray(notificationsData.results)) {
      return notificationsData.results.filter((n: any) => !n.is_read).length
    }
    if (
      "notifications" in notificationsData &&
      Array.isArray((notificationsData as any).notifications)
    ) {
      return (notificationsData as any).notifications.filter((n: any) => !n.is_read).length
    }
    return 0
  }, [notificationsData])

  const handleViolationPress = useCallback(() => {
    router.push("/violations" as any)
  }, [])

  // Unified notification center - combines all alerts
  const { recentMalfunctions } = useObdData()
  const totalAlertsCount = useMemo(() => {
    const dtcCount = recentMalfunctions.reduce((count, record) => count + record.codes.length, 0)
    return violationCount + dtcCount + headerNotificationCount
  }, [violationCount, recentMalfunctions, headerNotificationCount])

  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false)
  const quickActionsRef = useRef<BottomSheetModal>(null)

  const handleAvatarPress = useCallback(() => {
    quickActionsRef.current?.present()
    setShowQuickActionsMenu(true)
  }, [])

  const handleQuickAction = useCallback(async (action: "profile" | "settings" | "logout") => {
    quickActionsRef.current?.dismiss()
    setShowQuickActionsMenu(false)
    if (action === "logout") {
      try {
        await logout()
        router.replace("/login")
      } catch (error) {
        console.error("Logout error:", error)
        // Still navigate to login even if logout fails
        router.replace("/login")
      }
    } else {
      router.push(`/${action}` as any)
    }
  }, [logout])

  const handleUnifiedAlertsPress = useCallback(async () => {
    // Always open notifications panel - show all notifications
    await handleNotificationBellPress()
  }, [handleNotificationBellPress])

  // Header styles
  const headerStyles = useMemo(
    () =>
      StyleSheet.create({
        avatar: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderColor: colors.border,
          borderRadius: 28,
          borderWidth: 2,
          height: 56,
          justifyContent: "center",
          width: 56,
        },
        avatarText: {
          color: colors.buttonPrimaryText,
          fontSize: 20,
          fontWeight: "900",
        },
        badgeText: {
          color: colors.buttonPrimaryText,
          fontSize: 10,
          fontWeight: "700",
        },
        driverInfo: {
          flex: 1,
        },
        driverName: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 4,
        },
        driverUsername: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
        },
        headerContainerStyle: {
          paddingBottom: 20,
          paddingHorizontal: 20,
          paddingTop: 0,
        },
        headerStyle: {
          alignItems: "center",
          minHeight: 76,
        },
        iconButton: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderColor: colors.border,
          borderRadius: 20,
          borderWidth: 1,
          height: 40,
          justifyContent: "center",
          position: "relative",
          width: 40,
        },
        iconWrapper: {
          alignItems: "center",
          height: 40,
          justifyContent: "center",
          width: 40,
        },
        leftSection: {
          alignItems: "center",
          flex: 1,
          flexDirection: "row",
        },
        logo: {
          height: 32,
          resizeMode: "contain",
          width: 120,
        },
        logoContainer: {
          marginRight: 12,
        },
        notificationBadge: {
          backgroundColor: colors.error,
          borderColor: colors.cardBackground,
          borderRadius: 4,
          borderWidth: 1,
          height: 8,
          position: "absolute",
          right: 4,
          top: 4,
          width: 8,
        },
        profileContainer: {
          marginRight: 12,
        },
        rightSection: {
          alignItems: "center",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "flex-end",
          width: 136,
        },
        violationBadge: {
          alignItems: "center",
          backgroundColor: colors.error,
          borderColor: colors.cardBackground,
          borderRadius: 9,
          borderWidth: 2,
          height: 18,
          justifyContent: "center",
          minWidth: 18,
          paddingHorizontal: 4,
          position: "absolute",
          right: -2,
          top: -2,
        },
      }),
    [colors],
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Header
        backgroundColor={colors.background}
        LeftActionComponent={
          <View style={headerStyles.leftSection}>
            {/* TTM Konnect Logo */}
            <View style={headerStyles.logoContainer}>
              <Image source={logoSource} style={headerStyles.logo} />
            </View>
          </View>
        }
        RightActionComponent={
          <View style={headerStyles.rightSection}>
            {/* Language Switcher */}
            <View style={headerStyles.iconWrapper}>
              <LanguageSwitcher compact />
            </View>
            {/* Theme Switcher */}
            <View style={headerStyles.iconWrapper}>
              <ThemeSwitcher compact />
            </View>
            {/* Unified Alerts Center - All alerts in one place */}
            <TouchableOpacity
              style={[headerStyles.iconButton, headerStyles.iconWrapper]}
              onPress={handleUnifiedAlertsPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bell
                size={18}
                color={
                  totalAlertsCount > 0 || headerNotificationCount > 0 ? colors.error : colors.text
                }
              />
              {totalAlertsCount > 0 ? (
                <View style={headerStyles.violationBadge}>
                  <Text style={headerStyles.badgeText}>
                    {totalAlertsCount > 9 ? "9+" : totalAlertsCount}
                  </Text>
                </View>
              ) : headerNotificationCount > 0 ? (
                <View style={headerStyles.notificationBadge} />
              ) : null}
            </TouchableOpacity>
          </View>
        }
        style={headerStyles.headerStyle}
        containerStyle={headerStyles.headerContainerStyle}
        safeAreaEdges={["top"]}
      />

      <BottomSheetModalProvider>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={s.screen}
            contentContainerStyle={s.cc}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
          >
            {/* Driver Info Section */}
            <DriverInfoSection />

            {/* Status Icons Row */}
            <StatusIconsRow
              disabled={!canUseHOS}
              onStatusPress={(status) => {
                unifiedHOSCardRef.current?.openStatusModal(status)
              }}
            />

            {/* Unified Smart HOS Card */}
            <View
              ref={hosSectionRef}
              onLayout={(event) => {
                // onLayout gives position relative to parent (ScrollView content)
                const { y } = event.nativeEvent.layout
                setHosSectionY(y)
              }}
            >
              <UnifiedHOSCard
                ref={unifiedHOSCardRef}
                disabled={!canUseHOS}
                disabledMessage={translate("vehicleTrip.mandatoryMessage" as any)}
                onScrollToTop={() => {
                  if (hosSectionY !== null && hosSectionY > 0) {
                    scrollViewRef.current?.scrollTo({
                      y: Math.max(0, hosSectionY - 20),
                      animated: true,
                    })
                  } else {
                    // Fallback: approximate position based on typical layout
                    scrollViewRef.current?.scrollTo({ y: 600, animated: true })
                  }
                }}
              />
            </View>
            {canUseELD && eldConnected && (
              <LiveVehicleData
                eldConnected={eldConnected}
                obdData={obdData}
                currentSpeed={currentSpeed}
                fuelLevel={fuelLevel}
                recentAutoDutyChanges={recentAutoDutyChanges}
              />
            )}
            {/* Ride Overview Card */}  
            <RideOverviewCard
              shippingNo={shipperId}
              trailerNo={trailerNo}
              onViewLogs={() => router.push("/(tabs)/logs")}
              onShipPress={() => router.push("/assignments")}
              onCoDriverPress={() => router.push("/codriver")}
              onVehicleInspection={() => router.push("/inspection")}
              onDotInspection={() => router.push("/logs/transfer")}
              onLogout={async () => {
                try {
                  await logout()
                  router.replace("/login")
                } catch (error) {
                  console.error("Logout error:", error)
                  router.replace("/login")
                }
              }}
            />

          </ScrollView>

          {/* Floating Logout Button */}
        </View>

        {/* Notifications Modal */}
        <Modal
          visible={showNotifications}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            </View>
          </View>
        </Modal>

        <BottomSheetModal
          ref={driverInfoSheetRef}
          index={0}
          snapPoints={driverInfoSnapPoints}
          backdropComponent={renderDriverBackdrop}
          enablePanDownToClose
        >
          <BottomSheetView style={s.driverSheet}>
            <Text style={s.driverSheetTitle}>Driver & Vehicle</Text>

            <View style={s.driverSheetSection}>
              <Text style={s.driverSheetLabel}>Driver</Text>
              <Text style={s.driverSheetValue}>{driverName}</Text>
              {(driverProfile?.license_number || driverProfile?.license_state) && (
                <Text style={s.driverSheetSubValue}>
                  CDL: {driverProfile?.license_number || "—"}{" "}
                  {driverProfile?.license_state ? `(${driverProfile.license_state})` : ""}
                </Text>
              )}
            </View>

            <View style={s.driverSheetSection}>
              <Text style={s.driverSheetLabel}>Current Location</Text>
              <Text style={s.driverSheetValue}>{currentLocationLabel}</Text>
            </View>

            <View style={s.driverSheetSection}>
              <Text style={s.driverSheetLabel}>Vehicle</Text>
              <Text style={s.driverSheetValue}>{vehicleNameLabel}</Text>
              {vehicleInfo?.license_plate && (
                <Text style={s.driverSheetSubValue}>Plate: {vehicleInfo.license_plate}</Text>
              )}
              {vehicleInfo?.vin && (
                <Text style={s.driverSheetSubValue}>VIN: {vehicleInfo.vin}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.driverSheetButton, { marginBottom: 150 }]}
              onPress={handleCloseDriverSheet}
            >
              <Text style={s.driverSheetButtonText}>Close</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Violation Notifications */}
        {/* Critical Violations - Modal (non-dismissible) */}
        {criticalViolations.length > 0 && <ViolationModal violation={criticalViolations[0]} />}

        {/* High Priority Violations - Banner (dismissible, auto-dismiss 10s) */}
        {highPriorityViolations.length > 0 && criticalViolations.length === 0 && (
          <ViolationBanner
            violation={highPriorityViolations[0]}
            onDismiss={() => removeViolation(highPriorityViolations[0].violation_id)}
          />
        )}

        {/* Medium Priority Violations - Toast (auto-dismiss 5s) */}
        {mediumPriorityViolations.length > 0 &&
          criticalViolations.length === 0 &&
          highPriorityViolations.length === 0 && (
            <ViolationToast
              violation={mediumPriorityViolations[0]}
              onDismiss={() => removeViolation(mediumPriorityViolations[0].violation_id)}
            />
          )}

        {/* Mandatory Setup Screen - Blocks HOS/ELD if (vehicle AND trip) or shipper ID missing */}
        {showMandatorySetup && (
          <MandatorySetupScreen
            hasVehicle={hasVehicleAssignment}
            hasTrip={hasTrip}
            hasShipperId={hasShipperId}
            onAddVehicle={handleAddVehicle}
            onAddShipperId={handleAddShipperId}
          />
        )}

        {/* Inactivity Prompt */}
        <InactivityPrompt
          visible={showInactivityPrompt}
          onContinueDriving={() => {
            setShowInactivityPrompt(false)
            // Monitor will reset automatically when vehicle moves
          }}
          onStatusChange={() => {
            setShowInactivityPrompt(false)
            // Navigate to status screen or let user change status manually
            router.push("/status" as any)
          }}
        />

        {/* ELD Compliance Malfunction Modal */}
        <EldMalfunctionModal
          malfunction={activeMalfunction}
          onDismiss={() => setActiveMalfunction(null)}
        />

        {/* GPS Warning Banner */}
        <EldGpsWarning
          visible={gpsWarningVisible}
          durationMinutes={gpsLossDurationMinutes}
          onDismiss={() => setGpsWarningVisible(false)}
          onAddNote={onGpsNoteAdded}
        />

        {/* History Fetch Sheet */}
        <HistoryFetchSheet
          visible={showHistoryFetchSheet}
          onDismiss={() => setShowHistoryFetchSheet(false)}
          onComplete={(recordsCount) => {
            console.log(`✅ History fetch completed: ${recordsCount} records`)
          }}
        />

        {/* Quick Actions Menu (Profile, Settings, Logout) */}
        <BottomSheetModal
          ref={quickActionsRef}
          index={0}
          snapPoints={["40%"]}
          enablePanDownToClose
          onDismiss={() => setShowQuickActionsMenu(false)}
          backgroundStyle={{ backgroundColor: colors.cardBackground }}
        >
          <BottomSheetView style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 20 }}>
              {driverName}
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                backgroundColor: colors.sectionBackground,
                marginBottom: 12,
              }}
              onPress={() => handleQuickAction("profile")}
            >
              <User size={20} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: "600" }}>
                {translate("common.profile" as any) || "Profile"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                backgroundColor: colors.sectionBackground,
                marginBottom: 12,
              }}
              onPress={() => handleQuickAction("settings")}
            >
              <Settings size={20} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: "600" }}>
                {translate("common.settings" as any) || "Settings"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                backgroundColor: colors.errorBackground || colors.sectionBackground,
              }}
              onPress={() => handleQuickAction("logout")}
            >
              <LogOut size={20} color={colors.error} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: colors.error, fontWeight: "600" }}>
                {translate("common.logout" as any) || "Logout"}
              </Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  )
})

DashboardScreen.displayName = "DashboardScreen"
