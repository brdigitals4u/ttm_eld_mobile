import React, { useState, useEffect, useMemo } from "react"
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Calendar, Download, FileText, Lock, Mail, Share2, Wifi } from "lucide-react-native"

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
import { useStatus } from "@/contexts"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

export const LogsScreen = () => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const { logEntries, certification, certifyLogs, uncertifyLogs } = useStatus()
  const { user, driverProfile, vehicleAssignment, isAuthenticated } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCertificationModal, setShowCertificationModal] = useState(false)
  const [showCertifyAllModal, setShowCertifyAllModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEldMaterialsModal, setShowEldMaterialsModal] = useState(false)
  const [signature, setSignature] = useState("")
  const [transferEmail, setTransferEmail] = useState("")
  const [isCertifiedInStorage, setIsCertifiedInStorage] = useState(false)

  // Get HOS clock to get correct driver ID
  // CRITICAL: Pass driver_id to ensure we get the clock for the logged-in driver
  const { data: hosClock } = useHOSClock({
    enabled: isAuthenticated && !!driverProfile?.driver_id,
    driverId: driverProfile?.driver_id, // Match clock by driver_id from auth store
  })

  // Get logs based on date:
  // - Current date (today) → Use /logs API (individual entries, available immediately)
  // - Past dates → Use /daily-logs API (certified summaries)
  const selectedDateStr = selectedDate.toISOString().split("T")[0] // YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  const isToday = selectedDateStr === todayStr
  const correctDriverId = hosClock?.driver || driverProfile?.driver_id

  // Storage key for tracking certified all logs per date
  const CERTIFIED_ALL_STORAGE_KEY = `certified_all_logs_${selectedDateStr}`

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
    { enabled: isAuthenticated && !!correctDriverId && !!hosClock && !isToday }, // Only for past dates
  )

  const certifyLogMutation = useCertifyHOSLog()
  const certifyAllUncertifiedMutation = useCertifyAllUncertifiedLogs()

  const handleTransferLogs = async () => {
    try {
      console.log("Transfer logs clicked")
    } catch (error) {
      console.error("Transfer logs error:", error)
    }
    setShowTransferModal(true)
  }

  const handleEldMaterials = async () => {
    try {
      console.log("ELD materials clicked")
    } catch (error) {
      console.error("ELD materials error:", error)
    }
    setShowEldMaterialsModal(true)
  }

  const handleTransferOption = async (option: "wireless" | "email-dot" | "email-self") => {
    setShowTransferModal(false)

    if (option === "wireless") {
      Alert.prompt(
        "Wireless Transfer",
        "Enter email address for wireless web services transfer:",
        async (email) => {
          if (email) {
            await shareLogsViaEmail(email, "Wireless Web Services Transfer")
          }
        },
        "plain-text",
        transferEmail,
      )
    } else if (option === "email-dot") {
      Alert.prompt(
        "Email to DOT",
        "Enter DOT email address:",
        async (email) => {
          if (email) {
            await shareLogsViaEmail(email, "DOT Transfer")
          }
        },
        "plain-text",
        transferEmail,
      )
    } else if (option === "email-self") {
      await shareLogsViaEmail(user?.email || "", "Self Transfer")
    }
  }

  const shareLogsViaEmail = async (email: string, transferType: string) => {
    try {
      const formattedDate = selectedDate.toLocaleDateString()
      const driverName = driverProfile?.name || user?.name || "Driver"
      const vehicleId = vehicleAssignment?.vehicle_info?.vehicle_unit || "Unknown"

      const filteredLogs = getFilteredLogs()

      const logsText = filteredLogs
        .map((log) => {
          const date = new Date(log.startTime).toLocaleString()
          return `${date} - ${log.status.toUpperCase()}: ${log.reason}`
        })
        .join("\n")

      const certificationText = certification.isCertified
        ? `\n\nCERTIFIED by ${certification.certifiedBy} on ${new Date(certification.certifiedAt!).toLocaleString()}\nSignature: ${certification.certificationSignature}`
        : "\n\nNOT CERTIFIED"

      const shareText = `${transferType} - Driver Logs\nDate: ${formattedDate}\nDriver: ${driverName}\nVehicle: ${vehicleId}\nEmail: ${email}\n\n${logsText}${certificationText}`

      const result = await Share.share({
        message: shareText,
        title: `${transferType} - Driver Logs`,
      })

      if (result.action === Share.sharedAction) {
        toast.success(`Logs transferred successfully via ${transferType}`)
      }
    } catch (error) {
      toast.error("Failed to transfer logs")
      console.error("Transfer error:", error)
    }
  }

  const handleInspectorMode = () => {
    router.push("/inspector-mode")
  }

  const handleCertifyLogs = () => {
    if (certification.isCertified) {
      // Show warning and allow uncertification
      toast.warning(
        `Logs were certified by ${certification.certifiedBy} on ${new Date(certification.certifiedAt!).toLocaleString()}. Use the uncertify button to make changes.`
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

  const handleCertifyIndividualLog = async (logId: string, signature: string) => {
    try {
      // Find the log entry to get the daily log ID
      const logEntry = filteredLogs.find((log) => log.logId === logId || log.id === logId)

      // Use dailyLogId if available, otherwise fallback to logId
      // Per spec: PATCH /api/hos/daily-logs/{id}/ to certify daily logs
      const dailyLogId = (logEntry as any)?.dailyLogId || logId

      if (!dailyLogId) {
        throw new Error("Daily log ID not found")
      }

      // Call HOS API to certify the daily log
      await certifyLogMutation.mutateAsync(dailyLogId)

      // Refetch daily logs to update UI
      if (isToday) {
        refetchHOSLogs()
      } else {
        refetchDailyLogs()
      }

      toast.success("Log entry certified successfully")
    } catch (error: any) {
      console.error("Failed to certify individual log:", error)
      toast.error(error?.message || "Failed to certify log entry")
      throw error
    }
  }

  const handleCertifyAllUncertifiedLogs = async () => {
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

      setShowCertifyAllModal(false)
      toast.success(
        `All ${countBeforeCertification} uncertified log${countBeforeCertification !== 1 ? "s" : ""} have been certified successfully`,
      )
    } catch (error: any) {
      console.error("Failed to certify all uncertified logs:", error)
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
            reason: log.remark || "Status change",
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
                reason: entry.remark || entry.notes || "Status change",
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
            reason: dailyLog.remark || dailyLog.notes || "Status change",
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

  const getFilteredLogs = () => {
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
  }

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

  const filteredLogs = getFilteredLogs()

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

  // Refetch logs when date changes or driver ID changes
  useEffect(() => {
    if (isAuthenticated && correctDriverId && hosClock) {
      if (isToday) {
        refetchHOSLogs() // Today: Use individual HOS logs
      } else {
        refetchDailyLogs() // Past dates: Use daily logs (certified summaries)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, isAuthenticated, correctDriverId, hosClock?.driver, isToday])

  // Debug: Log the filtered logs to understand what's happening
  console.log("Filtered logs for date:", selectedDate.toDateString(), "Count:", filteredLogs.length)

  return (
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
        rightText={certification.isCertified ? "CERTIFIED" : ""}
        rightTextStyle={{
          backgroundColor: colors.success,
          color: "#fff",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          fontSize: 12,
          fontWeight: "600",
          overflow: "hidden",
        }}
      />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={handlePreviousDay} style={styles.dateButton}>
              <Text style={[styles.dateButtonText, { color: colors.tint }]}>◀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSelectToday}
              style={[
                styles.dateDisplay,
                { backgroundColor: isDark ? colors.cardBackground : "#F3F4F6" },
              ]}
            >
              <Calendar size={16} color={colors.tint} style={styles.calendarIcon} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {selectedDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {isToday ? " (Today)" : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextDay} style={styles.dateButton} disabled={isToday}>
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
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.actionButton}>
            <LoadingButton
              title="Transfer Logs"
              onPress={handleTransferLogs}
              variant="outline"
              icon={<Share2 size={18} color={colors.tint} />}
              fullWidth
            />
          </View>
          <View style={styles.actionButton}>
            <LoadingButton
              title="ELD Materials"
              onPress={handleEldMaterials}
              variant="outline"
              icon={<FileText size={18} color={colors.tint} />}
              fullWidth
            />
          </View>
          <View style={styles.actionButton}>
            <LoadingButton
              title="Inspector Mode"
              onPress={handleInspectorMode}
              icon={<Download size={18} color={isDark ? colors.text : "#fff"} />}
              fullWidth
            />
          </View>
        </View>

        <View style={styles.certificationContainer}>
          {hasUncertifiedLogs && (
            <LoadingButton
              title={`Certify All Uncertified (${uncertifiedLogsCount})`}
              onPress={() => setShowCertifyAllModal(true)}
              variant="primary"
              icon={<Lock size={18} color="#fff" />}
              disabled={certifyAllUncertifiedMutation.isPending}
              loading={certifyAllUncertifiedMutation.isPending}
            />
          )}
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
                By certifying these logs, you confirm their accuracy. Once certified, no changes can
                be made.
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
                  <LoadingButton title="Certify" onPress={handleSubmitCertification} fullWidth />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Transfer Logs Modal */}
        <Modal
          visible={showTransferModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTransferModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Transfer Logs</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>
                Select transfer method as per FMCSA standard:
              </Text>

              <View style={styles.transferOptions}>
                <TouchableOpacity
                  style={[
                    styles.transferOption,
                    styles.preferredOption,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={() => handleTransferOption("wireless")}
                >
                  <Wifi size={24} color="#fff" />
                  <View style={styles.transferOptionText}>
                    <Text style={[styles.transferOptionTitle, { color: "#fff" }]}>
                      Wireless Web Services
                    </Text>
                    <Text style={[styles.transferOptionSubtitle, { color: "#fff" }]}>
                      Preferred method
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.transferOption,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleTransferOption("email-dot")}
                >
                  <Mail size={24} color={colors.text} />
                  <View style={styles.transferOptionText}>
                    <Text style={[styles.transferOptionTitle, { color: colors.text }]}>
                      Email to DOT
                    </Text>
                    <Text style={[styles.transferOptionSubtitle, { color: colors.textDim }]}>
                      Send to DOT inspector
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.transferOption,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleTransferOption("email-self")}
                >
                  <Mail size={24} color={colors.text} />
                  <View style={styles.transferOptionText}>
                    <Text style={[styles.transferOptionTitle, { color: colors.text }]}>
                      Email to Myself
                    </Text>
                    <Text style={[styles.transferOptionSubtitle, { color: colors.textDim }]}>
                      Send to your email
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <LoadingButton
                title="Cancel"
                onPress={() => setShowTransferModal(false)}
                variant="outline"
              />
            </View>
          </View>
        </Modal>

        {/* ELD Materials Modal */}
        <Modal
          visible={showEldMaterialsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEldMaterialsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>ELD in Cab Materials</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>
                Required documentation and instructions:
              </Text>

              <View style={styles.eldMaterials}>
                <TouchableOpacity
                  style={[styles.eldMaterialItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    toast.info("This would open the driver manual PDF or documentation.")
                  }}
                >
                  <FileText size={24} color={colors.tint} />
                  <Text style={[styles.eldMaterialTitle, { color: colors.text }]}>
                    Driver Manual
                  </Text>
                  <Text style={[styles.eldMaterialSubtitle, { color: colors.textDim }]}>
                    Complete ELD operation guide
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eldMaterialItem, { backgroundColor: colors.background }]}
                  onPress={() => {
                    toast.info(
                      "Transfer Instructions, This would open the transfer page instruction sheet.",
                    )
                  }}
                >
                  <Share2 size={24} color={colors.tint} />
                  <Text style={[styles.eldMaterialTitle, { color: colors.text }]}>
                    Transfer Page Instructions
                  </Text>
                  <Text style={[styles.eldMaterialSubtitle, { color: colors.textDim }]}>
                    Step-by-step transfer guide
                  </Text>
                </TouchableOpacity>
              </View>

              <LoadingButton
                title="Close"
                onPress={() => setShowEldMaterialsModal(false)}
                variant="outline"
              />
            </View>
          </View>
        </Modal>

        {filteredLogs.length === 0 ? (
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

            {/* Log Entries - Compact mode when certified */}
            <View style={styles.logsContainer}>
              {filteredLogs.map((item: any) => (
                <LogEntry
                  key={item?.id?.toString() || item?.timestamp?.toString() || item?.logId}
                  log={item}
                  onCertify={handleCertifyIndividualLog}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
    padding: 8,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  dateDisplay: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateSelector: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
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
  preferredOption: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  transferOption: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    marginBottom: 12,
    padding: 16,
  },
  transferOptionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  transferOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  transferOptionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  transferOptions: {
    marginBottom: 20,
  },
})
