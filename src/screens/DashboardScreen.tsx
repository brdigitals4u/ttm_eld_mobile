import React, { useMemo, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native"
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

import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "@/stores/authStore"
import { useStatus } from "@/contexts"
import { useLocation } from "@/contexts/location-context"
import { useObdData } from "@/contexts/obd-data-context"
import { useLocationData } from "@/hooks/useLocationData"
import { useHOSClock, useComplianceSettings, useDailyLogs, hosApi } from "@/api/hos"
import { useStatusStore } from "@/stores/statusStore"
import { DriverStatus } from "@/types/status"
import HOSCircle from "@/components/HOSSvg"
import { EldIndicator } from "@/components/EldIndicator"
import { SpeedGauge } from "@/components/SpeedGauge"
import { FuelLevelIndicator } from "@/components/FuelLevelIndicator"
import { colors } from "@/theme/colors"
import { Header } from "@/components/Header"
import { COLORS } from "@/constants"
import HOSChart from "@/components/VictoryHOS"
import { Text } from "@/components/Text"



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
    error: hosError 
  } = useHOSClock({
    enabled: isAuthenticated,
    refetchInterval: 60000, // Sync every 60 seconds
    refetchIntervalInBackground: false,
  })

  // Get HOS Compliance Settings
  const { 
    data: complianceSettings, 
    isLoading: isSettingsLoading 
  } = useComplianceSettings({
    enabled: isAuthenticated,
  }) as any

  // Sync HOS clock data to auth store and status store when it updates
  useEffect(() => {
    if (hosClock && isAuthenticated) {
      console.log('🔄 Dashboard: Syncing HOS clock data from backend', hosClock)
      
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

  // Log HOS sync errors
  useEffect(() => {
    if (hosError) {
      console.error('❌ Dashboard: HOS sync error', hosError)
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
    if (locationData.source === 'eld') {
      return "ELD Location"
    } else if (locationData.source === 'expo') {
      return "GPS Location"
    }
    return "Location unavailable"
  }, [locationData])

  // Extract speed and fuel level from OBD data
  const currentSpeed = useMemo(() => {
    const speedItem = obdData.find(
      (item) =>
        item.name.includes('Vehicle Speed') ||
        item.name.includes('Wheel-Based Vehicle Speed')
    )
    return speedItem ? parseFloat(speedItem.value) || 0 : 0
  }, [obdData])

  const fuelLevel = useMemo(() => {
    const fuelItem = obdData.find(
      (item) =>
        item.name.includes('Fuel Level') ||
        item.name.includes('Fuel Level Input')
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

    // Use clock data if available (from API), otherwise fallback to hosStatus
    const drivingTimeRemaining =
      hosClock?.driving_time_remaining ?? hosStatus.driving_time_remaining ?? hosStatus.time_remaining?.driving_time_remaining ?? 0
    const onDutyTimeRemaining =
      hosClock?.on_duty_time_remaining ?? hosStatus.on_duty_time_remaining ?? hosStatus.time_remaining?.on_duty_time_remaining ?? 0
    const cycleTimeRemaining =
      hosClock?.cycle_time_remaining ?? hosStatus.cycle_time_remaining ?? hosStatus.time_remaining?.cycle_time_remaining ?? 0

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

    const uncertifiedLogsCount = logEntries.filter((log) => !log.isCertified).length

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
          const parts = complianceSettings.cycle_type.split('_')
          const hours = parts.find((p: any) => p.includes('hour'))?.replace('hour', '') || '70'
          const days = parts.find((p: any) => p.includes('day'))?.replace('day', '') || '8'
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
  ]) as any


  const logs = [
  // Overnight rest (previous day into morning)
  { start: '2025-10-31T23:00:00-05:00', end: '2025-11-01T06:00:00-05:00', status: 'offDuty' },

  // Early-morning pre-trip inspection
  { start: '2025-11-01T06:00:00-05:00', end: '2025-11-01T06:20:00-05:00', status: 'onDuty' },

  // First drive segment
  { start: '2025-11-01T06:20:00-05:00', end: '2025-11-01T09:15:00-05:00', status: 'driving' },

  // Short on-duty fueling check
  { start: '2025-11-01T09:15:00-05:00', end: '2025-11-01T09:30:00-05:00', status: 'onDuty' },

  // Continue driving
  { start: '2025-11-01T09:30:00-05:00', end: '2025-11-01T11:45:00-05:00', status: 'driving' },

  // Lunch break
  { start: '2025-11-01T11:45:00-05:00', end: '2025-11-01T12:30:00-05:00', status: 'offDuty' },

  // Afternoon drive
  { start: '2025-11-01T12:30:00-05:00', end: '2025-11-01T15:00:00-05:00', status: 'driving' },

  // Quick on-duty check
  { start: '2025-11-01T15:00:00-05:00', end: '2025-11-01T15:20:00-05:00', status: 'onDuty' },

  // More driving
  { start: '2025-11-01T15:20:00-05:00', end: '2025-11-01T17:10:00-05:00', status: 'driving' },

  // Pre-shutdown inspection
  { start: '2025-11-01T17:10:00-05:00', end: '2025-11-01T17:40:00-05:00', status: 'onDuty' },

  // Early evening meal / break
  { start: '2025-11-01T17:40:00-05:00', end: '2025-11-01T18:15:00-05:00', status: 'offDuty' },

  // Final short drive to yard
  { start: '2025-11-01T18:15:00-05:00', end: '2025-11-01T19:00:00-05:00', status: 'driving' },

  // Post-trip paperwork
  { start: '2025-11-01T19:00:00-05:00', end: '2025-11-01T19:25:00-05:00', status: 'onDuty' },

  // End-of-day rest
  { start: '2025-11-01T19:25:00-05:00', end: '2025-11-02T05:00:00-05:00', status: 'sleeper' },
];

  


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
    console.log('📍 DashboardScreen: Requesting location...')
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
              source={require('assets/images/ttm-logo.png')}
              style={{ width: 120, height: 32, resizeMode: 'contain' }}
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
          <View style={s.gaugesRow}>
            <View style={s.gaugeCard}>
              <SpeedGauge speed={currentSpeed} unit="mph" maxSpeed={120} />
            </View>
            <View style={s.gaugeCard}>
              <FuelLevelIndicator fuelLevel={fuelLevel} />
            </View>
          </View>
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

        <HOSChart data={logs} dayStartIso="2025-11-01" />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  // Hero Card
  heroCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    minHeight: 180,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
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
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
    alignSelf: "flex-start",
  },
  heroButtonText: {
    color: "#0071ce",
    fontSize: 15,
    fontWeight: "800",
  },
  heroIllustration: {
    position: "absolute",
    right: -10,
    bottom: -10,
  },

  // Status Cards Row
  statusCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  quickCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
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
    marginHorizontal: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 20,
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
    flex: 1,
    alignItems: "center",
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    width: "80%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  cycleSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  cycleProgressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },

  // Quick Actions Section
  actionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
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
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  actionGradient: {
    padding: 20,
    minHeight: 140,
  },
  actionContent: {
    alignItems: "center",
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    height: 24,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  chartBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0071ce",
    alignItems: "center",
    justifyContent: "center",
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  redDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  progressCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#0071ce",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  progressGradient: { padding: 20 },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  progressIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
    marginBottom: 16,
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
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    elevation: 2,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
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
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  popularGradient: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  popularContent: { flex: 1 },
  popularTitle: {
    color: "#1F2937",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  popularBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  loginButton: {
    backgroundColor: "#0071ce",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
    alignSelf: "flex-start",
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
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  vehicleInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#0071ce",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0071ce",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 20,
  },
  vehicleDetails: {
    gap: 24,
  },
  vehicleDetailSection: {
    gap: 12,
  },
  vehicleDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  vehicleDetailLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eldStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
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
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
})
