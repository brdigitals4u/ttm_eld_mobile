import React, { useMemo, useEffect, useCallback, useRef, useState } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Modal } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect } from "expo-router"
import {
  MapPin,
  Truck,
  Clock,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Gauge,
  Shield,
  BookOpen,
  Bell,
  RefreshCw,
  AlertTriangle,
} from "lucide-react-native"
import * as Progress from "react-native-progress"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated"

import { useHOSCurrentStatus, useHOSClocks, useHOSLogs, useViolations } from "@/api/driver-hooks"
import { useNotifications, useMarkAllNotificationsRead } from "@/api/driver-hooks"
import { useHOSStatusContext } from "@/contexts/hos-status-context"
import { mapDriverStatusToAppStatus, mapHOSStatusToAuthFormat } from "@/utils/hos-status-mapper"
import { EldIndicator } from "@/components/EldIndicator"
import { FuelLevelIndicator } from "@/components/FuelLevelIndicator"
import { Header } from "@/components/Header"
import { NotificationsPanel } from "@/components/NotificationsPanel"
import HOSChartSkeleton from "@/components/HOSChartSkeleton"
import HOSServiceCardSkeleton from "@/components/HOSServiceCardSkeleton"
import HOSCircle from "@/components/HOSSvg"
import { SpeedGauge } from "@/components/SpeedGauge"
import { Text } from "@/components/Text"
import HOSChart from "@/components/VictoryHOS"
import { useStatus } from "@/contexts"
import { useLocation } from "@/contexts/location-context"
import { useObdData } from "@/contexts/obd-data-context"
import { useLocationData } from "@/hooks/useLocationData"
import { useAuth } from "@/stores/authStore"
import { useStatusStore } from "@/stores/statusStore"
import { colors } from "@/theme/colors"
import { DriverStatus } from "@/types/status"

