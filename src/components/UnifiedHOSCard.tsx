/**
 * Unified Smart HOS Card
 * 
 * A comprehensive, driver-friendly HOS card that consolidates:
 * - Current duty status with one-tap changes
 * - HOS clocks (Drive, Shift, Cycle)
 * - Mini HOS chart (24-hour timeline)
 * - Smart modal for reasons, split sleep, sign-out
 * - Inline violation handling (no blocking modals)
 * - Optimistic updates with undo
 */

import React, { useState, useCallback, useMemo, useRef } from "react"
import { Modal, Pressable, View, StyleSheet, TouchableOpacity } from "react-native"
import {
  Clock,
  AlertTriangle,
  MoreHorizontal,
  MapPin,
  Truck,
  Coffee,
  Bed,
  User,
  Briefcase,
  ChevronRight,
} from "lucide-react-native"
import * as Progress from "react-native-progress"
import { router } from "expo-router"
import { useHOSCurrentStatus, useChangeDutyStatus } from "@/api/driver-hooks"
import { useLocation } from "@/contexts/location-context"
import { useEldVehicleData } from "@/hooks/useEldVehicleData"
import { useLocationData } from "@/hooks/useLocationData"
import { useToast } from "@/providers/ToastProvider"
import { useAuth } from "@/stores/authStore"
import { Text } from "@/components/Text"
import { colors } from "@/theme/colors"
import { mapAppStatusToDriverStatus, mapDriverStatusToAppStatus } from "@/utils/hos-status-mapper"
import { DriverStatus } from "@/types/status"
import HOSChart from "@/components/VictoryHOS"
import { useHOSLogs } from "@/api/driver-hooks"

// Status configuration
type StatusConfigEntry = {
  label: string
  icon: typeof Truck
  color: string
  bgColor: string
  textColor: string
}

const STATUS_CONFIG: Record<DriverStatus, StatusConfigEntry> = {
  driving: {
    label: "Driving",
    icon: Truck,
    color: "#12B76A",
    bgColor: "#ECFDF5",
    textColor: "#059669",
  },
  onDuty: {
    label: "On Duty",
    icon: Briefcase,
    color: "#F79009",
    bgColor: "#FEF3C7",
    textColor: "#D97706",
  },
  offDuty: {
    label: "Off Duty",
    icon: Coffee,
    color: "#1570EF",
    bgColor: "#EFF6FF",
    textColor: "#1D4ED8",
  },
  sleeperBerth: {
    label: "Sleeper",
    icon: Bed,
    color: "#6941C6",
    bgColor: "#F4F3FF",
    textColor: "#6D28D9",
  },
  sleeping: {
    label: "Sleeper",
    icon: Bed,
    color: "#6941C6",
    bgColor: "#F4F3FF",
    textColor: "#6D28D9",
  },
  personalConveyance: {
    label: "Personal Conveyance",
    icon: User,
    color: "#0EA5E9",
    bgColor: "#E0F2FE",
    textColor: "#0369A1",
  },
  yardMove: {
    label: "Yard Move",
    icon: Truck,
    color: "#9CA3AF",
    bgColor: "#F3F4F6",
    textColor: "#4B5563",
  },
}

const STATUS_ORDER: DriverStatus[] = [
  "driving",
  "onDuty",
  "offDuty",
  "sleeperBerth",
  "personalConveyance",
  "yardMove",
]

const STATUS_REASON_OPTIONS: Record<DriverStatus, string[]> = {
  driving: [
    "Entering highway",
    "City driving",
    "Rural driving",
    "Adverse weather",
    "Detour route",
    "Returning to terminal",
  ],
  onDuty: [
    "Pre-trip inspection",
    "Loading cargo",
    "Unloading cargo",
    "Fuel stop",
    "Paperwork / administration",
  ],
  offDuty: [
    "Meal break",
    "End of shift",
    "Waiting at shipper",
    "Personal time",
    "Rest break",
  ],
  sleeperBerth: [
    "Sleeper berth rest",
    "Split sleeper (first period)",
    "Split sleeper (second period)",
    "Team driver rest",
    "Mandatory rest period",
  ],
  sleeping: [
    "Sleeper berth rest",
    "Split sleeper (first period)",
    "Split sleeper (second period)",
    "Team driver rest",
    "Mandatory rest period",
  ],
  personalConveyance: [
    "Commuting to lodging",
    "Personal errands",
    "Traveling to meal",
    "Driving to fuel (personal)",
    "Returning to terminal (personal)",
  ],
  yardMove: [
    "Yard repositioning",
    "Dock approach",
    "Trailer reposition",
    "Maintenance move",
    "Post-trip yard move",
  ],
}

