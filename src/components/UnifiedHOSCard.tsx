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

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  memo,
  useImperativeHandle,
  forwardRef,
} from "react"
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native"
import { router } from "expo-router"
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

import { useHOSCurrentStatus, useChangeDutyStatus } from "@/api/driver-hooks"
import { useHOSLogs } from "@/api/driver-hooks"
import HOSCircle from "@/components/HOSSvg"
import { SemiCircularGauge } from "@/components/SemiCircularGauge"
import { Text } from "@/components/Text"
import HOSChart from "@/components/VictoryHOS"
import { COLORS } from "@/constants"
import { useLocation } from "@/contexts/location-context"
import { useEldVehicleData } from "@/hooks/useEldVehicleData"
import { useLocationData } from "@/hooks/useLocationData"
import { translate } from "@/i18n/translate"
import { useToast } from "@/providers/ToastProvider"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { DriverStatus } from "@/types/status"
import { mapAppStatusToDriverStatus, mapDriverStatusToAppStatus } from "@/utils/hos-status-mapper"

// Status configuration
type StatusConfigEntry = {
  label: string
  icon: typeof Truck
  color: string
  bgColor: string
  textColor: string
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
  offDuty: ["Meal break", "End of shift", "Waiting at shipper", "Personal time", "Rest break"],
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
  disabled?: boolean
  disabledMessage?: string
}

export interface UnifiedHOSCardRef {
  openStatusModal: (status: DriverStatus) => void
}

