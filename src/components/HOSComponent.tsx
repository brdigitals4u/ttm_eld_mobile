/**
 * HOS Component - Displays Hours of Service information
 * 
 * Automatically updates based on /api/driver/hos/current-status/ API response
 * Polls every 30 seconds to keep data fresh
 */

import React from "react"
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { Clock, AlertTriangle, Shield } from "lucide-react-native"
import * as Progress from "react-native-progress"
import { router } from "expo-router"
import { useHOSCurrentStatus } from "@/api/driver-hooks"
import { Text } from "@/components/Text"
import HOSCircle from "@/components/HOSSvg"
import { colors } from "@/theme/colors"
import HOSServiceCardSkeleton from "@/components/HOSServiceCardSkeleton"

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

export const HOSComponent: React.FC<HOSComponentProps> = ({ 
  onScrollToTop,
  compact = false 
}) => {
  const { data: hosStatus, isLoading, error } = useHOSCurrentStatus({
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

  // Check for violations
  const hasViolations = violations && violations.length > 0
  const driveViolation = clocks.drive.remaining_minutes <= 0
  const shiftViolation = clocks.shift.remaining_minutes <= 0
  const cycleViolation = clocks.cycle.remaining_minutes <= 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={onScrollToTop}
          activeOpacity={0.7}
        >
          <Clock size={20} color="#22C55E" strokeWidth={2.5} />
          <Text style={styles.title}>Hours of Service</Text>
          {hasViolations && (
            <View style={styles.violationBadge}>
              <AlertTriangle size={12} color="#FFF" strokeWidth={2} />
              <Text style={styles.violationBadgeText}>{violations.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push("/hos" as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>View Details →</Text>
        </TouchableOpacity>
      </View>

      {/* Current Status & Can Drive */}
      <View style={styles.currentStatusRow}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: can_drive ? "#ECFDF5" : "#FEE2E2" }
        ]}>
          <Text style={[
            styles.statusBadgeText,
            { color: can_drive ? "#059669" : "#DC2626" }
          ]}>
            {current_status?.replace(/_/g, ' ').toUpperCase() || 'OFF DUTY'}
          </Text>
          {!can_drive && (
            <Text style={styles.cannotDriveText}>Cannot Drive</Text>
          )}
        </View>
        {!can_drive && cannot_drive_reasons && cannot_drive_reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            {cannot_drive_reasons.map((reason, index) => (
              <Text key={index} style={styles.reasonText}>• {reason}</Text>
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
            {shiftViolation && (
              <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />
            )}
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
              <Text style={[
                styles.circularClockValue,
                { color: shiftViolation ? "#EF4444" : colors.text }
              ]}>
                {formatTime(clocks.shift.remaining_minutes)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cycle */}
        <View style={styles.clockItem}>
          <View style={styles.clockHeader}>
            <Text style={styles.clockLabel}>
              {clocks.cycle.type === '70_8' ? '70-Hr' : '60-Hr'} Cycle
            </Text>
            {cycleViolation && (
              <AlertTriangle size={12} color="#EF4444" strokeWidth={2} />
            )}
          </View>
          <View style={styles.circularProgressWrapper}>
            <Progress.Circle
              size={70}
              progress={Math.min(1, Math.max(0, cycleProgress))}
              color={cycleViolation ? "#EF4444" : "#8B5CF6"}
              thickness={6}
              showsText={false}
              strokeCap="round"
              unfilledColor="#E5E7EB"
            />
            <View style={styles.circularProgressText}>
              <Text style={[
                styles.circularClockValue,
                { color: cycleViolation ? "#EF4444" : colors.text }
              ]}>
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
            Break required - {formatTime(Math.max(0, clocks.break.trigger_after_minutes - clocks.break.driving_since_break))} until required
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
            {violations.length} active violation{violations.length !== 1 ? 's' : ''}
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
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  violationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  violationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  viewDetailsText: {
    fontSize: 14,
    color: colors.PRIMARY,
    fontWeight: "500",
  },
  currentStatusRow: {
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cannotDriveText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "500",
  },
  reasonsContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  reasonText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  mainTimerWrapper: {
    alignItems: "center",
    marginVertical: 24,
  },
  mainTimerLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 12,
  },
  violationIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  violationText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  clocksGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  clockItem: {
    alignItems: "center",
    flex: 1,
  },
  clockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  clockLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  circularProgressWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  circularProgressText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  circularClockValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  breakAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  breakAlertText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "500",
    flex: 1,
  },
  breakInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  breakInfoText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
  },
  violationsSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  violationsSummaryText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
    flex: 1,
  },
  actionButtons: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  signButton: {
    backgroundColor: colors.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  signButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
})

