/**
 * HOS Component - Displays Hours of Service information
 *
 * Automatically updates based on /api/driver/hos/current-status/ API response
 * Polls every 30 seconds to keep data fresh
 */

import React from "react"
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { Clock, AlertTriangle, Shield } from "lucide-react-native"
import * as Progress from "react-native-progress"

import { useHOSCurrentStatus } from "@/api/driver-hooks"
import HOSServiceCardSkeleton from "@/components/HOSServiceCardSkeleton"
import HOSCircle from "@/components/HOSSvg"
import { Text } from "@/components/Text"
import { colors } from "@/theme/colors"

interface HOSComponentProps {
  onScrollToTop?: () => void
  compact?: boolean
}

/**
 * Format minutes to HH:MM format
 */
const formatTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || minutes < 0) return "0:00"
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  return `${hours}:${mins.toString().padStart(2, "0")}`
}

/**
 * Format cycle time (can be large numbers)
 */
const formatCycleTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || minutes < 0) return "0:00"
  if (minutes >= 1440) {
    // Show days if >= 24 hours
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    return `${days}d ${hours}h`
  }
  return formatTime(minutes)
}

export const HOSComponent: React.FC<HOSComponentProps> = ({ onScrollToTop, compact = false }) => {
  const {
    data: hosStatus,
    isLoading,
    error,
  } = useHOSCurrentStatus({
    enabled: true,
    refetchInterval: 30000, // Poll every 30 seconds
  })

  if (isLoading) {
    return <HOSServiceCardSkeleton />
  }

  if (error || !hosStatus) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load HOS data</Text>
      </View>
    )
  }

  const { clocks, current_status, can_drive, violations, cannot_drive_reasons } = hosStatus

  // Calculate progress percentages (remaining / limit)
  const driveProgress = clocks.drive.remaining_minutes / clocks.drive.limit_minutes
  const shiftProgress = clocks.shift.remaining_minutes / clocks.shift.limit_minutes
  const cycleProgress = clocks.cycle.remaining_minutes / clocks.cycle.limit_minutes

  // Filter to only unresolved violations (if resolved field exists)
  const unresolvedViolations =
    violations?.filter((v: any) => v.resolved === false || v.resolved === undefined) || []

  // Check for violations
  const hasViolations = unresolvedViolations.length > 0
  const driveViolation = clocks.drive.remaining_minutes <= 0
  const shiftViolation = clocks.shift.remaining_minutes <= 0
  const cycleViolation = clocks.cycle.remaining_minutes <= 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={onScrollToTop} activeOpacity={0.7}>
          <Clock size={20} color="#22C55E" strokeWidth={2.5} />
          <Text style={styles.title}>Hours of Service</Text>
          {hasViolations && (
            <View style={styles.violationBadge}>
              <AlertTriangle size={12} color="#FFF" strokeWidth={2} />
              <Text style={styles.violationBadgeText}>{unresolvedViolations.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/hos" as any)} activeOpacity={0.7}>
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </TouchableOpacity>
      </View>

      {/* Current Status & Can Drive */}
      <View style={styles.currentStatusRow}>
        <View style={[styles.statusBadge, { backgroundColor: can_drive ? "#ECFDF5" : "#FEE2E2" }]}>
          <Text style={[styles.statusBadgeText, { color: can_drive ? "#059669" : "#DC2626" }]}>
            {current_status?.replace(/_/g, " ").toUpperCase() || "OFF DUTY"}
          </Text>
          {!can_drive && <Text style={styles.cannotDriveText}>Cannot Drive</Text>}
        </View>
        {!can_drive && cannot_drive_reasons && cannot_drive_reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            {cannot_drive_reasons.map((reason, index) => (
              <Text key={index} style={styles.reasonText}>
                • {reason}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Main Timer - 11-Hour Drive Limit */}
      <View style={styles.mainTimerWrapper}>
        <HOSCircle
          text={formatTime(clocks.drive.remaining_minutes)}
          size={140}
          progress={Math.min(100, Math.max(0, driveProgress * 100))}
          strokeWidth={8}
        />
        <Text style={styles.mainTimerLabel}>11-Hour Drive Limit</Text>
        {driveViolation && (
          <View style={styles.violationIndicator}>
            <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
            <Text style={styles.violationText}>Violation</Text>
          </View>
        )}
      </View>

      {/* Compact Clocks Grid - Circular Progress */}
      <View style={styles.clocksGrid}>
        {/* 14-Hour Shift */}
        <View style={styles.clockItem}>
          <View style={styles.clockHeader}>
            <Text style={styles.clockLabel}>14-Hr Shift</Text>
            {shiftViolation && <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />}
          </View>
          <View style={styles.circularProgressWrapper}>
            <Progress.Circle
              size={70}
              progress={Math.min(1, Math.max(0, shiftProgress))}
              color={shiftViolation ? "#EF4444" : colors.PRIMARY}
              thickness={6}
              showsText={false}
              strokeCap="round"
              unfilledColor="#E5E7EB"
            />
            <View style={styles.circularProgressText}>
              <Text
                style={[
                  styles.circularClockValue,
                  { color: shiftViolation ? "#EF4444" : colors.text },
                ]}
              >
                {formatTime(clocks.shift.remaining_minutes)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cycle */}
        <View style={styles.clockItem}>
          <View style={styles.clockHeader}>
            <Text style={styles.clockLabel}>
              {clocks.cycle.type === "70_8" ? "70-Hr" : "60-Hr"} Cycle
            </Text>
            {cycleViolation && <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />}
          </View>
          <View style={styles.circularProgressWrapper}>
            <Progress.Circle
              size={70}
              progress={Math.min(1, Math.max(0, cycleProgress))}
              color={cycleViolation ? "#EF4444" : colors.PRIMARY}
              thickness={6}
              showsText={false}
              strokeCap="round"
              unfilledColor="#E5E7EB"
            />
            <View style={styles.circularProgressText}>
              <Text
                style={[
                  styles.circularClockValue,
                  { color: cycleViolation ? "#EF4444" : colors.text },
                ]}
              >
                {formatCycleTime(clocks.cycle.remaining_minutes)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Break Info */}
      {clocks.break.required && (
        <View style={styles.breakAlert}>
          <Clock size={14} color="#F59E0B" strokeWidth={2} />
          <Text style={styles.breakAlertText}>
            Break required -{" "}
            {formatTime(
              Math.max(0, clocks.break.trigger_after_minutes - clocks.break.driving_since_break),
            )}{" "}
            until required
          </Text>
        </View>
      )}
      {!clocks.break.required && clocks.break.driving_since_break > 0 && (
        <View style={styles.breakInfo}>
          <Text style={styles.breakInfoText}>
            Driving since break: {formatTime(clocks.break.driving_since_break)}
          </Text>
        </View>
      )}

      {/* Active Violations Summary */}
      {hasViolations && (
        <View style={styles.violationsSummary}>
          <AlertTriangle size={16} color="#EF4444" strokeWidth={2} />
          <Text style={styles.violationsSummaryText}>
            {unresolvedViolations.length} active violation
            {unresolvedViolations.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.signButton}
          onPress={() => router.push("/status" as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.signButtonText}>Sign</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  actionButtons: {
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
  },
  breakAlert: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breakAlertText: {
    color: "#92400E",
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  breakInfo: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  breakInfoText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "400",
  },
  cannotDriveText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "500",
  },
  circularClockValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  circularProgressText: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  circularProgressWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clockHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  clockItem: {
    alignItems: "center",
    flex: 1,
  },
  clockLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
  },
  clocksGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  currentStatusRow: {
    marginBottom: 20,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 8,
  },
  mainTimerLabel: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },
  mainTimerWrapper: {
    alignItems: "center",
    marginVertical: 24,
  },
  reasonText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  reasonsContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  signButton: {
    alignItems: "center",
    backgroundColor: colors.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  signButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "600",
  },
  viewDetailsText: {
    color: colors.PRIMARY,
    fontSize: 14,
    fontWeight: "500",
  },
  violationBadge: {
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  violationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  violationIndicator: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  violationText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  violationsSummary: {
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  violationsSummaryText: {
    color: "#991B1B",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
})