export const DashboardScreen = () => {
  const {
    user,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    updateHosStatus,
  } = useAuth()
  const { logEntries, certification, hoursOfService } = useStatus()
  const { currentLocation } = useLocation()
  const locationData = useLocationData()
  const { obdData, isConnected: eldConnected } = useObdData()
  const { setCurrentStatus, setHoursOfService } = useStatusStore()
  
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Fetch notifications using new driver API
  const { data: notificationsData, refetch: refetchNotifications } = useNotifications({
    status: 'unread',
    limit: 50,
    enabled: isAuthenticated,
    refetchInterval: 60000, // 60 seconds
  })
  const markAllReadMutation = useMarkAllNotificationsRead()
  
  // Fetch violations
  const { data: violationsData } = useViolations(isAuthenticated)
  
  // Get HOS status from context (polls every 30s)
  const { hosStatus: contextHOSStatus, isLoading: isHOSLoading, error: hosError, refetch: refetchHOSClock } = useHOSStatusContext()
  
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
    isAuthenticated && !!driverProfile?.driver_id
  )

  // Sync HOS status data to auth store and status store when it updates
  useEffect(() => {
    if (contextHOSStatus && isAuthenticated) {
      console.log("🔄 Dashboard: Syncing HOS status data from backend", contextHOSStatus)

      // Map HOSCurrentStatus to HOSStatus format for auth store
      const mappedStatus = mapHOSStatusToAuthFormat(contextHOSStatus)
      if (driverProfile?.name) {
        mappedStatus.driver_name = driverProfile.name
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
    driverProfile?.name,
  ])
  
  // Track dashboard focus for detailed clocks
  useFocusEffect(
    useCallback(() => {
      setIsDashboardFocused(true)
      return () => setIsDashboardFocused(false)
    }, [])
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
      duty: contextHOSStatus?.current_status?.toUpperCase() ?? hosStatus.current_status ?? "OFF_DUTY",
      cycleLabel: (() => {
        // Get cycle type from new API response
        const cycleType = contextHOSStatus?.clocks?.cycle?.type || hosClocks?.cycle_60_70hr?.cycle_type
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
      console.error('Error refreshing dashboard:', error)
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
        return { backgroundColor: "#FFF4DC", borderColor: "#F59E0B", textColor: "#B45309" }
      case "ON_DUTY":
      case "ON-DUTY":
        return {
          backgroundColor: colors.palette.primary100,
          borderColor: colors.PRIMARY,
          textColor: colors.palette.primary700,
        }
      case "OFF_DUTY":
      case "OFF-DUTY":
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
      case "SLEEPER":
        return { backgroundColor: "#FEF3C7", borderColor: "#D97706", textColor: "#92400E" }
      default:
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
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
    const targetNotification = unreadNotifications.length > 0 
      ? unreadNotifications[0]  // First unread
      : notifications[0]  // Latest if all read

    // Mark as read if unread (using markAllRead for simplicity, or implement single mark)
    if (!targetNotification.is_read) {
      await markAllReadMutation.mutateAsync()
    }

    // Handle profile change notifications
    if (targetNotification.notification_type === 'profile_change_approved' || targetNotification.notification_type === 'profile_change_rejected') {
      router.push({
        pathname: '/profile-requests',
        params: { notificationId: targetNotification.id },
      } as any)
      return
    }

    // Navigate to action if available (check data.action)
    if (targetNotification.data?.action && !targetNotification.data.action.includes('/driver/profile/requests')) {
      router.push(targetNotification.data.action as any)
      return
    }

    // Fallback: open notifications panel if no action
    setShowNotifications(true)
  }, [notificationsData, markAllReadMutation])

  return (
    <View style={{ flex: 1 }}>
      <Header
        leftText="Welcome Back!"
        titleMode="flex"
        title=""
        backgroundColor={colors.background}
        RightActionComponent={
          <View style={{ flexDirection: 'row', gap: 12, paddingRight: 4, alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={handleNotificationBellPress}
              style={{ position: 'relative' }}
            >
              <Bell size={24} color={colors.PRIMARY} strokeWidth={2} />
              {notificationsData && notificationsData.count > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                    {notificationsData.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Image
              source={require("assets/images/ttm-logo.png")}
              style={{ width: 120, height: 32, resizeMode: "contain" }}
            />
          </View>
        }
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.06)",
          shadowColor: colors.tint,
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
        style={s.screen} 
        contentContainerStyle={s.cc}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.PRIMARY}
            colors={[colors.PRIMARY]}
          />
        }
      >
        {/* Critical Violations Alert Banner */}
        {violationsData?.violations && violationsData.violations.length > 0 && (
          <TouchableOpacity 
            style={s.criticalAlertBanner}
            onPress={() => {
              // Navigate to violations or open notifications
              setShowNotifications(true)
            }}
          >
            <View style={s.alertIconContainer}>
              <AlertTriangle size={24} color="#FFF" strokeWidth={2.5} />
            </View>
            <View style={s.alertContent}>
              <Text style={s.alertTitle}>HOS Violations Detected</Text>
              <Text style={s.alertMessage}>
                {violationsData.violations.length} active violation(s) require attention.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Hero Card - Are you ready */}
        <LinearGradient
          colors={[colors.palette.primary400, colors.PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>Ready to hit</Text>
            <Text style={s.heroTitle}>the road with TTM Konnect?</Text>
            <TouchableOpacity style={s.heroButton} onPress={() => router.push("/status")}>
              <Text style={s.heroButtonText}>Start Driving</Text>
            </TouchableOpacity>
          </View>
          <View style={s.heroIllustration}>
            <Image
              source={require("assets/images/trident_logo.png")}
              style={s.loginHeaderImage}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>

        <View style={s.categoriesSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={s.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoriesScroll}
          >
            <TouchableOpacity
              style={[s.categoryBox, s.categoryBoxActive]}
              onPress={() => router.push("/status")}
            >
              <Gauge size={32} color="#FFF" strokeWidth={2} />
              <Text style={s.categoryTextActive}>HOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.categoryBox} onPress={() => router.push("/(tabs)/logs")}>
              <FileCheck size={32} color={colors.PRIMARY} strokeWidth={2} />
              <Text style={s.categoryText}>Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.categoryBox} onPress={() => router.push("/dvir")}>
              <Shield size={32} color={colors.PRIMARY} strokeWidth={2} />
              <Text style={s.categoryText}>DVIR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.categoryBox}>
              <BookOpen size={32} color={colors.PRIMARY} strokeWidth={2} />
              <Text style={s.categoryText}>Reports</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Hours of Service - Card Style */}
        {isHOSLoading ? (
          <HOSServiceCardSkeleton />
        ) : (
          <View style={s.serviceCard}>
            <View style={s.serviceHeader}>
              <Clock size={20} color="#22C55E" strokeWidth={2.5} />
              <Text style={s.serviceTitle}>Hours of Service</Text>
            </View>

            {/* Big Timer */}
            <View style={s.bigTimerSection}>
              <Text style={s.bigTimerLabel}>Time Until Rest</Text>
              <HOSCircle text={time(data.stopIn)} />
              <Text style={s.bigTimerSubtext}>hours remaining</Text>
            </View>

            {/* Horizontal Stats */}
            <View style={s.horizontalStats}>
              <View style={s.statItem}>
                <View style={s.statIconCircle}>
                  <TrendingUp size={18} color="#22C55E" strokeWidth={2.5} />
                </View>
                <Text style={s.statItemLabel}>Drive</Text>
                <Progress.Circle
                  size={42}
                  progress={pct(data.driveLeft, 840) / 100}
                  color={colors.PRIMARY}
                  thickness={6}
                  showsText={false}
                  strokeCap="round"
                  unfilledColor="#E5E7EB"
                />
                <Text style={s.statItemValue}>{time(data.driveLeft)}</Text>
                <View style={s.miniBar}>
                  <View
                    style={[
                      s.miniBarFill,
                      {
                        width: `${pct(data.driveLeft, 660)}%`,
                        backgroundColor: colors.palette.success500,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={s.statDivider} />

              <View style={s.statItem}>
                <View style={s.statIconCircle}>
                  <Clock size={18} color={colors.PRIMARY} strokeWidth={2.5} />
                </View>
                <Text style={s.statItemLabel}>Shift</Text>
                <Progress.Circle
                  size={42}
                  progress={pct(data.shiftLeft, 840) / 100}
                  color={colors.PRIMARY}
                  thickness={6}
                  showsText={false}
                  strokeCap="round"
                  unfilledColor="#E5E7EB"
                />
                <Text style={s.statItemValue}>{time(data.shiftLeft)}</Text>
                <View style={s.miniBar}>
                  <View
                    style={[
                      s.miniBarFill,
                      { width: `${pct(data.shiftLeft, 840)}%`, backgroundColor: colors.PRIMARY },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Cycle Progress */}
            <View style={s.cycleSection}>
              <View style={s.cycleLabelRow}>
                <Text style={s.cycleLabelText}>Cycle Time</Text>
                <Text style={s.cycleValueText}>
                  {cycleTime(data.cycleLeft)} • {data.cycleDays}d
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Activity Chart */}
        <View style={s.activityCard}>
          <View style={s.activityHeader}>
            <Text style={s.activityTitle}>{data.dateTitle}</Text>
            <Text style={s.activitySubtitle}>Daily Activity</Text>
          </View>

          {isHOSLogsLoading ? (
            <HOSChartSkeleton />
          ) : (
            <HOSChart data={logs} dayStartIso={todayStr} />
          )}
        </View>
        {/* ELD Data - Speed & Fuel */}
        {eldConnected && (
          <View style={s.eldDataSection}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Live Vehicle Data</Text>
              <View style={s.eldStatusBadge}>
                <View style={s.eldStatusDot} />
                <Text style={s.eldStatusText}>ELD Connected</Text>
              </View>
            </View>
            {obdData.length === 0 ? (
              <View style={s.noDataCard}>
                <Text style={s.noDataText}>Waiting for OBD data...</Text>
                <Text style={s.noDataSubtext}>
                  {eldConnected ? "ELD is connected but no data received yet" : "ELD not connected"}
                </Text>
              </View>
            ) : (
              <View style={s.gaugesRow}>
                <View style={s.gaugeCard}>
                  <SpeedGauge speed={currentSpeed} unit="mph" maxSpeed={120} />
                </View>
                <View style={s.gaugeCard}>
                  <FuelLevelIndicator fuelLevel={fuelLevel} />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Quick Status Cards */}
        <View style={s.statusCardsRow}>
          <TouchableOpacity
            style={[s.quickCard, { backgroundColor: data.connected ? "#ECFDF5" : "#FEF3C7" }]}
          >
            <View
              style={[s.quickCardIcon, { backgroundColor: data.connected ? "#10B981" : "#F59E0B" }]}
            >
              {data.connected ? (
                <CheckCircle size={20} color="#FFF" strokeWidth={2.5} />
              ) : (
                <AlertCircle size={20} color="#FFF" strokeWidth={2.5} />
              )}
            </View>
            <Text style={s.quickCardLabel}>Status</Text>
            <Text style={[s.quickCardValue, { color: data.connected ? "#059669" : "#D97706" }]}>
              {data.connected ? "Connected" : "Offline"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.quickCard, { backgroundColor: "#EFF6FF" }]}
            onPress={() => router.push("/(tabs)/logs")}
          >
            <View style={[s.quickCardIcon, { backgroundColor: colors.PRIMARY }]}>
              <FileText size={20} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={s.quickCardLabel}>Logs</Text>
            <Text style={[s.quickCardValue, { color: colors.palette.primary700 }]}>
              {data.isCertified ? "Certified" : `${data.uncertifiedLogsCount} Pending`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Greeting Section */}
        <View style={s.greetingSection}>
          <View style={s.greetingRow}>
            <Text style={s.greetingText}>Hi {data.driver.split(" ")[0]},</Text>
            <EldIndicator />
          </View>
          <Text style={s.greetingQuestion}>How's your day going?</Text>
        </View>

        {/* Quick Actions - Ride/Rent Style */}
        <View style={s.actionsSection}>
          <Text style={s.actionsTitle}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            <TouchableOpacity style={s.actionCard} onPress={() => router.push("/status")}>
              <LinearGradient
                colors={[colors.palette.success500, colors.palette.success600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionGradient}
              >
                <View style={s.actionContent}>
                  <View style={s.actionIconContainer}>
                    <Truck size={32} color="#FFF" strokeWidth={2} />
                  </View>
                  <Text style={s.actionTitle}>Drive</Text>
                  <Text style={s.actionSubtitle}>Start your shift</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionCard} onPress={() => router.push("/(tabs)/logs")}>
              <LinearGradient
                colors={[colors.PRIMARY, colors.palette.primary600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionGradient}
              >
                <View style={s.actionContent}>
                  <View style={s.actionIconContainer}>
                    <FileText size={32} color="#FFF" strokeWidth={2} />
                  </View>
                  <Text style={s.actionTitle}>Logs</Text>
                  <Text style={s.actionSubtitle}>View & Sign</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Information Card */}
        <View style={s.vehicleInfoCard}>
          <View style={s.vehicleInfoHeader}>
            <View style={s.vehicleIconContainer}>
              <Truck size={28} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.vehicleInfoTitle}>Vehicle Information</Text>
              <Text style={s.vehicleInfoSubtitle}>{data.vehicleUnit}</Text>
            </View>
          </View>

          <View style={s.vehicleDivider} />

          <View style={s.vehicleDetails}>
            {currentLocation?.address && (
              <View style={s.vehicleDetailSection}>
                <View style={s.vehicleDetailHeader}>
                  <MapPin size={16} color={colors.PRIMARY} strokeWidth={2.5} />
                  <Text style={s.vehicleSectionTitle}>Current Location</Text>
                </View>
                <Text style={s.vehicleAddressText}>{currentLocation.address}</Text>
              </View>
            )}

            <View style={s.vehicleDetailSection}>
              <View style={s.vehicleDetailHeader}>
                <Gauge size={16} color={colors.PRIMARY} strokeWidth={2.5} />
                <Text style={s.vehicleSectionTitle}>Vehicle Details</Text>
              </View>

              <View style={s.vehicleDetailGrid}>
                <View style={s.vehicleDetailItem}>
                  <Text style={s.vehicleDetailLabel}>Make & Model</Text>
                  <Text style={s.vehicleDetailValue}>
                    {data.truckMake} {data.truckModel}
                  </Text>
                </View>

                <View style={s.vehicleDetailItem}>
                  <Text style={s.vehicleDetailLabel}>Year</Text>
                  <Text style={s.vehicleDetailValue}>{data.truckYear}</Text>
                </View>
              </View>

              <View style={s.vehicleDetailGrid}>
                <View style={s.vehicleDetailItem}>
                  <Text style={s.vehicleDetailLabel}>License Plate</Text>
                  <Text style={s.vehicleDetailValue}>{data.licensePlate}</Text>
                </View>

                {data.vin && data.vin !== "N/A" && (
                  <View style={s.vehicleDetailItem}>
                    <Text style={s.vehicleDetailLabel}>VIN</Text>
                    <Text style={[s.vehicleDetailValue, s.vehicleVinText]}>
                      {data.vin.substring(0, 8)}...
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

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
    </View>
  )
}

const s = StyleSheet.create({
  screen: { backgroundColor: "#F9FAFB", flex: 1, marginTop: 0 },
  cc: { paddingBottom: 120 },

  // Top Header
  topHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
  avatarContainer: {
    alignItems: "center",
    backgroundColor: colors.PRIMARY,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  avatarText: {
    color: "#FFF",
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
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  locationAddress: {
    color: "#6B7280",
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
  notificationBadge: {
    backgroundColor: "#EF4444",
    borderColor: "#FFF",
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    right: 10,
    top: 10,
    width: 10,
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
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  heroButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroButtonText: {
    color: colors.PRIMARY,
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
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  quickCardValue: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Greeting
  greetingSection: {
    marginBottom: 16,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  greetingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  greetingText: {
    color: "#1F2937",
    fontSize: 24,
    fontWeight: "900",
  },
  greetingQuestion: {
    color: "#1F2937",
    fontSize: 24,
    fontWeight: "400",
    marginTop: 4,
  },

  // Service Card (Hours of Service)
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 2,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  serviceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  serviceTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "800",
  },
  bigTimerSection: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 24,
  },
  bigTimerLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  bigTimerValue: {
    color: "#1F2937",
    fontSize: 48,
    fontWeight: "900",
  },
  bigTimerSubtext: {
    color: "#9CA3AF",
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
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginBottom: 8,
    width: 36,
  },
  statItemLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statItemValue: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  miniBar: {
    backgroundColor: "#E5E7EB",
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
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
    width: 1,
  },
  cycleSection: {
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cycleLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cycleLabelText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  cycleValueText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "800",
  },
  cycleProgressWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  cycleProgressBar: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
  },
  cycleProgressFill: {
    backgroundColor: "#F59E0B",
    borderRadius: 4,
    height: "100%",
  },

  // Quick Actions Section
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  actionsTitle: {
    color: "#1F2937",
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
    color: "#FFF",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 2,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  activityHeader: {
    marginBottom: 20,
  },
  activityTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "800",
  },
  activitySubtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  simpleChart: {
    gap: 12,
  },
  chartRow: {
    backgroundColor: "#F3F4F6",
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
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  loginHeaderImage: {
    width: "100%",
  },

  fitnessHeader: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#0071ce",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
  },
  greetingBlock: { flex: 1 },
  hiText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500",
  },
  motivationText: {
    color: "#1F2937",
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
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44,
  },
  redDot: {
    backgroundColor: "#EF4444",
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
    shadowColor: "#0071ce",
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
    color: "#FFF",
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
    color: "#FFF",
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
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "800",
  },
  seeAllText: {
    color: colors.PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  categoriesScroll: {
    gap: 12,
    paddingRight: 20,
  },
  categoryBox: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    gap: 8,
    height: 100,
    justifyContent: "center",
    width: 100,
  },
  categoryBoxActive: {
    backgroundColor: colors.PRIMARY,
  },
  categoryText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: "#FFF",
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
    backgroundColor: "#FFF",
    borderRadius: 20,
    elevation: 2,
    flex: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  overviewCardTitle: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  circularContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "900",
  },
  circleLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  popularSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  popularCard: {
    borderRadius: 24,
    elevation: 4,
    overflow: "hidden",
    shadowColor: "#A78BFA",
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
    color: "#1F2937",
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
    backgroundColor: colors.PRIMARY,
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },

  // Vehicle Information Card
  vehicleInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 4,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    shadowColor: "#000",
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
    backgroundColor: colors.PRIMARY,
    borderRadius: 16,
    elevation: 6,
    height: 56,
    justifyContent: "center",
    shadowColor: colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 56,
  },
  vehicleInfoTitle: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  vehicleInfoSubtitle: {
    color: colors.PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  vehicleDivider: {
    backgroundColor: "#E5E7EB",
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
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "700",
  },
  vehicleAddressText: {
    color: "#4B5563",
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
  vehicleDetailLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  vehicleDetailValue: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "left",
  },
  vehicleVinText: {
    fontFamily: "monospace",
  },

  // ELD Data Section
  eldDataSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  eldStatusBadge: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eldStatusDot: {
    backgroundColor: "#10B981",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  eldStatusText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  gaugesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  gaugeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 2,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  noDataCard: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 24,
  },
  noDataText: {
    color: "#92400E",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  noDataSubtext: {
    color: "#B45309",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  debugButton: {
    backgroundColor: colors.PRIMARY,
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  debugButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Notifications Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Critical Alert Banner
  criticalAlertBanner: {
    backgroundColor: '#DC2626',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
})
