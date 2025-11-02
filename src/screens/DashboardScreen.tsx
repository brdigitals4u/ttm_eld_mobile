import React, { useMemo, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
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

import { useHOSClock, useComplianceSettings, useHOSLogs, hosApi } from "@/api/hos"
import { EldIndicator } from "@/components/EldIndicator"
import { FuelLevelIndicator } from "@/components/FuelLevelIndicator"
import { Header } from "@/components/Header"
import HOSChartSkeleton from "@/components/HOSChartSkeleton"
import HOSServiceCardSkeleton from "@/components/HOSServiceCardSkeleton"
import HOSCircle from "@/components/HOSSvg"
import { SpeedGauge } from "@/components/SpeedGauge"
import { Text } from "@/components/Text"
import HOSChart from "@/components/VictoryHOS"
import { COLORS } from "@/constants"
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
    isLoading,
    updateHosStatus,
  } = useAuth()
  const { logEntries, certification, hoursOfService } = useStatus()
  const { currentLocation, requestLocation } = useLocation()
  const locationData = useLocationData()
  const { obdData, isConnected: eldConnected } = useObdData()
  const { setCurrentStatus, setHoursOfService } = useStatusStore()

  // Request location non-blocking on mount (for fallback when ELD not available)
  useEffect(() => {
    // Request location in background without blocking
    locationData.refreshLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Sync HOS Clock from backend
  const {
    data: hosClock,
    isLoading: isHOSLoading,
    error: hosError,
  } = useHOSClock({
    enabled: isAuthenticated,
    refetchInterval: 60000, // Sync every 60 seconds
    refetchIntervalInBackground: false,
  })

  // Get HOS Compliance Settings
  const { data: complianceSettings, isLoading: isSettingsLoading } = useComplianceSettings({
    enabled: isAuthenticated,
  }) as any

  // Get today's and next day's HOS logs for chart and uncertified count
  // IMPORTANT: Call after HOS clock is fetched, using driver ID from clock
  // Using today and next day gives better HOS chart visualization
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0] // YYYY-MM-DD
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0] // YYYY-MM-DD
  const correctDriverId = hosClock?.driver || driverProfile?.driver_id
  const {
    data: todayHOSLogs,
    isLoading: isHOSLogsLoading,
    refetch: refetchHOSLogs,
  } = useHOSLogs(
    {
      driver: correctDriverId, // Sent as driver_id to API
      startDate: todayStr, // Sent as start_date to API
      endDate: tomorrowStr, // Sent as end_date to API (today + next day)
    },
    { enabled: isAuthenticated && !!correctDriverId && !!hosClock }, // Only call after HOS clock is available
  )

  // Sync HOS clock data to auth store and status store when it updates
  useEffect(() => {
    if (hosClock && isAuthenticated) {
      console.log("🔄 Dashboard: Syncing HOS clock data from backend", hosClock)

      // Map HOSClock to HOSStatus format for auth store
      updateHosStatus({
        driver_id: hosClock.driver,
        driver_name: hosClock.driver_name,
        current_status: hosClock.current_duty_status?.toUpperCase() || "OFF_DUTY",
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
      const appStatus = hosApi.getAppDutyStatus(hosClock.current_duty_status || "off_duty")
      setCurrentStatus(appStatus as DriverStatus)

      // Sync HOS times to status store
      setHoursOfService({
        driveTimeRemaining: hosClock.driving_time_remaining || 0,
        shiftTimeRemaining: hosClock.on_duty_time_remaining || 0,
        cycleTimeRemaining: hosClock.cycle_time_remaining || 0,
        breakTimeRemaining: hoursOfService.breakTimeRemaining, // Keep existing break time
        lastCalculated: Date.now(),
      })

      // Refetch HOS logs after HOS clock is synced
      // This ensures HOS logs are fetched with the correct driver ID from the clock
      if (refetchHOSLogs) {
        console.log(
          "🔄 Dashboard: Refetching HOS logs after HOS clock sync, driver ID:",
          hosClock.driver,
        )
        refetchHOSLogs()
      }
    }
  }, [
    hosClock,
    isAuthenticated,
    updateHosStatus,
    setCurrentStatus,
    setHoursOfService,
    hoursOfService.breakTimeRemaining,
    refetchHOSLogs,
  ])

  // Log HOS sync errors
  useEffect(() => {
    if (hosError) {
      console.error("❌ Dashboard: HOS sync error", hosError)
    }
  }, [hosError])

  // Shorten location address - use locationData hook which prioritizes ELD -> Expo -> fallback
  const shortLocationAddress = useMemo(() => {
    if (locationData.address) {
      const parts = locationData.address.split(", ")
      if (parts.length >= 2) {
        // Return just city and state/region
        return parts.slice(-2).join(", ")
      }
      // If format is unexpected, return first 30 chars
      return locationData.address.length > 30
        ? locationData.address.substring(0, 30) + "..."
        : locationData.address
    }

    // Show source instead of "Loading location..."
    if (locationData.source === "eld") {
      return "ELD Location"
    } else if (locationData.source === "expo") {
      return "GPS Location"
    }
    return "Location unavailable"
  }, [locationData])

  // Extract speed and fuel level from OBD data
  const currentSpeed = useMemo(() => {
    const speedItem = obdData.find(
      (item) =>
        item.name.includes("Vehicle Speed") || item.name.includes("Wheel-Based Vehicle Speed"),
    )
    const speed = speedItem ? parseFloat(speedItem.value) || 0 : 0
    console.log('📊 Dashboard: OBD Speed extraction', { 
      obdDataLength: obdData.length, 
      speedItem: speedItem ? { name: speedItem.name, value: speedItem.value } : null,
      extractedSpeed: speed
    })
    return speed
  }, [obdData])

  const fuelLevel = useMemo(() => {
    const fuelItem = obdData.find(
      (item) => item.name.includes("Fuel Level") || item.name.includes("Fuel Level Input"),
    )
    const fuel = fuelItem ? parseFloat(fuelItem.value) || 0 : 0
    console.log('📊 Dashboard: OBD Fuel extraction', { 
      obdDataLength: obdData.length, 
      fuelItem: fuelItem ? { name: fuelItem.name, value: fuelItem.value } : null,
      extractedFuel: fuel
    })
    return fuel
  }, [obdData])

  // Debug OBD data state
  useEffect(() => {
    console.log('📊 Dashboard: OBD Data State', {
      eldConnected,
      obdDataLength: obdData.length,
      obdDataItems: obdData.map(item => ({ name: item.name, value: item.value })),
      currentSpeed,
      fuelLevel
    })
  }, [eldConnected, obdData, currentSpeed, fuelLevel])

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

    // Use clock data if available (from API), otherwise fallback to hosStatus
    const drivingTimeRemaining =
      hosClock?.driving_time_remaining ??
      hosStatus.driving_time_remaining ??
      hosStatus.time_remaining?.driving_time_remaining ??
      0
    const onDutyTimeRemaining =
      hosClock?.on_duty_time_remaining ??
      hosStatus.on_duty_time_remaining ??
      hosStatus.time_remaining?.on_duty_time_remaining ??
      0
    const cycleTimeRemaining =
      hosClock?.cycle_time_remaining ??
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
    if (todayHOSLogs && todayHOSLogs.length > 0) {
      // Filter logs for today only and count those that are not certified
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)

      uncertifiedLogsCount = todayHOSLogs.filter((log: any) => {
        const logDate = log.start_time ? new Date(log.start_time) : null
        if (!logDate) return false
        // Only count logs from today (not tomorrow)
        const isToday = logDate >= todayStart && logDate <= todayEnd
        // Individual HOS logs are considered uncertified until aggregated into daily logs
        return isToday && !log.is_certified
      }).length
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
      duty: hosClock?.current_duty_status?.toUpperCase() ?? hosStatus.current_status ?? "OFF_DUTY",
      cycleLabel: (() => {
        if (complianceSettings?.cycle_type) {
          // Format: "70_hour_8_day" -> "USA 70 hours / 8 days"
          const parts = complianceSettings.cycle_type.split("_")
          const hours = parts.find((p: any) => p.includes("hour"))?.replace("hour", "") || "70"
          const days = parts.find((p: any) => p.includes("day"))?.replace("day", "") || "8"
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
    hosClock,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    logEntries,
    certification,
    complianceSettings,
    todayHOSLogs,
  ]) as any

  // Convert HOS logs API response to chart format
  // HOS logs API returns individual log entries with start_time, end_time, duty_status
  // Using today and next day gives better HOS chart visualization
  const logs = useMemo(() => {
    if (!todayHOSLogs || todayHOSLogs.length === 0) {
      return []
    }

    // Convert HOS logs to chart format
    // API returns individual log entries with start_time, end_time (or null if ongoing), duty_status
    const chartLogs: Array<{ start: string; end: string; status: string; note?: string }> = []

    todayHOSLogs.forEach((log: any) => {
      if (log.start_time && log.duty_status) {
        const status = hosApi.getAppDutyStatus(log.duty_status)
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
        return { backgroundColor: "#EFF6FF", borderColor: "#3B82F6", textColor: "#1E40AF" }
      case "OFF_DUTY":
      case "OFF-DUTY":
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
      case "SLEEPER":
        return { backgroundColor: "#FEF3C7", borderColor: "#D97706", textColor: "#92400E" }
      default:
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
    }
  }

  const dutyStyle = getDutyStatusStyle(data?.duty)

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

  // Request location on mount
  useEffect(() => {
    console.log("📍 DashboardScreen: Requesting location...")
    requestLocation()
  }, [requestLocation])

  const vehicleIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vehicleIconScale.value }],
    opacity: vehicleIconOpacity.value,
  }))

  return (
    <View style={{ flex: 1 }}>
      <Header
        leftText="Welcome Back!"
        titleMode="flex"
        title=""
        backgroundColor={colors.background}
        RightActionComponent={
          <View style={{ paddingRight: 4 }}>
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

      <ScrollView style={s.screen} contentContainerStyle={s.cc}>
        {/* Hero Card - Are you ready */}
        <LinearGradient
          colors={["#66ade7", "#0071ce"]}
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
              <FileCheck size={32} color="#0071ce" strokeWidth={2} />
              <Text style={s.categoryText}>Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.categoryBox} onPress={() => router.push("/dvir")}>
              <Shield size={32} color="#0071ce" strokeWidth={2} />
              <Text style={s.categoryText}>DVIR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.categoryBox}>
              <BookOpen size={32} color="#0071ce" strokeWidth={2} />
              <Text style={s.categoryText}>Reports</Text>
            </TouchableOpacity>
          </ScrollView>
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
                  {eldConnected ? 'ELD is connected but no data received yet' : 'ELD not connected'}
                </Text>
                {__DEV__ && (
                  <TouchableOpacity
                    style={s.debugButton}
                    onPress={async () => {
                      console.log('🔧 Manual trigger: Starting ELD reporting...')
                      try {
                        const JMBluetoothService = require('@/services/JMBluetoothService').default
                        const status = await JMBluetoothService.getConnectionStatus()
                        console.log('🔍 Connection status:', status)
                        if (status.isConnected) {
                          await JMBluetoothService.startReportEldData()
                          console.log('✅ ELD reporting started manually')
                        } else {
                          console.log('❌ Not connected, cannot start ELD reporting')
                        }
                      } catch (error) {
                        console.error('❌ Failed to start ELD reporting:', error)
                      }
                    }}
                  >
                    <Text style={s.debugButtonText}>🔧 Start ELD Reporting (Debug)</Text>
                  </TouchableOpacity>
                )}
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
            <View style={[s.quickCardIcon, { backgroundColor: "#3B82F6" }]}>
              <FileText size={20} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={s.quickCardLabel}>Logs</Text>
            <Text style={[s.quickCardValue, { color: "#1E40AF" }]}>
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

        {/* Hours of Service - Card Style */}
        {isHOSLoading || isSettingsLoading ? (
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
                  color="#3B82F6"
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
                      { width: `${pct(data.driveLeft, 660)}%`, backgroundColor: "#22C55E" },
                    ]}
                  />
                </View>
              </View>

              <View style={s.statDivider} />

              <View style={s.statItem}>
                <View style={s.statIconCircle}>
                  <Clock size={18} color="#3B82F6" strokeWidth={2.5} />
                </View>
                <Text style={s.statItemLabel}>Shift</Text>
                <Progress.Circle
                  size={42}
                  progress={pct(data.shiftLeft, 840) / 100}
                  color="#3B82F6"
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
                      { width: `${pct(data.shiftLeft, 840)}%`, backgroundColor: "#3B82F6" },
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

        {/* Quick Actions - Ride/Rent Style */}
        <View style={s.actionsSection}>
          <Text style={s.actionsTitle}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            <TouchableOpacity style={s.actionCard} onPress={() => router.push("/status")}>
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
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
                colors={["#3B82F6", "#2563EB"]}
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
                  <MapPin size={16} color="#0071ce" strokeWidth={2.5} />
                  <Text style={s.vehicleSectionTitle}>Current Location</Text>
                </View>
                <Text style={s.vehicleAddressText}>{currentLocation.address}</Text>
              </View>
            )}

            <View style={s.vehicleDetailSection}>
              <View style={s.vehicleDetailHeader}>
                <Gauge size={16} color="#0071ce" strokeWidth={2.5} />
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
    backgroundColor: COLORS.primary,
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
    color: "#0071ce",
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
    color: "#0071ce",
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
    backgroundColor: "#0071ce",
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
    backgroundColor: "#0071ce",
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
    backgroundColor: "#0071ce",
    borderRadius: 16,
    elevation: 6,
    height: 56,
    justifyContent: "center",
    shadowColor: "#0071ce",
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
    color: "#0071ce",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 24,
    marginTop: 16,
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
    backgroundColor: "#0071ce",
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
})
