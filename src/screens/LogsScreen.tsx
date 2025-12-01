import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  FlatList,
  Animated,
} from "react-native"
import Constants from "expo-constants"
import { router } from "expo-router"
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  Calendar,
  Download,
  FileText,
  Lock,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ChevronRight,
} from "lucide-react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  hosApi,
  useDailyLogs,
  useCertifyHOSLog,
  useCertifyAllUncertifiedLogs,
  useHOSClock,
  useHOSLogs,
} from "@/api/hos"
import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import HOSChart from "@/components/HOSChart"
import HOSChartSkeleton from "@/components/HOSChartSkeleton"
import LoadingButton from "@/components/LoadingButton"
import LogEntry from "@/components/LogEntry"
import { toast } from "@/components/Toast"
import { useStatus, useCarrier } from "@/contexts"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

export const LogsScreen = () => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const insets = useSafeAreaInsets()
  const { logEntries, certification, certifyLogs, uncertifyLogs } = useStatus()
  const { carrierInfo } = useCarrier()
  const {
    user,
    driverProfile,
    vehicleAssignment,
    isAuthenticated,
    organizationSettings,
    hosStatus,
  } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCertificationModal, setShowCertificationModal] = useState(false)
  const [showCertifyAllModal, setShowCertifyAllModal] = useState(false)
  const [signature, setSignature] = useState("")
  const [isCertifiedInStorage, setIsCertifiedInStorage] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  // Bottom sheet refs for certification flow
  const certifyBottomSheetRef = useRef<BottomSheetModal>(null)
  const certifySnapPoints = useMemo(() => ["50%", "75%"], [])

  // Bottom nav height + safe area padding
  const BOTTOM_PADDING = useMemo(() => {
    const bottomNavHeight = Platform.OS === "ios" ? 88 : 64
    return bottomNavHeight + insets.bottom + 20
  }, [insets.bottom])

  // Pulse animation for current status
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Get HOS clock to get correct driver ID
  // CRITICAL: Pass driver_id to ensure we get the clock for the logged-in driver
  const { data: hosClock } = useHOSClock({
    enabled: isAuthenticated && !!driverProfile?.driver_id,
    driverId: driverProfile?.driver_id, // Match clock by driver_id from auth store
  })

  // Get logs based on date:
  // - Current date (today) → Use /logs API (individual entries, available immediately)
  // - Past dates → Use /daily-logs API (certified summaries)
  const selectedDateStr = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate])
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])
  const isToday = selectedDateStr === todayStr
  const correctDriverId = hosClock?.driver || driverProfile?.driver_id

  // Storage key for tracking certified all logs per date - memoized for stability
  const CERTIFIED_ALL_STORAGE_KEY = useMemo(
    () => `certified_all_logs_${selectedDateStr}`,
    [selectedDateStr],
  )

  // For today: Use individual HOS logs (available immediately after status changes)
  const {
    data: hosLogsData,
    isLoading: isHOSLogsLoading,
    refetch: refetchHOSLogs,
  } = useHOSLogs(
    {
      driver: correctDriverId, // Sent as driver_id to API
      startDate: selectedDateStr, // YYYY-MM-DD format (sent as start_date to API)
      endDate: selectedDateStr, // YYYY-MM-DD format (sent as end_date to API)
    },
    { enabled: isAuthenticated && !!correctDriverId && !!hosClock && isToday }, // Only for today
  )

  // For past dates: Use daily logs (certified summaries)
  const {
    data: dailyLogsData,
    isLoading: isDailyLogsLoading,
    refetch: refetchDailyLogs,
  } = useDailyLogs(
    {
      startDate: selectedDateStr,
      endDate: selectedDateStr,
      driver: correctDriverId,
    },
    { enabled: isAuthenticated && !!correctDriverId && !isToday }, // Only for past dates
  )

  const certifyLogMutation = useCertifyHOSLog()
  const certifyAllUncertifiedMutation = useCertifyAllUncertifiedLogs()

  const isLoadingLogs = isToday ? isHOSLogsLoading : isDailyLogsLoading

  const handleTransferNavigate = useCallback(() => {
    router.push("/logs/transfer")
  }, [])

  const handleInspectorMode = () => {
    router.push("/inspector-mode")
  }

  const handleCertifyLogs = () => {
    if (certification.isCertified) {
      // Show warning and allow uncertification
      toast.warning(
        `Logs were certified by ${certification.certifiedBy} on ${new Date(certification.certifiedAt!).toLocaleString()}. Use the uncertify button to make changes.`,
      )
      return
    }
    setShowCertificationModal(true)
  }

  const handleSubmitCertification = async () => {
    if (!signature.trim()) {
      toast.error("Please enter your signature")
      return
    }

    await certifyLogs(signature.trim())
    setShowCertificationModal(false)
    setSignature("")
  }

  const handleCertifyAllUncertifiedLogs = async () => {
    if (!signature.trim()) {
      toast.error("Please enter your signature")
      return
    }

    try {
      // Store count before mutation (it will change after refetch)
      const countBeforeCertification = uncertifiedLogsCount

      await certifyAllUncertifiedMutation.mutateAsync()

      // Save to local storage to track that we've certified all logs for this date
      await AsyncStorage.setItem(CERTIFIED_ALL_STORAGE_KEY, "true")
      setIsCertifiedInStorage(true)

      // Refetch logs to update UI
      if (isToday) {
        refetchHOSLogs()
      } else {
        refetchDailyLogs()
      }

      // Close bottom sheet and clear signature
      certifyBottomSheetRef.current?.dismiss()
      setSignature("")
      setShowCertifyAllModal(false)

      toast.success(
        `✅ Certified! ${countBeforeCertification} log${countBeforeCertification !== 1 ? "s" : ""} locked and synced.`,
      )
    } catch (error: any) {
      if (__DEV__) {
        console.error("Failed to certify all uncertified logs:", error)
      }
      toast.error(error?.message || "Failed to certify all uncertified logs")
    }
  }

  // Convert log entries to LogEntry format
  // Logic: Use HOS logs for today, daily logs for past dates
  const apiLogs = useMemo(() => {
    console.log("📋 LogsScreen: Converting API logs", {
      isToday,
      hosLogsDataLength: hosLogsData?.length || 0,
      dailyLogsDataLength: dailyLogsData?.length || 0,
      hosLogsData: hosLogsData,
      dailyLogsData: dailyLogsData,
    })

    const convertedLogs: any[] = []

    // For today: Convert individual HOS log entries
    if (isToday && hosLogsData && hosLogsData.length > 0) {
      console.log("✅ LogsScreen: Converting", hosLogsData.length, "HOS log entries for today")
      hosLogsData.forEach((log: any) => {
        if (log.start_time) {
          const startTime = new Date(log.start_time).getTime()
          const endTime = log.end_time ? new Date(log.end_time).getTime() : undefined
          const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0

          convertedLogs.push({
            id: log.id || `log-${startTime}`,
            date: log.start_time.split("T")[0],
            status: hosApi.getAppDutyStatus(log.duty_status || "off_duty"),
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            reason: log.remark || translate("logs.statusChange" as any),
            location: log.start_location
              ? {
                  address: log.start_location,
                }
              : undefined,
            isCertified: false, // Individual logs are not certified (daily logs are)
            isEditable: true,
            logId: log.id,
          })
        }
      })
    }

    // For past dates: Convert daily logs (certified summaries)
    if (!isToday && dailyLogsData && dailyLogsData.length > 0) {
      dailyLogsData.forEach((dailyLog: any) => {
        // If log has entries array, convert each entry
        if (dailyLog.entries && Array.isArray(dailyLog.entries)) {
          dailyLog.entries.forEach((entry: any, index: number) => {
            if (entry.start_time) {
              const startTime = new Date(entry.start_time).getTime()
              const endTime = entry.end_time ? new Date(entry.end_time).getTime() : undefined
              const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0

              convertedLogs.push({
                id: entry.id || `${dailyLog.id}-${index}`,
                date: entry.start_time.split("T")[0],
                status: hosApi.getAppDutyStatus(entry.duty_status || "off_duty"),
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                reason: entry.remark || entry.notes || translate("logs.statusChange" as any),
                location: entry.start_location
                  ? {
                      address: entry.start_location,
                    }
                  : undefined,
                isCertified: entry.is_certified || dailyLog.is_certified || false,
                isEditable: !(entry.is_certified || dailyLog.is_certified),
                logId: entry.id || dailyLog.id,
                dailyLogId: dailyLog.id, // Store daily log ID for certification (per spec: PATCH /hos/daily-logs/{id}/)
              })
            }
          })
        }
        // If log itself represents an entry
        else if (dailyLog.start_time) {
          const startTime = new Date(dailyLog.start_time).getTime()
          const endTime = dailyLog.end_time ? new Date(dailyLog.end_time).getTime() : undefined
          const duration = endTime ? Math.round((endTime - startTime) / 60000) : 0

          convertedLogs.push({
            id: dailyLog.id || `log-${startTime}`,
            date: dailyLog.log_date || dailyLog.start_time.split("T")[0],
            status: hosApi.getAppDutyStatus(dailyLog.duty_status || "off_duty"),
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            reason: dailyLog.remark || dailyLog.notes || translate("logs.statusChange" as any),
            location: dailyLog.start_location
              ? {
                  address: dailyLog.start_location,
                }
              : undefined,
            isCertified: dailyLog.is_certified || false,
            isEditable: !dailyLog.is_certified,
            logId: dailyLog.id,
            dailyLogId: dailyLog.id, // Store daily log ID for certification (per spec: PATCH /hos/daily-logs/{id}/)
          })
        }
      })
    }

    // Sort by start time (newest first)
    convertedLogs.sort((a, b) => b.startTime - a.startTime)

    return convertedLogs
  }, [hosLogsData, dailyLogsData, isToday])

  // Memoized filtered logs - prevents recalculation on every render
  const filteredLogs = useMemo(() => {
    // Use API logs if available, otherwise fallback to local logEntries
    if (apiLogs.length > 0) {
      return apiLogs
    }

    // Fallback to local logEntries
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    return logEntries
      .filter((log) => {
        // LogEntry has startTime (number) and date (string)
        const logDate = new Date(log.startTime)
        return logDate >= startOfDay && logDate <= endOfDay
      })
      .sort((a, b) => b.startTime - a.startTime)
  }, [apiLogs, logEntries, selectedDateStr])

  const handlePreviousDay = () => {
    const prevDay = new Date(selectedDate)
    prevDay.setDate(prevDay.getDate() - 1)
    setSelectedDate(prevDay)
  }

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Don't allow selecting future dates
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay)
    }
  }

  const handleSelectToday = () => {
    setSelectedDate(new Date())
  }

  // Check if all logs for the selected date are certified
  const allLogsCertified = useMemo(() => {
    if (filteredLogs.length === 0) return false
    return filteredLogs.every((log) => log.isCertified)
  }, [filteredLogs])

  // Count uncertified logs
  const uncertifiedLogsCount = useMemo(() => {
    return filteredLogs.filter((log) => !log.isCertified).length
  }, [filteredLogs])

  // Check if certify all button should be enabled
  // Hide button if: all logs are certified OR we've already certified all logs for this date (in storage)
  const hasUncertifiedLogs = uncertifiedLogsCount > 0 && !isCertifiedInStorage

  // Compliance status calculation
  const complianceStatus = useMemo(() => {
    if (allLogsCertified) {
      return {
        type: "compliant",
        message: "Compliant • All logs certified",
        color: "#22C55E",
        icon: CheckCircle2,
      }
    }
    if (hasUncertifiedLogs) {
      return {
        type: "attention",
        message: `Attention needed • ${uncertifiedLogsCount} uncertified logs`,
        color: "#F59E0B",
        icon: AlertCircle,
      }
    }
    // Check for violations from hosStatus if available
    if (hosStatus?.active_violations && hosStatus.active_violations.length > 0) {
      return {
        type: "violation",
        message: "Violation risk • Check HOS limits",
        color: "#EF4444",
        icon: AlertCircle,
      }
    }
    return { type: "compliant", message: "Compliant", color: "#22C55E", icon: CheckCircle2 }
  }, [allLogsCertified, hasUncertifiedLogs, uncertifiedLogsCount, hosStatus?.active_violations])

  // HOS clocks summary for mini strip
  const hosSummary = useMemo(() => {
    if (!hosClock) return null
    const formatTime = (minutes: number) => {
      if (minutes < 0) return "0h 0m"
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}h ${mins}m`
    }
    // Use hosClock data if available
    if (
      hosClock.driving_time_remaining !== undefined &&
      hosClock.on_duty_time_remaining !== undefined
    ) {
      return {
        driveLeft: formatTime(hosClock.driving_time_remaining),
        shiftLeft: formatTime(hosClock.on_duty_time_remaining),
      }
    }
    // Fallback to hosStatus if available
    if (
      hosStatus?.driving_time_remaining !== undefined &&
      hosStatus?.on_duty_time_remaining !== undefined
    ) {
      return {
        driveLeft: formatTime(hosStatus.driving_time_remaining),
        shiftLeft: formatTime(hosStatus.on_duty_time_remaining),
      }
    }
    return null
  }, [hosClock, hosStatus])

  // Get status color for timeline
  const getStatusColor = useCallback((status: string) => {
    const statusMap: Record<string, string> = {
      onDuty: "#F59E0B", // Amber
      driving: "#EF4444", // Red
      offDuty: "#3B82F6", // Blue
      sleeperBerth: "#A855F7", // Purple
      sleeping: "#A855F7", // Purple
    }
    return statusMap[status] || "#6B7280"
  }, [])

  // Handle certifying individual log entry
  const handleCertifyIndividualLog = useCallback(
    async (logId: string, signature?: string) => {
      try {
        // Find the log entry to get the daily log ID
        const logEntry = filteredLogs.find((log) => log.logId === logId || log.id === logId)

        if (!logEntry) {
          throw new Error("Log not found")
        }

        // Use dailyLogId if available, otherwise fallback to logId
        // Per spec: PATCH /api/hos/daily-logs/{id}/ to certify daily logs
        const dailyLogId = (logEntry as any)?.dailyLogId || logEntry.logId || logEntry.id

        if (!dailyLogId) {
          throw new Error("No daily log ID available for certification")
        }

        // Call HOS API to certify the daily log (API expects just the ID string)
        await certifyLogMutation.mutateAsync(dailyLogId)

        // Refetch daily logs to update UI
        if (isToday) {
          refetchHOSLogs()
        } else {
          refetchDailyLogs()
        }

        toast.success("Log entry certified successfully")
      } catch (error: any) {
        if (__DEV__) {
          console.error("Failed to certify individual log:", error)
        }
        toast.error(error?.message || "Failed to certify log entry")
        throw error
      }
    },
    [filteredLogs, certifyLogMutation, isToday, refetchHOSLogs, refetchDailyLogs],
  )

  // Format time for timeline
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`
  }, [])

  // Format duration
  const formatDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }, [])

  // Memoized render function for log entries with timeline visualization
  const renderLogEntry = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const statusColor = getStatusColor(item.status)
      const isLast = index === filteredLogs.length - 1
      const isCurrent = isToday && isLast
      const duration = item.duration ? formatDuration(item.duration) : null

      return (
        <View style={styles.timelineRow}>
          {/* Timeline Rail */}
          <View style={styles.timelineRail}>
            <View style={[styles.timelineLine, { backgroundColor: statusColor }]} />
            {!isLast && (
              <View style={[styles.timelineLineConnector, { backgroundColor: statusColor }]} />
            )}
          </View>

          {/* Timeline Dot */}
          <Animated.View
            style={[
              styles.timelineDot,
              {
                backgroundColor: statusColor,
                transform: [{ scale: isCurrent ? pulseAnim : 1 }],
              },
            ]}
          >
            {item.isCertified && <Lock size={10} color="#fff" style={styles.timelineLock} />}
          </Animated.View>

          {/* Log Content */}
          <View
            style={[styles.timelineContent, item.isCertified && styles.timelineContentCertified]}
          >
            <View style={styles.timelineHeader}>
              <View style={styles.timelineStatusRow}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {item.status === "onDuty"
                      ? "On Duty"
                      : item.status === "driving"
                        ? "Driving"
                        : item.status === "offDuty"
                          ? "Off Duty"
                          : item.status === "sleeperBerth" || item.status === "sleeping"
                            ? "Sleeper"
                            : item.status}
                  </Text>
                </View>
                {item.isCertified && (
                  <View style={styles.certifiedPill}>
                    <Lock size={10} color="#22C55E" />
                    <Text style={styles.certifiedPillText}>CERTIFIED</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.timelineTime, { color: colors.text }]}>
                {formatTime(item.startTime)}
              </Text>
            </View>
            {duration && (
              <Text style={[styles.timelineDuration, { color: colors.textDim }]}>
                Duration: {duration}
              </Text>
            )}
            {item.reason && (
              <Text style={[styles.timelineReason, { color: colors.textDim }]} numberOfLines={1}>
                {item.reason}
              </Text>
            )}
          </View>
        </View>
      )
    },
    [
      handleCertifyIndividualLog,
      getStatusColor,
      formatTime,
      formatDuration,
      isToday,
      filteredLogs.length,
      colors,
      pulseAnim,
    ],
  )

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: any) =>
      item?.id?.toString() || item?.timestamp?.toString() || item?.logId || `log-${Math.random()}`,
    [],
  )

  // Check local storage for certification status when date changes
  useEffect(() => {
    const checkCertificationStatus = async () => {
      try {
        const certifiedStatus = await AsyncStorage.getItem(CERTIFIED_ALL_STORAGE_KEY)
        setIsCertifiedInStorage(certifiedStatus === "true")
      } catch (error) {
        console.error("Failed to check certification status from storage:", error)
        setIsCertifiedInStorage(false)
      }
    }

    checkCertificationStatus()
  }, [selectedDateStr, CERTIFIED_ALL_STORAGE_KEY])

  // Clear storage status if new uncertified logs appear (e.g., new status change)
  useEffect(() => {
    if (uncertifiedLogsCount > 0 && isCertifiedInStorage) {
      // New uncertified logs appeared, clear the storage flag
      AsyncStorage.removeItem(CERTIFIED_ALL_STORAGE_KEY).catch(console.error)
      setIsCertifiedInStorage(false)
    }
  }, [uncertifiedLogsCount, isCertifiedInStorage, CERTIFIED_ALL_STORAGE_KEY])

  // Pulse animation for current status
  useEffect(() => {
    if (isToday && filteredLogs.length > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      )
      pulse.start()
      return () => pulse.stop()
    }
    return undefined
  }, [isToday, filteredLogs.length, pulseAnim])

  // Refetch logs when date changes or driver ID changes - debounced to prevent rapid refetches
  useEffect(() => {
    if (!isAuthenticated || !correctDriverId) {
      return
    }

    const timeoutId = setTimeout(() => {
      if (isToday) {
        if (hosClock) {
          refetchHOSLogs() // Today: Use individual HOS logs
        }
      } else {
        refetchDailyLogs() // Past dates: Use daily logs (certified summaries)
      }
    }, 200) // Small debounce to coalesce rapid changes

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, isAuthenticated, correctDriverId, hosClock?.driver, isToday])

  const StatusIcon = complianceStatus.icon

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={styles.container}>
          <Header
            title={"HOS LOGS"}
            titleMode="center"
            backgroundColor={colors.background}
            titleStyle={{
              fontSize: 22,
              fontWeight: "800",
              color: colors.text,
              letterSpacing: 0.3,
              paddingLeft: 20,
            }}
            leftIcon="back"
            leftIconColor={colors.tint}
            onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
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

          {/* Compliance Status Indicator */}
          <View
            style={[styles.complianceBanner, { backgroundColor: `${complianceStatus.color}15` }]}
          >
            <StatusIcon size={16} color={complianceStatus.color} />
            <Text style={[styles.complianceText, { color: complianceStatus.color }]}>
              {complianceStatus.message}
            </Text>
          </View>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_PADDING }]}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.header}>
              {/* Large Date Display */}
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  onPress={handlePreviousDay}
                  style={[
                    styles.dateButton,
                    { backgroundColor: isDark ? colors.cardBackground : "#F3F4F6" },
                  ]}
                >
                  <Text style={[styles.dateButtonText, { color: colors.tint }]}>◀</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSelectToday}
                  style={[
                    styles.dateDisplay,
                    {
                      backgroundColor: isToday
                        ? colors.tint
                        : isDark
                          ? colors.cardBackground
                          : "#F3F4F6",
                      borderWidth: isToday ? 0 : 1,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                    },
                  ]}
                >
                  <Calendar
                    size={20}
                    color={isToday ? "#fff" : colors.tint}
                    style={styles.calendarIcon}
                  />
                  <View>
                    <Text style={[styles.dateTextLarge, { color: isToday ? "#fff" : colors.text }]}>
                      {selectedDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    {isToday && <Text style={styles.dateTextSecondary}>Today</Text>}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextDay}
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: isDark ? colors.cardBackground : "#F3F4F6",
                      opacity: isToday ? 0.4 : 1,
                    },
                  ]}
                  disabled={isToday}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      {
                        color: isToday ? colors.textDim : colors.tint,
                      },
                    ]}
                  >
                    ▶
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mini Summary Strip */}
              {(hosSummary || hasUncertifiedLogs) && (
                <View
                  style={[
                    styles.summaryStrip,
                    { backgroundColor: isDark ? colors.cardBackground : "#F9FAFB" },
                  ]}
                >
                  {allLogsCertified ? (
                    <View style={styles.summaryRow}>
                      <CheckCircle2 size={14} color="#22C55E" />
                      <Text style={[styles.summaryText, { color: colors.text }]}>
                        Certified through:{" "}
                        {selectedDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.summaryRow}>
                      <AlertCircle size={14} color="#F59E0B" />
                      <Text style={[styles.summaryText, { color: colors.text }]}>
                        {uncertifiedLogsCount} uncertified logs
                      </Text>
                    </View>
                  )}
                  {hosSummary && (
                    <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Clock size={14} color={colors.tint} />
                        <Text style={[styles.summaryText, { color: colors.text }]}>
                          Drive: {hosSummary.driveLeft} • Shift: {hosSummary.shiftLeft}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Action Grid - Square Buttons */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[
                  styles.actionGridItem,
                  {
                    backgroundColor:
                      selectedAction === "transfer"
                        ? colors.tint
                        : isDark
                          ? colors.cardBackground
                          : "#FFFFFF",
                    borderWidth: selectedAction === "transfer" ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                  },
                ]}
                onPress={() => {
                  setSelectedAction("transfer")
                  handleTransferNavigate()
                }}
                activeOpacity={0.85}
              >
                <Share2 size={24} color={selectedAction === "transfer" ? "#fff" : colors.tint} />
                <Text
                  style={[
                    styles.actionGridText,
                    { color: selectedAction === "transfer" ? "#fff" : colors.text },
                  ]}
                >
                  Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionGridItem,
                  {
                    backgroundColor:
                      selectedAction === "certify"
                        ? colors.tint
                        : isDark
                          ? colors.cardBackground
                          : "#FFFFFF",
                    borderWidth: selectedAction === "certify" ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                    opacity: !hasUncertifiedLogs && selectedAction !== "certify" ? 0.6 : 1,
                  },
                ]}
                onPress={() => {
                  if (hasUncertifiedLogs) {
                    setSelectedAction("certify")
                    certifyBottomSheetRef.current?.present()
                  }
                }}
                activeOpacity={0.85}
                disabled={!hasUncertifiedLogs || certifyAllUncertifiedMutation.isPending}
              >
                {hasUncertifiedLogs ? (
                  <>
                    <Lock size={24} color={selectedAction === "certify" ? "#fff" : colors.tint} />
                    <Text
                      style={[
                        styles.actionGridText,
                        { color: selectedAction === "certify" ? "#fff" : colors.text },
                      ]}
                    >
                      Certify
                    </Text>
                    {uncertifiedLogsCount > 0 && (
                      <Text
                        style={[
                          styles.actionGridSubtext,
                          {
                            color:
                              selectedAction === "certify"
                                ? "rgba(255,255,255,0.9)"
                                : colors.textDim,
                          },
                        ]}
                      >
                        ({uncertifiedLogsCount})
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={24}
                      color={selectedAction === "certify" ? "#fff" : colors.textDim}
                    />
                    <Text
                      style={[
                        styles.actionGridText,
                        { color: selectedAction === "certify" ? "#fff" : colors.textDim },
                      ]}
                    >
                      Certified
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionGridItem,
                  {
                    backgroundColor:
                      selectedAction === "inspector"
                        ? colors.tint
                        : isDark
                          ? colors.cardBackground
                          : "#FFFFFF",
                    borderWidth: selectedAction === "inspector" ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                  },
                ]}
                onPress={() => {
                  setSelectedAction("inspector")
                  handleInspectorMode()
                }}
                activeOpacity={0.85}
              >
                <Shield size={24} color={selectedAction === "inspector" ? "#fff" : colors.tint} />
                <Text
                  style={[
                    styles.actionGridText,
                    { color: selectedAction === "inspector" ? "#fff" : colors.text },
                  ]}
                >
                  Inspector
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionGridItem,
                  {
                    backgroundColor:
                      selectedAction === "manual"
                        ? colors.tint
                        : isDark
                          ? colors.cardBackground
                          : "#FFFFFF",
                    borderWidth: selectedAction === "manual" ? 0 : 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                  },
                ]}
                onPress={() => {
                  setSelectedAction("manual")
                  router.push("/logs/manual")
                }}
                activeOpacity={0.85}
              >
                <FileText size={24} color={selectedAction === "manual" ? "#fff" : colors.tint} />
                <Text
                  style={[
                    styles.actionGridText,
                    { color: selectedAction === "manual" ? "#fff" : colors.text },
                  ]}
                >
                  Manual
                </Text>
              </TouchableOpacity>
            </View>

            {/* Certify All Uncertified Logs Modal */}
            <Modal
              visible={showCertifyAllModal}
              transparent
              animationType="fade"
              onRequestClose={() =>
                !certifyAllUncertifiedMutation.isPending && setShowCertifyAllModal(false)
              }
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Certify All Uncertified Logs
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>
                    You are about to certify {uncertifiedLogsCount} uncertified log
                    {uncertifiedLogsCount !== 1 ? "s" : ""} for {selectedDate.toLocaleDateString()}.
                    Once certified, these logs cannot be edited.
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textDim, marginTop: 8 }]}>
                    Are you sure you want to continue?
                  </Text>

                  <View style={styles.modalButtons}>
                    <View style={styles.modalButton}>
                      <LoadingButton
                        title="Cancel"
                        onPress={() => setShowCertifyAllModal(false)}
                        variant="outline"
                        fullWidth
                        disabled={certifyAllUncertifiedMutation.isPending}
                      />
                    </View>
                    <View style={styles.modalButton}>
                      <LoadingButton
                        title={
                          certifyAllUncertifiedMutation.isPending ? "Certifying..." : "Certify All"
                        }
                        onPress={handleCertifyAllUncertifiedLogs}
                        fullWidth
                        loading={certifyAllUncertifiedMutation.isPending}
                        disabled={certifyAllUncertifiedMutation.isPending}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Certification Modal */}
            <Modal
              visible={showCertificationModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowCertificationModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Certify Your Logs</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>
                    By certifying these logs, you confirm their accuracy. Once certified, no changes
                    can be made.
                  </Text>

                  <TextInput
                    style={[
                      styles.signatureInput,
                      {
                        backgroundColor: isDark ? colors.cardBackground : "#F3F4F6",
                        color: colors.text,
                        borderColor: isDark ? "transparent" : "#E5E7EB",
                      },
                    ]}
                    placeholder="Enter your digital signature"
                    placeholderTextColor={colors.textDim}
                    value={signature}
                    onChangeText={setSignature}
                  />

                  <View style={styles.modalButtons}>
                    <View style={styles.modalButton}>
                      <LoadingButton
                        title="Cancel"
                        onPress={() => {
                          setShowCertificationModal(false)
                          setSignature("")
                        }}
                        variant="outline"
                        fullWidth
                      />
                    </View>
                    <View style={styles.modalButton}>
                      <LoadingButton
                        title="Certify"
                        onPress={handleSubmitCertification}
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </View>
            </Modal>

            {isLoadingLogs ? (
              <>
                <View style={styles.skeletonWrapper}>
                  <HOSChartSkeleton />
                </View>
                <View style={styles.logsContainer}>
                  {[1, 2, 3].map((item) => (
                    <View
                      key={`log-skeleton-${item}`}
                      style={[
                        styles.logSkeleton,
                        {
                          backgroundColor: isDark ? "rgba(87, 80, 241, 0.08)" : "#F3F4F6",
                          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.logSkeletonBar,
                          { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB" },
                        ]}
                      />
                      <View
                        style={[
                          styles.logSkeletonBarSmall,
                          { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB" },
                        ]}
                      />
                      <View style={styles.logSkeletonMeta}>
                        {[1, 2, 3].map((meta) => (
                          <View
                            key={`log-skeleton-meta-${item}-${meta}`}
                            style={[
                              styles.logSkeletonDot,
                              { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB" },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : filteredLogs.length === 0 ? (
              <ElevatedCard style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <FileText size={48} color={colors.text} />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No logs recorded for this date
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
                  Status changes will appear here
                </Text>
              </ElevatedCard>
            ) : (
              <>
                {/* HOS Chart - Only show if not all logs are certified */}

                {/* Log Entries - Using FlatList for performance */}
                <View style={styles.logsContainer}>
                  <FlatList
                    data={filteredLogs}
                    keyExtractor={keyExtractor}
                    renderItem={renderLogEntry}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 0 }}
                    ListEmptyComponent={
                      <ElevatedCard style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                          <FileText size={48} color={colors.text} />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>
                          No logs recorded for this date
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
                          Status changes will appear here
                        </Text>
                      </ElevatedCard>
                    }
                    // Performance optimizations
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    removeClippedSubviews={true}
                    updateCellsBatchingPeriod={50}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* Certification Bottom Sheet */}
        <BottomSheetModal
          ref={certifyBottomSheetRef}
          index={0}
          snapPoints={certifySnapPoints}
          enablePanDownToClose
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
          )}
        >
          <BottomSheetView
            style={[styles.bottomSheetContent, { backgroundColor: colors.cardBackground }]}
          >
            <View style={styles.bottomSheetHeader}>
              <Lock size={24} color={colors.tint} />
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                Certify Your Logs
              </Text>
            </View>
            <Text style={[styles.bottomSheetSubtitle, { color: colors.textDim }]}>
              You are certifying {uncertifiedLogsCount} logs for{" "}
              {selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}. By
              certifying, you confirm these logs are accurate and final.
            </Text>
            <Text style={[styles.bottomSheetLabel, { color: colors.text }]}>
              Enter your signature:
            </Text>
            <TextInput
              style={[
                styles.signatureInput,
                {
                  backgroundColor: isDark ? colors.cardBackground : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                },
              ]}
              placeholder="Your digital signature"
              placeholderTextColor={colors.textDim}
              value={signature}
              onChangeText={setSignature}
            />
            <View style={styles.bottomSheetActions}>
              <TouchableOpacity
                style={[styles.bottomSheetButton, styles.bottomSheetButtonCancel]}
                onPress={() => {
                  certifyBottomSheetRef.current?.dismiss()
                  setSignature("")
                }}
              >
                <Text style={[styles.bottomSheetButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bottomSheetButton,
                  styles.bottomSheetButtonPrimary,
                  { backgroundColor: colors.tint },
                  (!signature.trim() || certifyAllUncertifiedMutation.isPending) &&
                    styles.bottomSheetButtonDisabled,
                ]}
                onPress={handleCertifyAllUncertifiedLogs}
                disabled={!signature.trim() || certifyAllUncertifiedMutation.isPending}
              >
                <Text style={styles.bottomSheetButtonTextPrimary}>
                  {certifyAllUncertifiedMutation.isPending ? "Certifying..." : "Certify All"}
                </Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  calendarIcon: {
    marginRight: 8,
  },
  certificationBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  certificationBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600" as const,
    marginLeft: 4,
  },
  certificationContainer: {
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
  },
  dateButton: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  dateDisplay: {
    alignItems: "center",
    borderRadius: 12,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 8,
    minWidth: 180,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dateSelector: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  eldMaterialItem: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    padding: 16,
  },
  eldMaterialSubtitle: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    marginTop: 2,
  },
  eldMaterialTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
    marginLeft: 12,
  },
  eldMaterials: {
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  header: {
    paddingTop: 10,
  },
  logsContainer: {
    paddingHorizontal: 20,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logSkeleton: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  logSkeletonBar: {
    borderRadius: 6,
    height: 16,
    marginBottom: 12,
    width: "60%",
  },
  logSkeletonBarSmall: {
    borderRadius: 6,
    height: 12,
    marginBottom: 12,
    width: "40%",
  },
  logSkeletonMeta: {
    flexDirection: "row",
    gap: 8,
  },
  logSkeletonDot: {
    borderRadius: 6,
    height: 12,
    width: 36,
  },
  logsListContent: {
    paddingBottom: 20,
  },
  modalButton: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: "80%",
    maxWidth: 400,
    padding: 24,
    width: "90%",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  skeletonWrapper: {
    paddingHorizontal: 4,
  },
  signatureInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  // Action Row - Horizontal Scrollable
  actionRowScroll: {
    marginBottom: 20,
  },
  actionRowContainer: {
    gap: 12,
    paddingHorizontal: 20,
    paddingRight: 32,
  },
  actionRowCard: {
    alignItems: "center",
    borderRadius: 16,
    elevation: 4,
    justifyContent: "center",
    minHeight: 160,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 140,
  },
  actionRowIconContainer: {
    alignItems: "center",
    borderRadius: 16,
    height: 64,
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
    width: 64,
  },
  actionRowBadge: {
    alignItems: "center",
    backgroundColor: "#FF4444",
    borderColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    position: "absolute",
    right: -4,
    top: -4,
  },
  actionRowBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    marginBottom: 4,
    textAlign: "center",
  },
  actionRowSubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  // Compliance Banner
  complianceBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  complianceText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  // Date Display
  dateTextLarge: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  dateTextSecondary: {
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 2,
    opacity: 0.8,
  },
  // Summary Strip
  summaryStrip: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  summaryDivider: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    height: 16,
    width: 1,
  },
  // Action Grid - Square Buttons
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  actionGridItem: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 16,
    elevation: 2,
    flex: 1,
    justifyContent: "center",
    padding: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  actionGridText: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 8,
    textAlign: "center",
  },
  actionGridSubtext: {
    fontSize: 11,
    fontWeight: "500" as const,
    marginTop: 2,
    textAlign: "center",
  },
  actionGridBadge: {
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    position: "absolute",
    right: 8,
    top: 8,
  },
  actionGridBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  // Timeline
  timelineRow: {
    flexDirection: "row",
    marginBottom: 16,
    paddingLeft: 20,
    paddingRight: 20,
  },
  timelineRail: {
    alignItems: "center",
    marginRight: 12,
    width: 24,
  },
  timelineLine: {
    borderRadius: 2,
    height: 20,
    width: 4,
  },
  timelineLineConnector: {
    borderRadius: 1,
    flex: 1,
    marginTop: 2,
    width: 2,
  },
  timelineDot: {
    alignItems: "center",
    borderColor: "#fff",
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    justifyContent: "center",
    marginTop: -2,
    width: 20,
  },
  timelineLock: {
    position: "absolute",
  },
  timelineContent: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    flex: 1,
    padding: 12,
  },
  timelineContentCertified: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E20",
    borderWidth: 1,
  },
  timelineHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timelineStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  certifiedPill: {
    alignItems: "center",
    backgroundColor: "#22C55E",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  certifiedPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  timelineDuration: {
    fontSize: 12,
    marginTop: 4,
  },
  timelineReason: {
    fontSize: 12,
    marginTop: 2,
  },
  // Bottom Sheet
  bottomSheetContent: {
    flex: 1,
    padding: 24,
  },
  bottomSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  bottomSheetLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  bottomSheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  bottomSheetButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 14,
  },
  bottomSheetButtonCancel: {
    backgroundColor: "#F3F4F6",
  },
  bottomSheetButtonPrimary: {
    // backgroundColor set inline
  },
  bottomSheetButtonDisabled: {
    opacity: 0.5,
  },
  bottomSheetButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  bottomSheetButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
})
