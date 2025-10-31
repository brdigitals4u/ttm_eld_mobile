import React, { useMemo } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native"
import { router } from "expo-router"
import {
  MapPin,
  Bell,
  Truck,
  Clock,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"

import { useAuth } from "@/stores/authStore"
import { useStatus } from "@/contexts"
import { EldIndicator } from "@/components/EldIndicator"
import TTMKonnectLogo from "@/components/TTMKonnectLogo"
import { colors } from "@/theme/colors"

export const DashboardScreen = () => {
  const {
    user,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    isLoading,
  } = useAuth()
  const { logEntries, certification } = useStatus()

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

    const drivingTimeRemaining =
      hosStatus.driving_time_remaining || hosStatus.time_remaining?.driving_time_remaining || 0
    const onDutyTimeRemaining =
      hosStatus.on_duty_time_remaining || hosStatus.time_remaining?.on_duty_time_remaining || 0
    const cycleTimeRemaining =
      hosStatus.cycle_time_remaining || hosStatus.time_remaining?.cycle_time_remaining || 0

    const cycleDays = Math.ceil(cycleTimeRemaining / (24 * 60))

    const vehicleInfo = vehicleAssignment?.vehicle_info
    const vehicleUnit = vehicleInfo?.vehicle_unit || "N/A"
    const truck = vehicleInfo?.make || "N/A"
    const trailer = vehicleInfo?.model || "N/A"

    const currentDate = new Date()
    const dateTitle = `Today | ${currentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    })}`

    const orgName = organizationSettings?.organization_name || "TTM Konnect"

    const uncertifiedLogsCount = logEntries.filter((log) => !log.isCertified).length

    console.log("📊 DashboardScreen Debug:")
    console.log("  📋 Total logEntries:", logEntries.length)
    console.log("  ❌ Uncertified logs:", uncertifiedLogsCount)
    console.log(
      "  📝 First few log dates:",
      logEntries.slice(0, 3).map((log) => new Date(log.startTime).toDateString()),
    )

    return {
      appTitle: orgName,
      connected: true,
      driver: `${user.firstName} ${user.lastName}`,
      coDriver: "N/A",
      truck: vehicleUnit,
      trailer: "N/A",
      duty: hosStatus.current_status || "OFF_DUTY",
      cycleLabel: "USA 70 hours / 8 days",
      stopIn: onDutyTimeRemaining,
      driveLeft: drivingTimeRemaining,
      shiftLeft: onDutyTimeRemaining,
      cycleLeft: cycleTimeRemaining,
      cycleDays: cycleDays,
      dateTitle: dateTitle,
      vehicleUnit: vehicleUnit,
      uncertifiedLogsCount: uncertifiedLogsCount,
      isCertified: certification.isCertified,
    }
  }, [
    user,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    logEntries,
    certification,
  ]) as any

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

  const dutyStyle = getDutyStatusStyle(data.duty)

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.cc}>
      {/* Modern Header */}
      <View style={s.topHeader}>
        <View style={s.profileSection}>
          <View style={s.avatarContainer}>
            <Text style={s.avatarText}>{data.driver.charAt(0)}</Text>
          </View>
          <View style={s.locationInfo}>
            <View style={s.locationRow}>
              <MapPin size={16} color="#1F2937" strokeWidth={2.5} />
              <Text style={s.locationTitle}>Current Location</Text>
            </View>
            <Text style={s.locationAddress}>{data.vehicleUnit}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.notificationBtn}>
          <Image
            source={require("assets/images/ttm-logo.png")}
            style={s.loginHeaderImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

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
        <Text style={s.greetingText}>Hi {data.driver.split(" ")[0]},</Text>
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
          <Text style={s.bigTimerValue}>{time(data.stopIn)}</Text>
          <Text style={s.bigTimerSubtext}>hours remaining</Text>
        </View>

        {/* Horizontal Stats */}
        <View style={s.horizontalStats}>
          <View style={s.statItem}>
            <View style={s.statIconCircle}>
              <TrendingUp size={18} color="#22C55E" strokeWidth={2.5} />
            </View>
            <Text style={s.statItemLabel}>Drive</Text>
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
              {cycleTime(data.cycleLeft)} ({data.cycleDays}d)
            </Text>
          </View>
          <View style={s.cycleProgressBar}>
            <View style={[s.cycleProgressFill, { width: `${pct(data.cycleLeft, 4200)}%` }]} />
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

        <View style={s.simpleChart}>
          <View style={s.chartRow}>
            <View
              style={[s.chartBlock, { backgroundColor: "#94A3B8", left: "6%", width: "42%" }]}
            />
          </View>
          <View style={s.chartRow}>
            <View
              style={[s.chartBlock, { backgroundColor: "#F59E0B", left: "48%", width: "30%" }]}
            />
          </View>
          <View style={s.chartRow}>
            <View
              style={[s.chartBlock, { backgroundColor: "#22C55E", left: "36%", width: "50%" }]}
            />
          </View>
          <View style={s.chartRow}>
            <View
              style={[s.chartBlock, { backgroundColor: "#3B82F6", left: "82%", width: "14%" }]}
            />
          </View>
        </View>

        <View style={s.chartLegend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: "#94A3B8" }]} />
            <Text style={s.legendText}>Off Duty</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={s.legendText}>Sleeper</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: "#22C55E" }]} />
            <Text style={s.legendText}>Driving</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: "#3B82F6" }]} />
            <Text style={s.legendText}>On Duty</Text>
          </View>
        </View>
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />
    </ScrollView>
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
    backgroundColor: "#22C55E",
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
    marginBottom: 8,
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
})
