import {
  Briefcase,
  Mail,
  Phone,
  Truck,
  User,
  Settings,
  MapPin,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  Bluetooth,
  Award,
  TrendingUp,
  ChevronRight,
} from "lucide-react-native"
import React, { useEffect, useMemo, useState } from "react"
import { router } from "expo-router"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import LoadingButton from "@/components/LoadingButton"
import ElevatedCard from "@/components/EvevatedCard"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

import { Header } from "@/components/Header"
import StatCircleCard from "@/components/StatCircleCard"
import { useObdData } from "@/contexts/obd-data-context"
import { getEldDevice, EldDeviceInfo } from "@/utils/eldStorage"
import { useHOSCurrentStatus, useViolations, useDriverProfile } from "@/api/driver-hooks"
import { useStatusStore } from "@/stores/statusStore"

const { width } = Dimensions.get("window")

interface MenuItemProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  onPress: () => void
  index: number
}

function MenuItem({ title, subtitle, icon, onPress, index }: MenuItemProps) {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(
      index * 50,
      withSpring(1, {
        damping: 15,
        stiffness: 90,
      }),
    )
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 400 }))
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const pressScale = useSharedValue(1)

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }))

  const handlePressIn = () => {
    pressScale.value = withSpring(0.96, { damping: 10 })
  }

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 10 })
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={pressAnimatedStyle}>
          <ElevatedCard style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <View style={[styles.menuItemIcon, { backgroundColor: `${colors.tint}15` }]}>
                {icon}
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textDim }]}>{subtitle}</Text>
              </View>
              <ChevronRight size={24} color={colors.tint} />
            </View>
          </ElevatedCard>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )
}

interface InfoCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: string
  index: number
}

function InfoCard({ icon, label, value, subtext, color, index }: InfoCardProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const scale = useSharedValue(0.8)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(
      index * 40,
      withSpring(1, {
        damping: 15,
        stiffness: 100,
      }),
    )
    opacity.value = withDelay(index * 40, withTiming(1, { duration: 400 }))
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.infoCard, animatedStyle]}>
      <View style={[styles.infoCardIcon, { backgroundColor: `${color || colors.tint}15` }]}>
        {icon}
      </View>
      <View style={styles.infoCardContent}>
        <Text style={[styles.infoCardLabel, { color: colors.textDim }]}>{label}</Text>
        <Text style={[styles.infoCardValue, { color: colors.text }]}>{value}</Text>
        {subtext && (
          <Text style={[styles.infoCardSubtext, { color: colors.textDim }]}>{subtext}</Text>
        )}
      </View>
    </Animated.View>
  )
}