const UnifiedHOSCardComponent = forwardRef<UnifiedHOSCardRef, UnifiedHOSCardProps>(
  ({ onScrollToTop, disabled = false, disabledMessage }, ref) => {
    // Get theme colors - supports both light and dark themes
    const { theme } = useAppTheme()
    const { colors } = theme

    // Status configuration with theme colors
    const STATUS_CONFIG: Record<DriverStatus, StatusConfigEntry> = useMemo(
      () => ({
        driving: {
          label: "Driving",
          icon: Truck,
          color: colors.success,
          bgColor: colors.successBackground,
          textColor: colors.success,
        },
        onDuty: {
          label: "On Duty",
          icon: Briefcase,
          color: colors.warning,
          bgColor: colors.warningBackground,
          textColor: colors.warning,
        },
        offDuty: {
          label: "Off Duty",
          icon: Coffee,
          color: colors.tint,
          bgColor: `${colors.tint}15`,
          textColor: colors.text,
        },
        sleeperBerth: {
          label: "Sleeper",
          icon: Bed,
          color: colors.palette.primary600,
          bgColor: colors.palette.primary100,
          textColor: colors.palette.primary800,
        },
        sleeping: {
          label: "Sleeper",
          icon: Bed,
          color: colors.palette.primary600,
          bgColor: colors.palette.primary100,
          textColor: colors.palette.primary800,
        },
        personalConveyance: {
          label: "Personal Conveyance",
          icon: User,
          color: colors.palette.accent500,
          bgColor: colors.palette.accent100,
          textColor: colors.palette.accent800,
        },
        yardMove: {
          label: "Yard Move",
          icon: Truck,
          color: colors.textDim,
          bgColor: colors.sectionBackground,
          textColor: colors.text,
        },
      }),
      [colors],
    )

    const toast = useToast()
    const { currentLocation } = useLocation()
    const locationData = useLocationData()
    const { odometer: eldOdometer } = useEldVehicleData()
    const { driverProfile, user, logout } = useAuth()
    const { width: screenWidth } = useWindowDimensions()

    const isSmallWidth = screenWidth < 600
    const isTabletWidth = screenWidth >= 768

    const driveCircleSize = isTabletWidth ? 150 : isSmallWidth ? 120 : 140
    const driveCircleThickness = isTabletWidth ? 10 : isSmallWidth ? 8 : 10
    const driveValueFontSize = isTabletWidth ? 22 : isSmallWidth ? 16 : 18
    const driveLabelFontSize = isTabletWidth ? 14 : isSmallWidth ? 11 : 12

    const secondaryCircleSize = isTabletWidth ? 100 : isSmallWidth ? 80 : 90
    const secondaryCircleThickness = isTabletWidth ? 7 : isSmallWidth ? 5 : 6
    const secondaryValueFontSize = isTabletWidth ? 16 : isSmallWidth ? 13 : 14
    const secondaryLabelFontSize = isTabletWidth ? 12 : isSmallWidth ? 10 : 11

    // HOS data
    const {
      data: hosStatus,
      isLoading,
      error,
      refetch,
    } = useHOSCurrentStatus({
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
    const [pendingSignOut, setPendingSignOut] = useState(false)
    const [statusModalVisible, setStatusModalVisible] = useState(false)

    // Timer state for auto-select default option
    const [timerSeconds, setTimerSeconds] = useState(10)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const resetSelection = useCallback(() => {
      setSelectedStatus(null)
      setSelectedReason(null)
      setSplitSleepEnabled(false)
      setPendingSignOut(false)
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
    const handleStatusChipTap = useCallback((status: DriverStatus) => {
      setSelectedStatus(status)
      setViolationWarning(null)
      const reasons = STATUS_REASON_OPTIONS[status] || []
      // Set first reason as default, but don't auto-select yet
      setSelectedReason(null)
      setSplitSleepEnabled(false)
      setPendingSignOut(false)

      // Start timer
      setTimerSeconds(10)
      setStatusModalVisible(true)
    }, [])

    // Timer effect - countdown and auto-select default
    React.useEffect(() => {
      if (!statusModalVisible || !selectedStatus) {
        // Clear timer when modal closes
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        return
      }

      const reasonOptions = STATUS_REASON_OPTIONS[selectedStatus] || []
      if (reasonOptions.length === 0) {
        // No reason required - update immediately
        handleConfirmStatusChange(false).catch(() => {
          // Error handling
        })
        return
      }

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer expired - auto-select first reason and save
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            const defaultReason = reasonOptions[0]
            setSelectedReason(defaultReason)
            // Auto-save will be triggered by the reason selection effect
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusModalVisible, selectedStatus])

    // Auto-save when reason is selected (only once, prevent infinite loops)
    const hasAutoSavedRef = useRef(false)
    const lastSavedReasonRef = useRef<string | null>(null)

    React.useEffect(() => {
      if (
        selectedReason &&
        selectedStatus &&
        statusModalVisible &&
        !isSubmitting &&
        !hasAutoSavedRef.current &&
        lastSavedReasonRef.current !== selectedReason
      ) {
        hasAutoSavedRef.current = true
        lastSavedReasonRef.current = selectedReason
        // Reason selected - auto-save
        handleConfirmStatusChange(false).catch(() => {
          // Error handling - reset flag on error
          hasAutoSavedRef.current = false
          lastSavedReasonRef.current = null
        })
        // Reset after a delay to allow for new selections
        setTimeout(() => {
          hasAutoSavedRef.current = false
        }, 2000)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedReason, selectedStatus, statusModalVisible, isSubmitting])

    // Reset auto-save flag when modal closes
    React.useEffect(() => {
      if (!statusModalVisible) {
        hasAutoSavedRef.current = false
        lastSavedReasonRef.current = null
        setTimerSeconds(10)
      }
    }, [statusModalVisible])

    // Expose handleStatusChipTap via ref
    useImperativeHandle(
      ref,
      () => ({
        openStatusModal: handleStatusChipTap,
      }),
      [handleStatusChipTap],
    )

    // Handle confirm status change
    const handleConfirmStatusChange = useCallback(
      async (signOut: boolean = false) => {
        if (!selectedStatus) return

        const reasonOptions = STATUS_REASON_OPTIONS[selectedStatus] || []
        if (reasonOptions.length > 0 && !selectedReason) {
          // If timer expired and auto-selected, use first reason
          if (timerSeconds === 0 && reasonOptions.length > 0) {
            setSelectedReason(reasonOptions[0])
            // Will trigger auto-save via effect
            return
          }
          // Otherwise wait for user selection
          return
        }

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // Store previous status for undo (but we won't show undo snackbar)
        setPreviousStatus(currentStatus)

        // Optimistic update - show new status immediately
        setOptimisticStatus(selectedStatus)

        // Generate client event ID for idempotency
        const clientEventId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setPendingEventId(clientEventId)
        setIsSubmitting(true)

        // Remove undo snackbar - no longer showing it

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

          // Success - close modal automatically
          setStatusModalVisible(false)
          resetSelection()
          hasAutoSavedRef.current = false
          lastSavedReasonRef.current = null

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
          setPendingSignOut(false)
          resetSelection()
        } finally {
          setIsSubmitting(false)
        }
      },
      [
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
      ],
    )

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
      const sortedLogs = [...hosLogsData.logs].sort(
        (a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )

      // Convert to chart format and pair up start/end times
      const chartEntries: any[] = []
      for (let i = 0; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i]
        const nextLog = sortedLogs[i + 1]

        const start = new Date(currentLog.start_time)
        const end = nextLog
          ? new Date(nextLog.start_time)
          : new Date(start.getTime() + 24 * 60 * 60 * 1000)

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

    // Dynamic styles based on theme
    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            elevation: 4,
            marginHorizontal: 16,
            marginVertical: 12,
            padding: 20,
            shadowColor: colors.palette.neutral900,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          loadingContainer: {
            alignItems: "center",
            padding: 40,
          },
          loadingText: {
            color: colors.textDim,
            fontSize: 14,
          },
          errorContainer: {
            alignItems: "center",
            flexDirection: "row",
            gap: 8,
            padding: 20,
          },
          errorText: {
            color: colors.error,
            fontSize: 14,
          },
          disabledContainer: {
            alignItems: "center",
            backgroundColor: colors.warningBackground,
            borderRadius: 16,
            gap: 12,
            padding: 24,
          },
          disabledTitle: {
            color: colors.warning,
            fontSize: 20,
            fontWeight: "800",
            marginTop: 8,
          },
          disabledMessage: {
            color: colors.warning,
            fontSize: 14,
            fontWeight: "600",
            lineHeight: 20,
            textAlign: "center",
          },
          // Header
          header: {
            alignItems: "center",
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
          },
          headerLeft: {
            alignItems: "center",
            flexDirection: "row",
            gap: 4,
          },
          locationText: {
            color: colors.textDim,
            fontSize: 12,
          },
          headerTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: "600",
          },
          headerRight: {
            alignItems: "center",
            flexDirection: "row",
            gap: 8,
          },
          violationBadge: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            flexDirection: "row",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
          },
          violationBadgeText: {
            color: colors.text,
            fontSize: 11,
            fontWeight: "600",
          },
          // Status Pill
          statusPill: {
            alignItems: "center",
            borderRadius: 16,
            flexDirection: "row",
            gap: 12,
            marginBottom: 16,
            padding: 16,
          },
          statusPillContent: {
            flex: 1,
          },
          statusPillLabel: {
            fontSize: 20,
            fontWeight: "700",
          },
          statusPillTime: {
            color: colors.textDim,
            fontSize: 12,
            marginTop: 2,
          },
          // Status Grid
          statusGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginBottom: 8,
            marginTop: 12,
          },
          statusChip: {
            backgroundColor: colors.sectionBackground,
            borderColor: colors.border,
            borderRadius: 16,
            borderWidth: 1,
            marginBottom: 12,
            paddingHorizontal: 14,
            paddingVertical: 16,
            width: "48%",
          },
          statusChipHeader: {
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          },
          statusChipBadge: {
            backgroundColor: colors.palette.primary100,
            borderRadius: 10,
            color: colors.tint,
            fontSize: 10,
            fontWeight: "600",
            paddingHorizontal: 8,
            paddingVertical: 2,
          },
          statusChipLabel: {
            color: colors.text,
            fontSize: 15,
            fontWeight: "600",
          },
          // Status modal
          modalBackdrop: {
            backgroundColor: "rgba(0,0,0,0.35)",
            flex: 1,
          },
          modalCard: {
            backgroundColor: colors.cardBackground,
            borderRadius: 20,
            bottom: 40,
            elevation: 16,
            gap: 20,
            left: 20,
            paddingHorizontal: 20,
            paddingVertical: 16,
            position: "absolute",
            right: 20,
            shadowColor: colors.palette.neutral900,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          },
          modalHeader: {
            gap: 4,
          },
          modalTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: "600",
          },
          modalSubtitle: {
            color: colors.textDim,
            fontSize: 12,
          },
          reasonSection: {
            gap: 8,
          },
          reasonLabel: {
            color: colors.textDim,
            fontSize: 12,
            fontWeight: "500",
          },
          reasonChipGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 4,
          },
          reasonChip: {
            backgroundColor: colors.sectionBackground,
            borderColor: colors.border,
            borderRadius: 20,
            borderWidth: 1,
            marginBottom: 8,
            marginRight: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
          },
          reasonChipActive: {
            backgroundColor: colors.tint,
            borderColor: colors.tint,
          },
          reasonChipText: {
            color: colors.textDim,
            fontSize: 12,
          },
          reasonChipTextActive: {
            color: colors.text,
            fontWeight: "600",
          },
          toggleSection: {
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
          },
          toggleLabelRow: {
            flex: 1,
          },
          toggleLabel: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "500",
          },
          toggleHint: {
            color: colors.textDim,
            fontSize: 12,
            marginTop: 2,
          },
          toggle: {
            backgroundColor: colors.border,
            borderRadius: 12,
            height: 24,
            justifyContent: "center",
            padding: 2,
            width: 44,
          },
          toggleActive: {
            backgroundColor: colors.tint,
          },
          toggleThumb: {
            alignSelf: "flex-start",
            backgroundColor: colors.cardBackground,
            borderRadius: 10,
            height: 20,
            width: 20,
          },
          toggleThumbActive: {
            alignSelf: "flex-end",
          },
          modalActions: {
            alignItems: "stretch",
            flexDirection: "column",
            gap: 12,
            justifyContent: "flex-start",
            marginTop: 8,
          },
          modalCancelButton: {
            alignItems: "center",
            backgroundColor: colors.sectionBackground,
            borderRadius: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
            width: "100%",
          },
          modalCancelText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          },
          modalActionGroup: {
            alignItems: "stretch",
            flexDirection: "column",
            gap: 12,
          },
          modalPrimaryButton: {
            alignItems: "center",
            backgroundColor: colors.tint,
            borderRadius: 12,
            minWidth: 120,
            paddingHorizontal: 20,
            paddingVertical: 12,
            width: "100%",
          },
          modalPrimaryButtonDisabled: {
            opacity: 0.5,
          },
          modalPrimaryText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          },
          modalSecondaryButton: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderColor: colors.tint,
            borderRadius: 12,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 12,
            width: "100%",
          },
          modalSecondaryText: {
            color: colors.tint,
            fontSize: 14,
            fontWeight: "600",
          },
          modalEmptyState: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 24,
          },
          modalEmptyText: {
            color: colors.textDim,
            fontSize: 13,
          },
          // Violation Banner
          violationBanner: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.error,
            borderRadius: 12,
            borderWidth: 1,
            flexDirection: "row",
            gap: 12,
            marginTop: 16,
            padding: 16,
          },
          violationContent: {
            flex: 1,
            gap: 8,
          },
          violationTitle: {
            color: colors.error,
            fontSize: 14,
            fontWeight: "600",
          },
          violationMessage: {
            color: colors.error,
            fontSize: 13,
          },
          violationActions: {
            flexDirection: "row",
            gap: 8,
            marginTop: 4,
          },
          violationConfirmButton: {
            backgroundColor: colors.error,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
          },
          violationConfirmText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          },
          violationCancelButton: {
            backgroundColor: colors.cardBackground,
            borderColor: colors.error,
            borderRadius: 8,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 8,
          },
          violationCancelText: {
            color: colors.error,
            fontSize: 14,
            fontWeight: "500",
          },
          // HOS Widgets Container - 4 Equal Widgets
          hosWidgetContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            marginVertical: 12,
          },
          hosWidgetContainerTablet: {
            flexWrap: "nowrap",
            justifyContent: "space-between",
          },
          hosWidgetCard: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            elevation: 2,
            maxWidth: "48%",
            minWidth: "48%",
            padding: 12,
            shadowColor: colors.palette.neutral900,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          hosWidgetCardTablet: {
            flex: 1,
            maxWidth: "23%",
            minWidth: 0,
          },
          hosWidgetTitle: {
            color: colors.text,
            fontSize: 10,
            fontWeight: "600",
            marginBottom: 4,
            textAlign: "center",
          },
          hosWidgetTitleTablet: {
            fontSize: 11,
          },
          hosWidgetValue: {
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
          },
          hosWidgetValueTablet: {
            fontSize: 24,
          },
          hosWidgetValueViolation: {
            color: colors.error,
          },
          hosWidgetProgress: {
            alignItems: "center",
            height: isSmallWidth ? 100 : 120,
            justifyContent: "center",
            marginBottom: 8,
            position: "relative",
            width: "100%",
          },
          hosWidgetProgressTablet: {
            height: 140,
          },
          hosWidgetValueOverlay: {
            alignItems: "center",
            bottom: 0,
            justifyContent: "center",
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          },
          hosWidgetFooter: {
            color: colors.textDim,
            fontSize: 9,
            marginTop: 4,
            textAlign: "center",
          },
          hosWidgetFooterTablet: {
            fontSize: 10,
          },
          hosWidgetUsedLeft: {
            color: colors.textDim,
            fontSize: 9,
            textAlign: "center",
          },
          hosWidgetUsedLeftTablet: {
            fontSize: 11,
          },
          // Legacy clock styles (kept for compatibility)
          clocksContainer: {
            marginVertical: 20,
          },
          drivingClockContainer: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            marginBottom: 20,
            padding: 20,
          },
          drivingClockTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 12,
          },
          drivingClockSubtitle: {
            color: colors.textDim,
            fontSize: 12,
            marginTop: 12,
          },
          secondaryClocksRow: {
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
          },
          secondaryClockCard: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            flex: 1,
            padding: 12,
          },
          secondaryClockTitle: {
            color: colors.text,
            fontSize: 12,
            fontWeight: "600",
            marginBottom: 8,
            textAlign: "center",
          },
          // Clocks Row
          clocksGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginVertical: 20,
          },
          clocksGridTablet: {
            marginVertical: 12,
          },
          clockCard: {
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            elevation: 2,
            marginBottom: 16,
            padding: 5,
            shadowColor: colors.palette.neutral900,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          },
          clockCardTablet: {
            marginBottom: 0,
            minHeight: 220,
            paddingHorizontal: 12,
            paddingVertical: 14,
          },
          clockCardMobile: {
            minHeight: 200,
          },
          clockCardTitle: {
            color: colors.text,
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 12,
          },
          clockCardSubtitle: {
            color: colors.textDim,
            fontSize: 12,
            marginTop: 12,
          },
          clockCardMeta: {
            color: colors.textDim,
            fontSize: 11,
            marginTop: 6,
          },
          clockCardWarning: {
            alignItems: "center",
            backgroundColor: colors.errorBackground,
            borderRadius: 12,
            flexDirection: "row",
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          },
          clockCardWarningText: {
            color: colors.error,
            fontSize: 12,
            fontWeight: "600",
            marginLeft: 6,
          },
          clockCardMeter: {
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          },
          clockCardMeterOverlay: {
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
          },
          clockCardValue: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          },
          clockValueViolation: {
            color: colors.error,
          },
          // Chart
          chartContainer: {
            marginBottom: 16,
            marginTop: 16,
          },
          chartContainerSmall: {
            alignSelf: "stretch",
          },
          chartContainerLarge: {
            alignSelf: "center",
            maxWidth: 760,
            width: "100%",
          },
          chartHeader: {
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          },
          chartTitle: {
            color: colors.text,
            fontSize: 14,
            fontWeight: "600",
          },
          chartViewAll: {
            color: colors.tint,
            fontSize: 12,
            fontWeight: "500",
          },
          chartPlaceholder: {
            alignItems: "center",
            backgroundColor: colors.sectionBackground,
            borderRadius: 8,
            height: 120,
            justifyContent: "center",
          },
          chartPlaceholderText: {
            color: colors.textDim,
            fontSize: 12,
          },
          // Footer
          footer: {
            alignItems: "center",
            borderTopColor: colors.border,
            borderTopWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 16,
          },
          breakInfo: {
            alignItems: "center",
            flexDirection: "row",
            gap: 6,
          },
          breakText: {
            color: colors.warning,
            fontSize: 12,
            fontWeight: "500",
          },
          auditLinkButton: {
            alignItems: "center",
            flexDirection: "row",
            gap: 4,
          },
          auditLink: {
            color: colors.tint,
            fontSize: 12,
            fontWeight: "500",
          },
          // Snackbar
          snackbar: {
            alignItems: "center",
            backgroundColor: colors.palette.neutral900,
            borderRadius: 12,
            bottom: 20,
            elevation: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            left: 20,
            padding: 16,
            position: "absolute",
            right: 20,
            shadowColor: colors.palette.neutral900,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          },
          snackbarText: {
            color: colors.text,
            flex: 1,
            fontSize: 14,
            marginRight: 12,
          },
          snackbarButton: {
            backgroundColor: colors.cardBackground,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
          },
          snackbarButtonText: {
            color: colors.tint,
            fontSize: 14,
            fontWeight: "600",
          },
        }),
      [colors],
    )

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

    // Disabled state (vehicle/trip not assigned)
    if (disabled) {
      return (
        <View style={styles.container}>
          <View style={styles.disabledContainer}>
            <AlertTriangle size={32} color={colors.warning} />
            <Text style={styles.disabledTitle}>HOS Unavailable</Text>
            <Text style={styles.disabledMessage}>
              {disabledMessage || "Vehicle and trip assignment required to use HOS features."}
            </Text>
          </View>
        </View>
      )
    }

    // Error state
    if (error || !hosStatus) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertTriangle size={20} color={colors.error} />
            <Text style={styles.errorText}>Failed to load HOS data</Text>
          </View>
        </View>
      )
    }

    const { clocks, current_status, can_drive, violations } = hosStatus
    const unresolvedViolations =
      violations?.filter((v: any) => v.resolved === false || v.resolved === undefined) || []
    const hasViolations = unresolvedViolations.length > 0

    // Calculate progress percentages
    const driveProgress = Math.min(
      1,
      Math.max(0, clocks.drive.remaining_minutes / clocks.drive.limit_minutes),
    )
    const shiftProgress = Math.min(
      1,
      Math.max(0, clocks.shift.remaining_minutes / clocks.shift.limit_minutes),
    )
    const cycleProgress = Math.min(
      1,
      Math.max(0, clocks.cycle.remaining_minutes / clocks.cycle.limit_minutes),
    )
    const driveUsedMinutes =
      (clocks as any)?.drive?.used_minutes ??
      Math.max(0, (clocks as any)?.drive?.limit_minutes - (clocks as any)?.drive?.remaining_minutes)
    const shiftUsedMinutes =
      (clocks as any)?.shift?.elapsed_minutes ??
      Math.max(0, (clocks as any)?.shift?.limit_minutes - (clocks as any)?.shift?.remaining_minutes)
    const cycleUsedMinutes =
      (clocks as any)?.cycle?.used_minutes ??
      Math.max(0, (clocks as any)?.cycle?.limit_minutes - (clocks as any)?.cycle?.remaining_minutes)
    const breakTimeUntilRequired = Math.max(
      0,
      ((clocks as any)?.break?.trigger_after_minutes ?? 0) -
        ((clocks as any)?.break?.driving_since_break ?? 0),
    )
    const breakProgress = Math.min(
      1,
      Math.max(
        0,
        ((clocks as any)?.break?.driving_since_break ?? 0) /
          Math.max(1, (clocks as any)?.break?.trigger_after_minutes ?? 0),
      ),
    )
    const isBreakRequired = !!(clocks as any)?.break?.required || breakTimeUntilRequired <= 0

    // Get location string
    const locationString = currentLocation?.address
      ? currentLocation.address.split(",")[0]
      : locationData.address?.split(",")[0] || "Unknown"

    const reasonOptions = selectedStatus ? STATUS_REASON_OPTIONS[selectedStatus] || [] : []
    const confirmDisabled =
      isSubmitting || !selectedStatus || (reasonOptions.length > 0 && !selectedReason)

    const gridColumns = isSmallWidth ? 2 : 3

    return (
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MapPin size={14} color={colors.textDim} />
            <Text style={styles.locationText}>{locationString}</Text>
          </View>
          <Text style={styles.headerTitle}>Hours of Service</Text>
          <View style={styles.headerRight}>
            {hasViolations && (
              <View
                style={[
                  styles.violationBadge,
                  { borderColor: `${colors.error}15`, borderWidth: 1, borderRadius: 10 },
                ]}
              >
                <AlertTriangle size={12} color={colors.error} />
                <Text style={[styles.violationBadgeText, { color: colors.error }]}>
                  {unresolvedViolations.length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Current Status Pill */}
        {statusConfig && (
          <View style={[styles.statusPill, { backgroundColor: colors.tint }]}>
            <statusConfig.icon size={24} color="#FFFFFF" />
            <View style={styles.statusPillContent}>
              <Text style={[styles.statusPillLabel, { color: "#FFFFFF" }]}>
                {statusConfig.label}
              </Text>
              <Text style={[styles.statusPillTime, { color: "#FFFFFF" }]}>
                Since {getStatusSinceTime}
              </Text>
            </View>
          </View>
        )}

        {/* HOS Clocks - 4 Equal Widgets: Driver, 14 Hr Shift, 70 Hr Cycle, 30 Min Break */}
        <View style={[styles.hosWidgetContainer, isTabletWidth && styles.hosWidgetContainerTablet]}>
          {/* Driver Widget */}
          <View style={[styles.hosWidgetCard, isTabletWidth && styles.hosWidgetCardTablet]}>
            <View
              style={[styles.hosWidgetProgress, isTabletWidth && styles.hosWidgetProgressTablet]}
            >
              <SemiCircularGauge
                size={isTabletWidth ? 140 : isSmallWidth ? 100 : 120}
                value={clocks.drive.remaining_minutes}
                max={clocks.drive.limit_minutes}
                strokeWidth={isTabletWidth ? 10 : 8}
                progressColor={"#39FF14"}
                bgColor={colors.border}
              />
              <View style={styles.hosWidgetValueOverlay}>
                <Text style={[styles.hosWidgetTitle, isTabletWidth && styles.hosWidgetTitleTablet]}>
                  Driver
                </Text>
                <Text
                  style={[
                    styles.hosWidgetValue,
                    isTabletWidth && styles.hosWidgetValueTablet,
                    clocks.drive.remaining_minutes <= 0 && styles.hosWidgetValueViolation,
                  ]}
                >
                  {formatTime(clocks.drive.remaining_minutes)}
                </Text>
                <Text
                  style={[styles.hosWidgetFooter, isTabletWidth && styles.hosWidgetFooterTablet]}
                >
                  11 Hour Drive Limit
                </Text>
              </View>
            </View>
            <Text
              style={[styles.hosWidgetUsedLeft, isTabletWidth && styles.hosWidgetUsedLeftTablet]}
            >
              Used {formatTime(driveUsedMinutes)} - Left:{" "}
              {formatTime(clocks.drive.remaining_minutes)}
            </Text>
          </View>

          {/* 14 Hr Shift Widget */}
          <View style={[styles.hosWidgetCard, isTabletWidth && styles.hosWidgetCardTablet]}>
            <View
              style={[styles.hosWidgetProgress, isTabletWidth && styles.hosWidgetProgressTablet]}
            >
              <SemiCircularGauge
                size={isTabletWidth ? 140 : isSmallWidth ? 100 : 120}
                value={clocks.shift.remaining_minutes}
                max={clocks.shift.limit_minutes}
                strokeWidth={isTabletWidth ? 10 : 8}
                progressColor={colors.PRIMARY}
                bgColor={colors.border}
              />
              <View style={styles.hosWidgetValueOverlay}>
                <Text style={[styles.hosWidgetTitle, isTabletWidth && styles.hosWidgetTitleTablet]}>
                  14 Hr Shift
                </Text>
                <Text style={[styles.hosWidgetValue, isTabletWidth && styles.hosWidgetValueTablet]}>
                  {formatTime(clocks.shift.remaining_minutes)}
                </Text>
                <Text
                  style={[styles.hosWidgetFooter, isTabletWidth && styles.hosWidgetFooterTablet]}
                >
                  14 Hour Shift
                </Text>
              </View>
            </View>
            <Text
              style={[styles.hosWidgetUsedLeft, isTabletWidth && styles.hosWidgetUsedLeftTablet]}
            >
              Used {formatTime(shiftUsedMinutes)} - Left:{" "}
              {formatTime(clocks.shift.remaining_minutes)}
            </Text>
          </View>

          {/* 70 Hr Cycle Widget */}
          <View style={[styles.hosWidgetCard, isTabletWidth && styles.hosWidgetCardTablet]}>
            <View
              style={[styles.hosWidgetProgress, isTabletWidth && styles.hosWidgetProgressTablet]}
            >
              <SemiCircularGauge
                size={isTabletWidth ? 140 : isSmallWidth ? 100 : 120}
                value={clocks.cycle.remaining_minutes}
                max={clocks.cycle.limit_minutes}
                strokeWidth={isTabletWidth ? 10 : 8}
                progressColor={"#F59E0B"}
                bgColor={colors.border}
              />
              <View style={styles.hosWidgetValueOverlay}>
                <Text style={[styles.hosWidgetTitle, isTabletWidth && styles.hosWidgetTitleTablet]}>
                  70 Hr Cycle
                </Text>
                <Text style={[styles.hosWidgetValue, isTabletWidth && styles.hosWidgetValueTablet]}>
                  {formatCycleTime(clocks.cycle.remaining_minutes)}
                </Text>
                <Text
                  style={[styles.hosWidgetFooter, isTabletWidth && styles.hosWidgetFooterTablet]}
                >
                  70 Hour Cycle
                </Text>
              </View>
            </View>
            <Text
              style={[styles.hosWidgetUsedLeft, isTabletWidth && styles.hosWidgetUsedLeftTablet]}
            >
              Used {formatTime(cycleUsedMinutes)} - Left:{" "}
              {formatCycleTime(clocks.cycle.remaining_minutes)}
            </Text>
          </View>

          {/* 30 Min Break Widget */}
          <View style={[styles.hosWidgetCard, isTabletWidth && styles.hosWidgetCardTablet]}>
            <View
              style={[styles.hosWidgetProgress, isTabletWidth && styles.hosWidgetProgressTablet]}
            >
              <SemiCircularGauge
                size={isTabletWidth ? 140 : isSmallWidth ? 100 : 120}
                value={breakTimeUntilRequired}
                max={clocks.break.trigger_after_minutes || 480}
                strokeWidth={isTabletWidth ? 10 : 8}
                progressColor={"#FFEB3B"}
                bgColor={colors.border}
              />
              <View style={styles.hosWidgetValueOverlay}>
                <Text style={[styles.hosWidgetTitle, isTabletWidth && styles.hosWidgetTitleTablet]}>
                  30 Min Break
                </Text>
                <Text style={[styles.hosWidgetValue, isTabletWidth && styles.hosWidgetValueTablet]}>
                  {formatTime(breakTimeUntilRequired)}
                </Text>
                <Text
                  style={[styles.hosWidgetFooter, isTabletWidth && styles.hosWidgetFooterTablet]}
                >
                  Break Required
                </Text>
              </View>
            </View>
            <Text
              style={[styles.hosWidgetUsedLeft, isTabletWidth && styles.hosWidgetUsedLeftTablet]}
            >
              Used {formatTime(clocks.break.driving_since_break || 0)} - Left:{" "}
              {formatTime(breakTimeUntilRequired)}
            </Text>
          </View>
        </View>

        {/* Mini HOS Chart */}
        <View
          style={[
            styles.chartContainer,
            isTabletWidth && styles.chartContainerLarge,
            isSmallWidth && styles.chartContainerSmall,
          ]}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Today's Activity</Text>
            <TouchableOpacity onPress={() => router.push("/hos" as any)}>
              <Text style={styles.chartViewAll}>View Full Log →</Text>
            </TouchableOpacity>
          </View>
          {chartLogs.length > 0 ? (
            <HOSChart data={chartLogs} dayStartIso={`${todayStr}T00:00:00Z`} />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartPlaceholderText}>No activity logged today</Text>
            </View>
          )}
        </View>
        {/* Status Grid */}
        {/* <View style={styles.statusGrid}>
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status]
          const IconComponent = config.icon
          const isActive =
            displayStatus === status || (status === "sleeperBerth" && displayStatus === "sleeping")
          const isSelected = selectedStatus === status

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                isActive && { backgroundColor: config.bgColor, borderColor: config.color },
                isSelected &&
                  !isActive && { borderColor: config.color, backgroundColor: colors.cardBackground },
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
      </View> */}

        {/* Violation Banner */}
        {/* {violationWarning && (
        <View style={styles.violationBanner}>
          <AlertTriangle size={20} color={colors.error} />
          <View style={styles.violationContent}>
            <Text style={styles.violationTitle}>Violation Warning</Text>
            <Text style={styles.violationMessage}>{violationWarning.message}</Text>
            <View style={styles.violationActions}>
              {violationWarning.allowOverride && (
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
      )} */}

        {/* Footer */}
        <View style={styles.footer}>
          {clocks.break.required && (
            <View style={styles.breakInfo}>
              <Clock size={14} color={colors.warning} />
              <Text style={styles.breakText}>
                Break required in{" "}
                {formatTime(
                  Math.max(
                    0,
                    clocks.break.trigger_after_minutes - clocks.break.driving_since_break,
                  ),
                )}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.auditLinkButton} onPress={() => router.push("/logs")}>
            <Text style={styles.auditLink}>View HOS Logs</Text>
            <ChevronRight size={16} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Undo Snackbar */}
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
                    {reasonOptions.length > 0
                      ? translate("statusModal.selectReason" as any, { seconds: timerSeconds }) ||
                        `Select a reason (or wait ${timerSeconds}s for default)`
                      : translate("statusModal.updating" as any) || "Updating status..."}
                  </Text>
                </View>

                {reasonOptions.length > 0 && (
                  <View style={styles.reasonSection}>
                    <Text style={styles.reasonLabel}>
                      {translate("statusModal.selectRemark" as any) || "Select remark (required)"}
                    </Text>
                    <View style={styles.reasonChipGrid}>
                      {reasonOptions.map((reason, index) => {
                        const isActive = selectedReason === reason
                        const isDefault = index === 0
                        const showTimer = isDefault && timerSeconds > 0 && !selectedReason
                        return (
                          <TouchableOpacity
                            key={reason}
                            style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                            onPress={() => {
                              // Cancel timer when user selects
                              if (timerRef.current) {
                                clearInterval(timerRef.current)
                                timerRef.current = null
                              }
                              setSelectedReason(reason)
                            }}
                          >
                            <Text
                              style={[
                                styles.reasonChipText,
                                isActive && styles.reasonChipTextActive,
                              ]}
                            >
                              {reason}
                              {showTimer &&
                                ` (${translate("statusModal.timerSeconds" as any, { seconds: timerSeconds }) || `${timerSeconds}s`})`}
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
                      <View
                        style={[styles.toggleThumb, splitSleepEnabled && styles.toggleThumbActive]}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Remove Cancel/Confirm buttons - auto-save on reason selection */}
                {isSubmitting && (
                  <View style={styles.modalActions}>
                    <Text style={styles.modalSubtitle}>Updating status...</Text>
                  </View>
                )}
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
  },
  )

// Wrap the already-forwarded component with memo
export const UnifiedHOSCard = memo(UnifiedHOSCardComponent, (prevProps, nextProps) => {
  // Only re-render if props actually change
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.disabledMessage === nextProps.disabledMessage &&
    prevProps.onScrollToTop === nextProps.onScrollToTop
  )
})