// Driving reason options
interface UnifiedHOSCardProps {
  onScrollToTop?: () => void
}

export const UnifiedHOSCard: React.FC<UnifiedHOSCardProps> = ({ onScrollToTop }) => {
  const toast = useToast()
  const { currentLocation } = useLocation()
  const locationData = useLocationData()
  const { odometer: eldOdometer } = useEldVehicleData()
  const { driverProfile, user, logout } = useAuth()

  // HOS data
  const { data: hosStatus, isLoading, error, refetch } = useHOSCurrentStatus({
    enabled: true,
    refetchInterval: 30000,
  })

  // Get today's logs for chart
  const todayStr = new Date().toISOString().split("T")[0]
  const { data: hosLogsData } = useHOSLogs(todayStr, !!driverProfile?.driver_id)

  // Status change mutation
  const changeDutyStatusMutation = useChangeDutyStatus()

  // Local state
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | null>(null)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [splitSleepEnabled, setSplitSleepEnabled] = useState(false)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [violationWarning, setViolationWarning] = useState<any>(null)
  const [optimisticStatus, setOptimisticStatus] = useState<DriverStatus | null>(null)
  const [previousStatus, setPreviousStatus] = useState<DriverStatus | null>(null)
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false)
  const [pendingSignOut, setPendingSignOut] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetSelection = useCallback(() => {
    setSelectedStatus(null)
    setSelectedReason(null)
    setSplitSleepEnabled(false)
    setPendingSignOut(false)
  }, [])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
      }
    }
  }, [])

  // Current status from API (or optimistic update)
  const displayStatus = useMemo(() => {
    // Use optimistic status if available, otherwise use API status
    if (optimisticStatus) return optimisticStatus
    if (!hosStatus?.current_status) return null
    return mapDriverStatusToAppStatus(hosStatus.current_status)
  }, [optimisticStatus, hosStatus?.current_status])
  
  // Keep track of actual API status for undo
  const currentStatus = useMemo(() => {
    if (!hosStatus?.current_status) return null
    return mapDriverStatusToAppStatus(hosStatus.current_status)
  }, [hosStatus?.current_status])

  const statusConfig = useMemo(() => {
    if (!displayStatus) return null
    return STATUS_CONFIG[displayStatus]
  }, [displayStatus])

  // Format time helpers
  const formatTime = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined || minutes < 0) return "0:00"
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return `${hours}:${mins.toString().padStart(2, "0")}`
  }

  const formatCycleTime = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined || minutes < 0) return "0:00"
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      return `${days}d ${hours}h`
    }
    return formatTime(minutes)
  }

  // Get status since time from last log entry
  const getStatusSinceTime = useMemo(() => {
    if (!hosLogsData?.logs || hosLogsData.logs.length === 0) {
      return "Today"
    }
    // Get the most recent log entry
    const lastLog = hosLogsData.logs[hosLogsData.logs.length - 1]
    if (lastLog?.start_time) {
      const date = new Date(lastLog.start_time)
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? "PM" : "AM"
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`
    }
    return "Today"
  }, [hosLogsData])

  // Handle status chip tap
  const handleStatusChipTap = useCallback(
    (status: DriverStatus) => {
      setSelectedStatus(status)
      setViolationWarning(null)
      const reasons = STATUS_REASON_OPTIONS[status] || []
      setSelectedReason(reasons.length > 0 ? reasons[0] : null)
      setSplitSleepEnabled(false)
      setPendingSignOut(false)

      setStatusModalVisible(true)
    },
    [],
  )

  // Handle undo
  const handleUndo = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = null
    }

    setStatusModalVisible(false)

    if (previousStatus) {
      setOptimisticStatus(previousStatus)
    }
    setShowUndoSnackbar(false)
    setPendingEventId(null)
    resetSelection()

    toast.info("Status change reverted")
  }, [previousStatus, resetSelection, toast])

  // Handle confirm status change
  const handleConfirmStatusChange = useCallback(async (signOut: boolean = false) => {
    if (!selectedStatus) return

    const reasonOptions = STATUS_REASON_OPTIONS[selectedStatus] || []
    if (reasonOptions.length > 0 && !selectedReason) {
      toast.error("Please select a remark before confirming.")
      return
    }

    // Store previous status for undo
    setPreviousStatus(currentStatus)
    
    // Optimistic update - show new status immediately
    setOptimisticStatus(selectedStatus)
    
    // Generate client event ID for idempotency
    const clientEventId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setPendingEventId(clientEventId)
    setIsSubmitting(true)

    // Show undo snackbar (auto-hide after 5 seconds)
    setShowUndoSnackbar(true)
    
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
    }

    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoSnackbar(false)
    }, 5000)

    try {
      // Get odometer
      const odometer =
        eldOdometer.source === "eld" && eldOdometer.value !== null ? eldOdometer.value : 0

      // Map app status to API status
      const apiStatus = mapAppStatusToDriverStatus(selectedStatus)

      // Build payload (matching driver API structure)
      const requestPayload = {
        duty_status: apiStatus as any,
        location: {
          latitude: locationData.latitude !== 0 ? locationData.latitude : 0,
          longitude: locationData.longitude !== 0 ? locationData.longitude : 0,
          address: locationData.address || "",
        },
        odometer: odometer > 0 ? odometer : undefined,
        remark: selectedReason || "",
      }

      await changeDutyStatusMutation.mutateAsync(requestPayload)

      // Success - clear undo snackbar
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
        undoTimeoutRef.current = null
      }
      setShowUndoSnackbar(false)
      setStatusModalVisible(false)
      
      const statusLabel = STATUS_CONFIG[selectedStatus]?.label || selectedStatus
      toast.success(`Status set to ${statusLabel}`)

      // Handle sign-out if requested (after status change succeeds)
      if (selectedStatus === "offDuty" && signOut) {
        setTimeout(async () => {
          await logout()
          router.replace("/login")
        }, 1500)
      }

      // Reset state
      setOptimisticStatus(null)
      setPreviousStatus(null)
      setPendingEventId(null)
      setPendingSignOut(false)
      resetSelection()

      // Refetch HOS status
      refetch()
    } catch (error: any) {
      // Handle violation (check response data structure)
      const errorData = error?.response?.data || error?.data || {}
      if (error?.status === 409 || errorData.violations_detected || errorData.violation_type) {
        setStatusModalVisible(false)
        setViolationWarning({
          type: errorData.violation_type || "unknown",
          message: errorData.message || error?.message || "This change will create a violation",
          allowOverride: errorData.allow_override !== false,
        })
        return
      }

      // Handle other errors - rollback optimistic update
      toast.error(error?.message || errorData.message || "Failed to update status")
      
      // Rollback to previous status
      if (previousStatus) {
        setOptimisticStatus(previousStatus)
      } else {
        setOptimisticStatus(null)
      }
      setPendingEventId(null)
      setShowUndoSnackbar(false)
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
        undoTimeoutRef.current = null
      }
      setPendingSignOut(false)
      resetSelection()
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedStatus,
    selectedReason,
    eldOdometer,
    locationData,
    changeDutyStatusMutation,
    toast,
    logout,
    refetch,
    resetSelection,
    currentStatus,
  ])

  // Handle violation confirm
  const handleViolationConfirm = useCallback(() => {
    if (violationWarning?.allowOverride) {
      handleConfirmStatusChange(false)
    }
  }, [violationWarning, handleConfirmStatusChange])

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalVisible(false)
    resetSelection()
  }, [resetSelection])

  // Convert logs for chart (convert HOSLog[] to LogEntry[] format for VictoryHOS)
  const chartLogs = useMemo(() => {
    if (!hosLogsData?.logs || hosLogsData.logs.length === 0) return []
    
    // Sort by start_time
    const sortedLogs = [...hosLogsData.logs].sort((a: any, b: any) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    
    // Convert to chart format and pair up start/end times
    const chartEntries: any[] = []
    for (let i = 0; i < sortedLogs.length; i++) {
      const currentLog = sortedLogs[i]
      const nextLog = sortedLogs[i + 1]
      
      const start = new Date(currentLog.start_time)
      const end = nextLog ? new Date(nextLog.start_time) : new Date(start.getTime() + 24 * 60 * 60 * 1000)
      
      chartEntries.push({
        start,
        end,
        status: currentLog.duty_status,
        note: currentLog.remark || "",
      })
    }
    
    return chartEntries
  }, [hosLogsData])

  // Handle violation cancel
  const handleViolationCancel = useCallback(() => {
    setViolationWarning(null)
    setStatusModalVisible(false)
    resetSelection()
  }, [resetSelection])

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading HOS data...</Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error || !hosStatus) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load HOS data</Text>
        </View>
      </View>
    )
  }

  const { clocks, current_status, can_drive, violations } = hosStatus
  const unresolvedViolations = violations?.filter((v: any) => v.resolved === false || v.resolved === undefined) || []
  const hasViolations = unresolvedViolations.length > 0

  // Calculate progress percentages
  const driveProgress = Math.min(1, Math.max(0, clocks.drive.remaining_minutes / clocks.drive.limit_minutes))
  const shiftProgress = Math.min(1, Math.max(0, clocks.shift.remaining_minutes / clocks.shift.limit_minutes))
  const cycleProgress = Math.min(1, Math.max(0, clocks.cycle.remaining_minutes / clocks.cycle.limit_minutes))

  // Get location string
  const locationString = currentLocation?.address
    ? currentLocation.address.split(",")[0]
    : locationData.address?.split(",")[0] || "Unknown"

  const reasonOptions = selectedStatus ? STATUS_REASON_OPTIONS[selectedStatus] || [] : []
  const confirmDisabled = isSubmitting || !selectedStatus || (reasonOptions.length > 0 && !selectedReason)

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={14} color="#667085" />
          <Text style={styles.locationText}>{locationString}</Text>
        </View>
        <Text style={styles.headerTitle}>Hours of Service</Text>
        <View style={styles.headerRight}>
          {hasViolations && (
            <View style={[styles.violationBadge, { borderColor: "#DC354515", borderWidth: 1, borderRadius: 10 }]}>
              <AlertTriangle size={12} color="#DC3545" />
              <Text style={[styles.violationBadgeText, { color: "#DC3545" }]}>{unresolvedViolations.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Current Status Pill */}
      {statusConfig && (
        <View style={[styles.statusPill, { backgroundColor: statusConfig.bgColor }]}>
          <statusConfig.icon size={24} color={statusConfig.color} />
          <View style={styles.statusPillContent}>
            <Text style={[styles.statusPillLabel, { color: statusConfig.textColor }]}>
              {statusConfig.label}
            </Text>
            <Text style={styles.statusPillTime}>Since {getStatusSinceTime}</Text>
          </View>
        </View>
      )}

      {/* HOS Clocks Row */}
      <View style={styles.clocksRow}>
        {/* Drive Clock (large, centered) */}
        <View style={styles.driveClockWrapper}>
          <Progress.Circle
            size={120}
            progress={driveProgress}
            color={clocks.drive.remaining_minutes <= 0 ? "#EF4444" : "#12B76A"}
            thickness={10}
            showsText={false}
            strokeCap="round"
            unfilledColor="#E5E7EB"
          />
          <View style={styles.clockTextOverlay}>
            <Text style={styles.clockValue}>{formatTime(clocks.drive.remaining_minutes)}</Text>
            <Text style={styles.clockLabel}>Drive</Text>
          </View>
        </View>

        {/* Shift & Cycle Clocks (smaller, side-by-side) */}
        <View style={styles.smallClocksWrapper}>
          {/* Shift Clock */}
          <View style={styles.smallClockWrapper}>
            <Progress.Circle
              size={80}
              progress={shiftProgress}
              color={clocks.shift.remaining_minutes <= 0 ? "#EF4444" : "#F79009"}
              thickness={6}
              showsText={false}
              strokeCap="round"
              unfilledColor="#E5E7EB"
            />
            <View style={styles.smallClockTextOverlay}>
              <Text
                style={[
                  styles.smallClockValue,
                  clocks.shift.remaining_minutes <= 0 && styles.clockValueViolation,
                ]}
              >
                {formatTime(clocks.shift.remaining_minutes)}
              </Text>
              <Text style={styles.smallClockLabel}>Shift</Text>
            </View>
          </View>

          {/* Cycle Clock */}
          <View style={styles.smallClockWrapper}>
            <Progress.Circle
              size={80}
              progress={cycleProgress}
              color={clocks.cycle.remaining_minutes <= 0 ? "#EF4444" : "#1570EF"}
              thickness={6}
              showsText={false}
              strokeCap="round"
              unfilledColor="#E5E7EB"
            />
            <View style={styles.smallClockTextOverlay}>
              <Text
                style={[
                  styles.smallClockValue,
                  clocks.cycle.remaining_minutes <= 0 && styles.clockValueViolation,
                ]}
              >
                {formatCycleTime(clocks.cycle.remaining_minutes)}
              </Text>
              <Text style={styles.smallClockLabel}>
                {clocks.cycle.type === "70_8" ? "70-Hr" : "60-Hr"} Cycle
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Mini HOS Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Today's Activity</Text>
          <TouchableOpacity onPress={() => router.push("/hos" as any)}>
            <Text style={styles.chartViewAll}>View Full Log →</Text>
          </TouchableOpacity>
        </View>
        {chartLogs.length > 0 ? (
          <HOSChart
            data={chartLogs}
            dayStartIso={`${todayStr}T00:00:00Z`}
            header={{
              driverName: driverProfile?.name || user?.name || "Driver",
              driverId: driverProfile?.driver_id || "",
            }}
          />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>No activity logged today</Text>
          </View>
        )}
      </View>
      {/* Status Grid */}
      <View style={styles.statusGrid}>
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const IconComponent = config.icon
          const isActive =
            displayStatus === status ||
            (status === "sleeperBerth" && displayStatus === "sleeping")
          const isSelected = selectedStatus === status

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                isActive && { backgroundColor: config.bgColor, borderColor: config.color },
                isSelected && !isActive && { borderColor: config.color, backgroundColor: "#FFFFFF" },
                isSubmitting && isSelected && { opacity: 0.7 },
              ]}
              onPress={() => handleStatusChipTap(status)}
              disabled={isSubmitting}
            >
              <View style={styles.statusChipHeader}>
                <IconComponent size={22} color={config.color} />
                {isActive && <Text style={styles.statusChipBadge}>Current</Text>}
              </View>
              <Text
                style={[
                  styles.statusChipLabel,
                  (isActive || isSelected) && { color: config.textColor },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Violation Banner */}
      {violationWarning && (
        <View style={styles.violationBanner}>
          <AlertTriangle size={20} color={colors.error} />
          <View style={styles.violationContent}>
            <Text style={styles.violationTitle}>Violation Warning</Text>
            <Text style={styles.violationMessage}>{violationWarning.message}</Text>
            <View style={styles.violationActions}>
              {violationWarning.allowOverride &&
                (
                  <TouchableOpacity
                    style={styles.violationConfirmButton}
                    onPress={handleViolationConfirm}
                  >
                    <Text style={styles.violationConfirmText}>Confirm Anyway</Text>
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                style={styles.violationCancelButton}
                onPress={handleViolationCancel}
              >
                <Text style={styles.violationCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}



      {/* Footer */}
      <View style={styles.footer}>
        {clocks.break.required && (
          <View style={styles.breakInfo}>
            <Clock size={14} color="#F79009" />
            <Text style={styles.breakText}>
              Break required in {formatTime(Math.max(0, clocks.break.trigger_after_minutes - clocks.break.driving_since_break))}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.auditLinkButton} onPress={() => router.push("/logs")}>
          <Text style={styles.auditLink}>View HOS Logs</Text>
          <ChevronRight size={16} color={colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Undo Snackbar */}
      {showUndoSnackbar && selectedStatus && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>
            Status set to {STATUS_CONFIG[selectedStatus]?.label || "Unknown"} — Undo
          </Text>
          <TouchableOpacity onPress={handleUndo} style={styles.snackbarButton}>
            <Text style={styles.snackbarButtonText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseStatusModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseStatusModal} />
        <View style={styles.modalCard}>
          {selectedStatus ? (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{STATUS_CONFIG[selectedStatus]?.label}</Text>
                <Text style={styles.modalSubtitle}>
                  Confirm new duty status below and select a required remark.
                </Text>
              </View>

              {reasonOptions.length > 0 && (
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Select remark (required)</Text>
                  <View style={styles.reasonChipGrid}>
                    {reasonOptions.map((reason) => {
                      const isActive = selectedReason === reason
                      return (
                        <TouchableOpacity
                          key={reason}
                          style={[
                            styles.reasonChip,
                            isActive && styles.reasonChipActive,
                          ]}
                          onPress={() => setSelectedReason(reason)}
                        >
                          <Text
                            style={[
                              styles.reasonChipText,
                              isActive && styles.reasonChipTextActive,
                            ]}
                          >
                            {reason}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}

              {(selectedStatus === "driving" || selectedStatus === "sleeperBerth") && (
                <View style={styles.toggleSection}>
                  <View style={styles.toggleLabelRow}>
                    <Text style={styles.toggleLabel}>Split Sleep</Text>
                    <Text style={styles.toggleHint}>Adds 2 hours to driving time</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, splitSleepEnabled && styles.toggleActive]}
                    onPress={() => setSplitSleepEnabled(!splitSleepEnabled)}
                  >
                    <View style={[styles.toggleThumb, splitSleepEnabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCloseStatusModal}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.modalActionGroup}>
                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryButton,
                      (confirmDisabled || isSubmitting) && styles.modalPrimaryButtonDisabled,
                    ]}
                    onPress={() => {
                      handleConfirmStatusChange(false)
                    }}
                    disabled={confirmDisabled || isSubmitting}
                  >
                    <Text style={styles.modalPrimaryText}>
                      {isSubmitting ? "Updating..." : "Confirm"}
                    </Text>
                  </TouchableOpacity>
                  {selectedStatus === "offDuty" && (
                    <TouchableOpacity
                      style={[
                        styles.modalSecondaryButton,
                        (confirmDisabled || isSubmitting) && styles.modalPrimaryButtonDisabled,
                      ]}
                      onPress={() => {
                        handleConfirmStatusChange(true)
                      }}
                      disabled={confirmDisabled || isSubmitting}
                    >
                      <Text style={styles.modalSecondaryText}>
                        {isSubmitting ? "Updating..." : "Confirm & Sign Out"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.modalEmptyState}>
              <Text style={styles.modalEmptyText}>Select a duty status to continue.</Text>
            </View>
          )}
        </View>
      </Modal>
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
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#667085",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#667085",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  violationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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
  // Status Pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusPillContent: {
    flex: 1,
  },
  statusPillLabel: {
    fontSize: 20,
    fontWeight: "700",
  },
  statusPillTime: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2,
  },
  // Status Grid
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  statusChip: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
    backgroundColor: "#F9FAFB",
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  statusChipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusChipBadge: {
    backgroundColor: "#E5F4FF",
    color: colors.PRIMARY,
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusChipLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  // Status modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    gap: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#667085",
  },
  reasonSection: {
    gap: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#667085",
  },
  reasonChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EAECF0",
    marginRight: 8,
    marginBottom: 8,
  },
  reasonChipActive: {
    backgroundColor: colors.PRIMARY,
    borderColor: colors.PRIMARY,
  },
  reasonChipText: {
    fontSize: 12,
    color: "#667085",
  },
  reasonChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabelRow: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  toggleHint: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.PRIMARY,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  modalActions: {
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    marginTop: 8,
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    width: "100%",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  modalActionGroup: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  modalPrimaryButton: {
    backgroundColor: colors.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
    width: "100%",
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSecondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.PRIMARY,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    width: "100%",
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.PRIMARY,
  },
  modalEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  modalEmptyText: {
    fontSize: 13,
    color: "#667085",
  },
  // Violation Banner
  violationBanner: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  violationContent: {
    flex: 1,
    gap: 8,
  },
  violationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.error,
  },
  violationMessage: {
    fontSize: 13,
    color: colors.error,
  },
  violationActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  violationConfirmButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  violationConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  violationCancelButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  violationCancelText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "500",
  },
  // Clocks Row
  clocksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 24,
    paddingHorizontal: 8,
  },
  driveClockWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clockTextOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  clockValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  clockLabel: {
    fontSize: 12,
    color: "#667085",
    marginTop: 4,
  },
  smallClocksWrapper: {
    flexDirection: "row",
    gap: 24,
    flex: 1,
    justifyContent: "center",
  },
  smallClockWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  smallClockTextOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  smallClockValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  clockValueViolation: {
    color: "#EF4444",
  },
  smallClockLabel: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },
  // Chart
  chartContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  chartViewAll: {
    fontSize: 12,
    color: colors.PRIMARY,
    fontWeight: "500",
  },
  chartPlaceholder: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: "#667085",
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EAECF0",
  },
  breakInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakText: {
    fontSize: 12,
    color: "#F79009",
    fontWeight: "500",
  },
  auditLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  auditLink: {
    fontSize: 12,
    color: colors.PRIMARY,
    fontWeight: "500",
  },
  // Snackbar
  snackbar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  snackbarText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    marginRight: 12,
  },
  snackbarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  snackbarButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.PRIMARY,
  },
})