export default function ProfileScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { user, logout, driverProfile, hosStatus, vehicleAssignment, organizationSettings, isAuthenticated } =
    useAuth()
  const { obdData, isConnected: eldConnected, eldDeviceId } = useObdData()
  const [eldDeviceInfo, setEldDeviceInfo] = useState<EldDeviceInfo | null>(null)
  const formatEldIdentifier = (value: string | null | undefined) => {
    if (!value) return ''
    const trimmed = value.trim()
    if (trimmed.length === 0) return ''
    if (trimmed.includes(':') || trimmed.includes('-')) {
      return trimmed.toUpperCase()
    }
    if (/^[0-9A-Fa-f]{12}$/.test(trimmed)) {
      return (trimmed.match(/.{1,2}/g) ?? [trimmed]).join(':').toUpperCase()
    }
    return trimmed.toUpperCase()
  }
  
  // Get HOS status, violations, and profile from new driver API
  const { data: currentHOSStatus } = useHOSCurrentStatus({
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })
  const { data: violationsData } = useViolations(isAuthenticated)
  
  // Filter to only unresolved violations
  const unresolvedViolations = useMemo(() => {
    if (!violationsData?.violations) return []
    return violationsData.violations.filter((v: any) => v.resolved === false)
  }, [violationsData])
  const { data: driverProfileData } = useDriverProfile(isAuthenticated)
  const { currentStatus } = useStatusStore()
  
  // Use driver profile from API if available, otherwise fallback to auth store
  const effectiveDriverProfile = driverProfileData || driverProfile
  
  // Format status for display - use synced status from store for consistency
  const formatStatus = (status: string) => {
    if (!status) return 'OFF DUTY'
    return status.replace(/_/g, ' ').toUpperCase()
  }
  
  // Get display status - prefer synced status from store, fallback to API
  const displayStatus = currentStatus ? formatStatus(currentStatus) : 
    (currentHOSStatus?.current_status ? formatStatus(currentHOSStatus.current_status) : 'OFF DUTY')

  const headerOpacity = useSharedValue(0)
  const headerTranslateY = useSharedValue(-50)
  const avatarScale = useSharedValue(0)
  const avatarRotate = useSharedValue(0)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 })
    headerTranslateY.value = withSpring(0, { damping: 15, stiffness: 90 })
    avatarScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 80 }))
    avatarRotate.value = withDelay(
      200,
      withSequence(withSpring(360, { damping: 10 }), withSpring(0, { damping: 10 })),
    )

    // Load saved ELD device info
    loadEldDeviceInfo()
  }, [])

  const loadEldDeviceInfo = async () => {
    const deviceInfo = await getEldDevice()
    setEldDeviceInfo(deviceInfo)
  }

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }))

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }, { rotate: `${avatarRotate.value}deg` }],
  }))


  const handleLogout = async () => {
    try {
      console.log("🚪 ProfileScreen: Starting logout...")
      await logout()
      console.log("🎯 ProfileScreen: Navigating to login...")
      router.replace("/login")
    } catch (error) {
      console.error("❌ ProfileScreen: Logout failed:", error)
    }
  }

  // Extract odometer from OBD data
  const currentOdometer = useMemo(() => {
    const odometerItem = obdData.find(
      (item) =>
        item.name.includes('Total Vehicle Distance') ||
        item.name.includes('Odometer') ||
        item.name.includes('High Resolution Total Vehicle Distance')
    )
    return odometerItem ? parseFloat(odometerItem.value) || 0 : null
  }, [obdData])

  const menuItems = [
    {
      title: "Settings",
      subtitle: "Manage CoDrivers and Others",
      icon: <Settings size={24} color={colors.tint} />,
      onPress: () => router.navigate("/more"),
    },
  ]

  // Calculate driving hours remaining
  const drivingHoursRemaining = Math.floor(
    (hosStatus?.time_remaining?.driving_time_remaining || 0) / 60,
  )
  const onDutyHoursRemaining = Math.floor(
    (hosStatus?.time_remaining?.on_duty_time_remaining || 0) / 60,
  )
  const cycleHoursRemaining = Math.floor(
    (hosStatus?.time_remaining?.cycle_time_remaining || 0) / 60,
  )

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={"Profile"}
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
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
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
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
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Header Card */}
        <Animated.View style={headerAnimatedStyle}>
          <LinearGradient
            colors={isDark ? [colors.tint, "#1e40af"] : [colors.tint, "#3b82f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: "rgba(255,255,255,0.95)",
                  borderColor: "#FFFFFF",
                },
                avatarAnimatedStyle,
              ]}
            >
              <User size={48} color={colors.tint} />
            </Animated.View>

            <Text style={styles.headerName}>
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : driverProfile?.name || "Driver Name"}
            </Text>

            <View style={styles.headerBadge}>
              <Award size={16} color="#FFFFFF" />
              <Text style={styles.headerBadgeText}>
                {driverProfile?.employment_status === "active"
                  ? "Active Driver"
                  : driverProfile?.employment_status || "Professional Driver"}
              </Text>
            </View>

            {driverProfile?.company_driver_id && (
              <Text style={styles.headerDriverId}>ID: {driverProfile.company_driver_id}</Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Quick Stats */}
        <ElevatedCard style={styles.section}>
          <StatCircleCard
            logoSize={64}
            logo={<Truck size={32} color={colors.tint} />}
            items={[
              {
                value: drivingHoursRemaining,
                topLabel: `${drivingHoursRemaining}h`,
                bottomLabel: "Drive Time",
                color: colors.tint,
              },
              {
                value: onDutyHoursRemaining,
                topLabel: `${onDutyHoursRemaining}h`,
                bottomLabel: "On Duty",
                color: "#10b981",
              },
              {
                value: cycleHoursRemaining,
                topLabel: `${cycleHoursRemaining}h`,
                bottomLabel: "Cycle Time",
                color: "#f59e0b",
              },
            ]}
          />
                      <LoadingButton
              title="Edit Profile"
              onPress={() => router.navigate("/profile-edit")}
              variant="primary"
              style={styles.editButton}
            />
        </ElevatedCard>

        {/* Status Badge */}
        {hosStatus?.current_status && (
          <Animated.View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDark ? colors.surface : "#FFFFFF",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    hosStatus.current_status === "driving"
                      ? "#10b981"
                      : hosStatus.current_status === "on_duty"
                        ? "#f59e0b"
                        : "#6b7280",
                },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.text }]}>
              Current Status:{" "}
              <Text style={{ fontWeight: "700" }}>
                {hosStatus.current_status.replace("_", " ").toUpperCase()}
              </Text>
            </Text>

          </Animated.View>
        )}

        {/* Contact Information */}
        <ElevatedCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
          </View>

          <InfoCard
            icon={<Mail size={20} color={colors.tint} />}
            label="Email Address"
            value={driverProfile?.email || user?.email || "email@example.com"}
            color={colors.tint}
            index={0}
          />

          <InfoCard
            icon={<Phone size={20} color="#10b981" />}
            label="Phone Number"
            value={driverProfile?.phone || "(555) 123-4567"}
            color="#10b981"
            index={1}
          />

          <InfoCard
            icon={<User size={20} color="#8b5cf6" />}
            label="Driver License"
            value={driverProfile?.license_number || driverProfile?.driver_license || "DL12345678"}
            subtext={
              driverProfile?.license_state ? `State: ${driverProfile.license_state}` : undefined
            }
            color="#8b5cf6"
            index={2}
          />

          {driverProfile?.license_expiry && (
            <InfoCard
              icon={<Calendar size={20} color="#f59e0b" />}
              label="License Expiry"
              value={new Date(driverProfile.license_expiry).toLocaleDateString()}
              color="#f59e0b"
              index={3}
            />
          )}
        </ElevatedCard>

        {/* Company Information */}
        <ElevatedCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Briefcase size={20} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Company Information</Text>
          </View>

          <InfoCard
            icon={<Briefcase size={20} color={colors.tint} />}
            label="Company Name"
            value={
              organizationSettings?.organization_name ||
              driverProfile?.organization_name ||
              "Trucking Company"
            }
            subtext={
              organizationSettings?.timezone
                ? `Timezone: ${organizationSettings.timezone}`
                : undefined
            }
            color={colors.tint}
            index={0}
          />

          {driverProfile?.home_terminal_name && (
            <InfoCard
              icon={<MapPin size={20} color="#ef4444" />}
              label="Home Terminal"
              value={driverProfile.home_terminal_name}
              subtext={driverProfile.home_terminal_address}
              color="#ef4444"
              index={1}
            />
          )}

          {driverProfile?.hire_date && (
            <InfoCard
              icon={<Calendar size={20} color="#10b981" />}
              label="Hire Date"
              value={new Date(driverProfile.hire_date).toLocaleDateString()}
              color="#10b981"
              index={2}
            />
          )}
        </ElevatedCard>

        {/* Vehicle Assignment */}
        {vehicleAssignment?.has_vehicle_assigned && vehicleAssignment?.vehicle_info && (
          <ElevatedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle Assignment</Text>
            </View>

            <InfoCard
              icon={<Truck size={20} color={colors.tint} />}
              label="Vehicle Unit"
              value={vehicleAssignment.vehicle_info.vehicle_unit}
              color={colors.tint}
              index={0}
            />

            <InfoCard
              icon={<Truck size={20} color="#3b82f6" />}
              label="Vehicle Details"
              value={`${vehicleAssignment.vehicle_info.year} ${vehicleAssignment.vehicle_info.make} ${vehicleAssignment.vehicle_info.model}`}
              subtext={`License Plate: ${vehicleAssignment.vehicle_info.license_plate}`}
              color="#3b82f6"
              index={1}
            />

            <InfoCard
              icon={<Calendar size={20} color="#10b981" />}
              label="Assigned Date"
              value={new Date(vehicleAssignment.vehicle_info.assigned_at).toLocaleDateString()}
              color="#10b981"
              index={2}
            />

            {vehicleAssignment.vehicle_info.current_odometer && (
              <InfoCard
                icon={<TrendingUp size={20} color="#f59e0b" />}
                label="Current Odometer"
                value={`${vehicleAssignment.vehicle_info.current_odometer.value || 0} ${vehicleAssignment.vehicle_info.current_odometer.unit || "miles"
                  }`}
                subtext={
                  vehicleAssignment.vehicle_info.current_odometer.last_updated
                    ? `Updated: ${new Date(
                      vehicleAssignment.vehicle_info.current_odometer.last_updated,
                    ).toLocaleString()}`
                    : undefined
                }
                color="#f59e0b"
                index={3}
              />
            )}
          </ElevatedCard>
        )}

        {/* ELD Settings */}
        {driverProfile && (
          <ElevatedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>ELD Configuration</Text>
            </View>

            <View style={styles.compactEldGrid}>
              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.eld_pc_enabled ? (
                    <View style={styles.enabledIcon}>
                      <Shield size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <Shield size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>
                  Personal Conveyance
                </Text>
              </View>

              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.eld_ym_enabled ? (
                    <View style={styles.enabledIcon}>
                      <Truck size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <Truck size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>Yard Moves</Text>
              </View>

              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.eld_adverse_weather_exemption_enabled ? (
                    <View style={styles.enabledIcon}>
                      <AlertTriangle size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <AlertTriangle size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>
                  Adverse Weather Exception
                </Text>
              </View>

              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.eld_big_day_exemption_enabled ? (
                    <View style={styles.enabledIcon}>
                      <Clock size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <Clock size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>
                  16-Hour Exception
                </Text>
              </View>

              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.waiting_time_duty_status_enabled ? (
                    <View style={styles.enabledIcon}>
                      <Clock size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <Clock size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>
                  Waiting Time Status
                </Text>
              </View>

              <View style={styles.compactEldRow}>
                <View style={styles.compactEldIcon}>
                  {driverProfile.eld_exempt ? (
                    <View style={styles.enabledIcon}>
                      <Shield size={18} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.disabledIcon}>
                      <Shield size={18} color="#9ca3af" />
                    </View>
                  )}
                </View>
                <Text style={[styles.compactEldText, { color: colors.text }]}>ELD Exempt</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <InfoCard
              icon={<Clock size={20} color={colors.tint} />}
              label="Day Start Hour"
              value={`${driverProfile.eld_day_start_hour}:00`}
              color={colors.tint}
              index={4}
            />

            {/* ELD Device ID - from profile, saved device, or connected device */}
            {(() => {
              const resolvedEldIdRaw =
                (eldDeviceId && eldDeviceId.trim()) ||
                (typeof driverProfile?.eld_device_id === 'string' ? driverProfile.eld_device_id : '') ||
                (eldDeviceInfo?.address ?? '')

              const eldSubtext = eldConnected
                ? 'Currently Connected'
                : eldDeviceInfo?.name
                  ? `Device: ${eldDeviceInfo.name}`
                  : undefined

              if (!resolvedEldIdRaw && !eldDeviceInfo && !eldConnected) {
                return null
              }

              const formattedId = formatEldIdentifier(resolvedEldIdRaw) || 'Unavailable'

              return (
                <InfoCard
                  icon={<Bluetooth size={20} color="#3b82f6" />}
                  label="ELD Device ID"
                  value={formattedId}
                  subtext={eldSubtext}
                  color="#3b82f6"
                  index={5}
                />
              )
            })()}

            {/* Current Odometer from live ELD data */}
            {currentOdometer !== null && (
              <InfoCard
                icon={<TrendingUp size={20} color="#f59e0b" />}
                label="Live Odometer Reading"
                value={`${currentOdometer.toFixed(1)} km`}
                subtext="From ELD Device"
                color="#f59e0b"
                index={6}
              />
            )}

            {driverProfile.eld_exempt && driverProfile.eld_exempt_reason && (
              <InfoCard
                icon={<AlertTriangle size={20} color="#f59e0b" />}
                label="Exempt Reason"
                value={driverProfile.eld_exempt_reason}
                color="#f59e0b"
                index={6}
              />
            )}
          </ElevatedCard>
        )}

        {/* Current HOS Status */}
        {currentHOSStatus && (
          <ElevatedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={colors.palette.primary500} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Current HOS Status</Text>
            </View>
            <InfoCard
              icon={<Clock size={20} color={colors.palette.primary500} />}
              label="Duty Status"
              value={displayStatus}
              color={colors.palette.primary500}
              index={0}
            />
            <InfoCard
              icon={<TrendingUp size={20} color="#22C55E" />}
              label="Drive Time Remaining"
              value={`${Math.floor(currentHOSStatus.clocks.drive.remaining_minutes / 60)}h ${currentHOSStatus.clocks.drive.remaining_minutes % 60}m`}
              color="#22C55E"
              index={1}
            />
            <InfoCard
              icon={<TrendingUp size={20} color="#3B82F6" />}
              label="Shift Time Remaining"
              value={`${Math.floor(currentHOSStatus.clocks.shift.remaining_minutes / 60)}h ${currentHOSStatus.clocks.shift.remaining_minutes % 60}m`}
              color="#3B82F6"
              index={2}
            />
            <InfoCard
              icon={<TrendingUp size={20} color="#8B5CF6" />}
              label="Cycle Time Remaining"
              value={`${Math.floor(currentHOSStatus.clocks.cycle.remaining_minutes / 60)}h ${currentHOSStatus.clocks.cycle.remaining_minutes % 60}m`}
              color="#8B5CF6"
              index={3}
            />
          </ElevatedCard>
        )}

        {/* Violations */}
        {(unresolvedViolations.length > 0 ||
          driverProfile?.violations_count !== undefined) && (
            <ElevatedCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Compliance Status</Text>
              </View>

              {unresolvedViolations.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.violationCard,
                    {
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)",
                    },
                  ]}
                  onPress={() => router.push('/violations' as any)}
                >
                  <AlertTriangle size={24} color="#ef4444" />
                  <View style={styles.violationContent}>
                    <Text style={[styles.violationTitle, { color: "#ef4444" }]}>
                      Active Violations
                    </Text>
                    <Text style={[styles.violationCount, { color: colors.text }]}>
                      {unresolvedViolations.length} violation(s) require attention
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {driverProfile?.violations_count !== undefined && (
                <InfoCard
                  icon={<Shield size={20} color="#f59e0b" />}
                  label="Total Violations (Historical)"
                  value={driverProfile.violations_count.toString()}
                  color="#f59e0b"
                  index={0}
                />
              )}
            </ElevatedCard>
          )}

        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={item.onPress}
            index={index}
          />
        ))}

        {/* Edit Profile Button */}


        {/* Logout Button */}
        <LoadingButton
          title="Log Out"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  gradientHeader: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerDriverId: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoCardSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  compactEldGrid: {
    gap: 8,
    marginBottom: 8,
  },
  compactEldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  compactEldIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  enabledIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(156, 163, 175, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactEldText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 16,
  },
  violationCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    gap: 14,
  },
  violationContent: {
    flex: 1,
  },
  violationTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  violationCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  menuItem: {
    marginBottom: 12,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  editButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 0,
    marginBottom: 140,
  },
})
