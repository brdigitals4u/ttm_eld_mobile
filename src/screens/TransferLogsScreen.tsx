import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/stores/authStore"
import type { DriverProfile, User, VehicleAssignment, OrganizationSettings } from "@/stores/authStore"
import { useCarrier } from "@/contexts/carrier-context"
import type { CarrierInfo } from "@/types/carrier"
import { useAppTheme } from "@/theme/context"
import { Header } from "@/components/Header"
import LoadingButton from "@/components/LoadingButton"
import { useHOSLogs } from "@/api/hos"
import { router } from "expo-router"
import { toast } from "@/components/Toast"
import TransferLogsSheet, { TransferLogEvent, TransferLogsSheetData } from "@/components/TransferLogsSheet"
import { Share2, Mail, Send } from "lucide-react-native"
import { Share } from "react-native"
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet"
import { translate } from "@/i18n/translate"

const formatDate = (date: Date) => date.toISOString().split("T")[0]

type TransferOption = "wireless" | "email-dot" | "email-self" | null

type AuthSnapshot = {
  driverProfile: DriverProfile | null
  user: User | null
  vehicleAssignment: VehicleAssignment | null
  carrierInfo: CarrierInfo | null
  organizationSettings: OrganizationSettings | null
}

export const TransferLogsScreen: React.FC = () => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const insets = useSafeAreaInsets()

  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const bottomSheetSnapPoints = useMemo(() => ["45%", "65%"], [])

  const { driverProfile, user, vehicleAssignment, organizationSettings, isAuthenticated } = useAuth()
  const { carrierInfo } = useCarrier()
  
  const presetRanges = useMemo(() => {
    if (typeof translate !== 'function') {
      console.error('translate function is not available')
      return [
        { id: "today", label: "Today", days: 0 },
        { id: "yesterday", label: "Yesterday", days: 1 },
        { id: "last8", label: "Last 8 Days", days: 7 },
      ]
    }
    return [
      { id: "today", label: translate("common.today" as any), days: 0 },
      { id: "yesterday", label: translate("common.yesterday" as any), days: 1 },
      { id: "last8", label: translate("transferLogs.last8Days" as any), days: 7 },
    ]
  }, [])

  const authSnapshot = useMemo<AuthSnapshot>(
    () => ({
      driverProfile,
      user,
      vehicleAssignment,
      carrierInfo,
      organizationSettings,
    }),
    [driverProfile, user, vehicleAssignment, carrierInfo, organizationSettings],
  )

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [activePreset, setActivePreset] = useState<string>("last8")
  const [comment, setComment] = useState<string>("Roadside inspection – ready for transfer.")
  const [emailAddress, setEmailAddress] = useState<string>("dot@fmcsa.gov")
  const [transferOption, setTransferOption] = useState<TransferOption>(null)
  const [transferSheetData, setTransferSheetData] = useState<TransferLogsSheetData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const driverId = driverProfile?.driver_id
  const startDateStr = useMemo(() => formatDate(startDate), [startDate])
  const endDateStr = useMemo(() => formatDate(endDate), [endDate])

  const { data: hosLogsData, isFetching, refetch } = useHOSLogs(
    {
      driver: driverId,
      startDate: startDateStr,
      endDate: endDateStr,
    },
    {
      enabled: isAuthenticated && !!driverId,
    },
  )

  useEffect(() => {
    if (!isAuthenticated || !driverId) return
    refetch()
  }, [driverId, startDateStr, endDateStr, refetch, isAuthenticated])

  useEffect(() => {
    if (hosLogsData) {
      const data = buildTransferData(hosLogsData, authSnapshot)
      setTransferSheetData(data)
      setLastUpdated(new Date())
    }
  }, [hosLogsData, authSnapshot])

  const handlePresetChange = (presetId: string) => {
    if (presetId === activePreset) return
    const preset = presetRanges.find((p) => p.id === presetId)
    if (!preset) return

    if (preset.days == null) {
      setActivePreset("custom")
      toast.info("Select custom dates using the picker below.")
      return
    }

    const newEnd = new Date()
    const newStart = new Date()
    newStart.setDate(newStart.getDate() - preset.days)
    setStartDate(newStart)
    setEndDate(newEnd)
    setActivePreset(preset.id)
  }

  const handleStartDateChange = useCallback(
    (direction: "back" | "forward") => {
      const delta = direction === "back" ? -1 : 1
      const newStart = new Date(startDate)
      newStart.setDate(newStart.getDate() + delta)
      setStartDate(newStart)
      if (activePreset !== "custom") setActivePreset("custom")
    },
    [startDate, activePreset],
  )

  const handleEndDateChange = useCallback(
    (direction: "back" | "forward") => {
      const delta = direction === "back" ? -1 : 1
      const newEnd = new Date(endDate)
      newEnd.setDate(newEnd.getDate() + delta)
      if (newEnd > new Date()) {
        toast.info("Cannot select future dates.")
        return
      }
      if (newEnd < startDate) {
        toast.info("End date cannot be before start date.")
        return
      }
      setEndDate(newEnd)
      if (activePreset !== "custom") setActivePreset("custom")
    },
    [endDate, startDate, activePreset],
  )

  const latestSummary = useMemo(() => {
    if (!transferSheetData) return null
    return {
      driverName: transferSheetData.driver.name,
      dateRange: `${startDateStr} → ${endDateStr}`,
      totalEvents: transferSheetData.events.length,
    }
  }, [transferSheetData, startDateStr, endDateStr])

  const handleOpenTransferOption = (option: TransferOption) => {
    setTransferOption(option)
    bottomSheetRef.current?.present()
    if (option === "email-dot") {
      setEmailAddress("dot@fmcsa.gov")
      setComment(`Roadside inspection – ${startDateStr} to ${endDateStr}`)
    } else if (option === "email-self") {
      setEmailAddress(user?.email || "")
      setComment(`Driver copy – ${startDateStr} to ${endDateStr}`)
    } else {
      setComment(`Wireless transfer requested – ${startDateStr} to ${endDateStr}`)
    }
  }

  const shareTransfer = async () => {
    if (!transferSheetData) {
      toast.error("Generate the transfer report first.")
      return
    }
    try {
      const html = renderTransferLogsSheet(transferSheetData, comment, emailAddress)
      await Share.share({
        message: `TTM Konnect FMCSA Transfer Report\nRange: ${startDateStr} → ${endDateStr}\n\n${comment}`,
        title: `TTM Transfer Logs - ${startDateStr} to ${endDateStr}`,
      })
      toast.success("Transfer prepared successfully.")
    } catch (error: any) {
      console.error("Transfer share error:", error)
      toast.error("Failed to share transfer report.")
    } finally {
      bottomSheetRef.current?.dismiss()
      setTransferOption(null)
    }
  }

  const renderDateControls = () => (
    <View style={styles.rangeContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Date Range</Text>
      <View style={styles.presetsRow}>
        {presetRanges.map((preset) => {
          const isActive = preset.id === activePreset
          return (
          <TouchableOpacity
            key={preset.id}
            onPress={() => handlePresetChange(preset.id)}
            style={[
              styles.presetChip,
              isActive && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                { color: isActive ? "#fff" : colors.text },
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.datePickerRow}>
        <View style={styles.datePickerCard}>
          <Text style={[styles.datePickerLabel, { color: colors.textDim }]}>Start</Text>
          <View style={styles.dateControls}>
            <TouchableOpacity onPress={() => handleStartDateChange("back")} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.tint }]}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.dateDisplayText, { color: colors.text }]}>{startDateStr}</Text>
            <TouchableOpacity onPress={() => handleStartDateChange("forward")} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.tint }]}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.datePickerCard}>
          <Text style={[styles.datePickerLabel, { color: colors.textDim }]}>End</Text>
          <View style={styles.dateControls}>
            <TouchableOpacity onPress={() => handleEndDateChange("back")} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.tint }]}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.dateDisplayText, { color: colors.text }]}>{endDateStr}</Text>
            <TouchableOpacity onPress={() => handleEndDateChange("forward")} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.tint }]}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )

  const renderTransferActions = () => {
    const activeChipBg = isDark ? colors.tint : colors.tint
    const activeChipText = "#fff"

    const baseChip = [styles.actionChip, styles.actionChipOutline, { borderColor: colors.border }]

    return (
      <View style={styles.actionChips}>
        <TouchableOpacity
          style={[
            styles.actionChip,
            transferOption === "wireless" && { backgroundColor: activeChipBg },
          ]}
          onPress={() => handleOpenTransferOption("wireless")}
        >
          <Share2 size={18} color={transferOption === "wireless" ? activeChipText : colors.tint} />
          <Text
            style={[
              styles.actionChipText,
              { color: transferOption === "wireless" ? activeChipText : colors.tint },
            ]}
          >
            Wireless Transfer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            ...baseChip,
            transferOption === "email-dot" && { backgroundColor: activeChipBg, borderColor: activeChipBg },
          ]}
          onPress={() => handleOpenTransferOption("email-dot")}
        >
          <Mail size={18} color={transferOption === "email-dot" ? activeChipText : colors.tint} />
          <Text
            style={[
              styles.actionChipText,
              { color: transferOption === "email-dot" ? activeChipText : colors.tint },
            ]}
          >
            Email DOT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            ...baseChip,
            transferOption === "email-self" && { backgroundColor: activeChipBg, borderColor: activeChipBg },
          ]}
          onPress={() => handleOpenTransferOption("email-self")}
        >
          <Mail size={18} color={transferOption === "email-self" ? activeChipText : colors.tint} />
          <Text
            style={[
              styles.actionChipText,
              { color: transferOption === "email-self" ? activeChipText : colors.tint },
            ]}
          >
            Email Myself
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <BottomSheetModalProvider>
        <View style={styles.container}>
      <Header
        title="TRANSFER LOGS"
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

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }}>
        {renderDateControls()}
        {renderTransferActions()}



        {isFetching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.tint} size="large" />
          </View>
        )}

        {!isFetching && transferSheetData && (
          <View style={styles.reportContainer}>
            <TransferLogsSheet
              data={transferSheetData}
              theme={{
                textColor: colors.text,
                mutedTextColor: colors.textDim,
                borderColor: colors.border,
                headingColor: colors.tint,
                backgroundColor: colors.background,
              }}
            />
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <LoadingButton
          title="Transfer Now"
          onPress={() => handleOpenTransferOption("wireless")}
          icon={<Share2 size={18} color="#fff" />}
          fullWidth
        />
      </View>

          <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={bottomSheetSnapPoints}
            backdropComponent={(props) => (
              <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
            )}
            onDismiss={() => setTransferOption(null)}
            backgroundStyle={{ backgroundColor: colors.cardBackground }}
            handleIndicatorStyle={{ backgroundColor: colors.border }}
          >
            <BottomSheetView
              style={[
                styles.bottomSheet,
                { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + 24 },
              ]}
            >
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
              {transferOption === "wireless"
                ? "Wireless Transfer"
                : transferOption === "email-dot"
                  ? "Email to DOT"
                  : "Email to Myself"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                bottomSheetRef.current?.dismiss()
                setTransferOption(null)
              }}
            >
              <Text style={{ color: colors.tint, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>

          {transferOption !== "wireless" && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textDim }]}>Recipient Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.cardBackground : "#F3F4F6",
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textDim }]}>Comments (optional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? colors.cardBackground : "#F3F4F6",
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />
          </View>

            <LoadingButton
              title="Send Transfer"
              onPress={shareTransfer}
              icon={<Send size={18} color="#fff" />}
              fullWidth
            />
            </BottomSheetView>
          </BottomSheetModal>
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  )
}

const buildTransferData = (logs: any[], authSnapshot: AuthSnapshot): TransferLogsSheetData | null => {
  const { driverProfile, user, vehicleAssignment, carrierInfo, organizationSettings } = authSnapshot
  if (!driverProfile) return null

  const fallback = (value: any, defaultValue: string) => {
    if (value === null || value === undefined) return defaultValue
    const strValue = String(value).trim()
    return strValue.length > 0 ? strValue : defaultValue
  }

  const driverName = fallback(driverProfile.name || user?.name, "Michael Anderson")
  const driverId = fallback(driverProfile.driver_id || user?.id, "DRV-1024")
  const licenseNumber = fallback(driverProfile.license_number || user?.licenseNumber, "TX9876543")
  const licenseState = fallback(driverProfile.license_state || user?.licenseState, "TX")
  const coDriver = fallback((driverProfile as any)?.co_driver_name, "Not Assigned")

  const carrierName = fallback(carrierInfo?.name || organizationSettings?.organization_name, "TTM Logistics LLC")
  const carrierDot = fallback(carrierInfo?.dotNumber, "2765841")
  const mainOfficeAddress = fallback(
    carrierInfo?.address
      ? `${carrierInfo.address.street}, ${carrierInfo.address.city}, ${carrierInfo.address.state} ${carrierInfo.address.zipCode}`
      : organizationSettings?.organization_name,
    "1212 Logistics Ave, Austin, TX 78701",
  )
  const homeTerminalAddress = fallback(
    driverProfile.home_terminal_address,
    "Austin Terminal • 8901 Fleet Way, Austin, TX 78653",
  )

  const vehicleInfo = vehicleAssignment?.vehicle_info
  const truckId = fallback(vehicleInfo?.vehicle_unit, "TTM-TRK-204")
  const vin = fallback(vehicleInfo?.vin, "3AKJHHDR1MSMG1234")
  const trailerId = "TRL-7785"
  const shippingDocumentNumber = "BL-2025-4587"

  const sortedLogs = [...logs].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const startDate = sortedLogs[0]?.start_time?.split("T")[0] ?? formatDate(new Date())
  const endDate = sortedLogs[sortedLogs.length - 1]?.start_time?.split("T")[0] ?? formatDate(new Date())

  const timeline: TransferLogEvent[] = sortedLogs.map((log: any, index: number) => {
    const status = log.duty_status || "off_duty"
    const normalizedStatus = status.toLowerCase()
    const statusEntry = convertStatusToEvent(normalizedStatus)
    const location = fallback(log.start_location, "Austin, TX")

    return {
      sequenceId: String(index + 1),
      eventType: statusEntry.type,
      eventCode: statusEntry.code,
      dateTime: log.start_time || new Date().toISOString(),
      location,
      latitude: log.latitude ? String(log.latitude) : null,
      longitude: log.longitude ? String(log.longitude) : null,
      vehicleMiles: log.vehicle_miles ?? log.odometer ?? null,
      engineHours: log.engine_hours ?? null,
      origin: "ELD",
      recordStatus: "Active",
      annotation: log.remark || null,
    }
  })

  const odometerStart = String(sortedLogs[0]?.odometer ?? 23050)
  const odometerEnd = String(sortedLogs[sortedLogs.length - 1]?.odometer ?? Number(odometerStart) + 152)
  const totalMiles = String(Math.max(0, Number(odometerEnd) - Number(odometerStart)))

  const engineHoursStart = String(sortedLogs[0]?.engine_hours ?? 15322)
  const engineHoursEnd = String(sortedLogs[sortedLogs.length - 1]?.engine_hours ?? Number(engineHoursStart) + 135)

  return {
    metadata: {
      eldIdentifier: "TTM-ELD-001",
      eldProvider: "TTM Konnect",
      eldRegistrationId: "REG-001",
      softwareVersion: "1.0.0",
      outputComment: `Log transfer for ${startDate} to ${endDate}`,
      outputType: "Web Services",
      generatedAt: new Date().toISOString(),
      reportRange: `${startDate} to ${endDate}`,
      logoUrl: undefined,
    },
    driver: {
      name: driverName,
      driverId: driverId,
      coDriver: coDriver,
      licenseNumber: licenseNumber,
      licenseState: licenseState,
      carrierName: carrierName,
      carrierDotNumber: carrierDot,
      mainOfficeAddress: mainOfficeAddress,
      homeTerminalAddress: homeTerminalAddress,
      startTime: "Midnight",
      timeZone: organizationSettings?.timezone ?? "America/Chicago",
      cycleRule: organizationSettings?.hos_settings?.cycle_type === "60-7" ? "USA 60 hour / 7 day" : "USA 70 hour / 8 day",
    },
    vehicle: {
      truckId: truckId,
      vin: vin,
      trailerId: trailerId,
      shippingDocument: shippingDocumentNumber,
      engineHoursStart,
      engineHoursEnd,
      odometerStart,
      odometerEnd,
      totalMiles,
      malfunctionIndicator: "No Active Malfunction",
      dataDiagnosticIndicator: "No Diagnostic Events",
      unidentifiedDriverRecords: "None",
      exemptDriverStatus: driverProfile.eld_exempt ? "Yes" : "No",
    },
    events: timeline,
    supportingEvents: [],
    certification: {
      certified: false,
      certificationDate: null,
      certifiedBy: null,
      driverSignature: null,
      officerName: null,
    },
  }
}

const convertStatusToEvent = (status: string) => {
  const map: Record<string, { type: string; code: string }> = {
    driving: { type: "Duty Status", code: "3" },
    on_duty: { type: "Duty Status", code: "4" },
    onDuty: { type: "Duty Status", code: "4" },
    off_duty: { type: "Duty Status", code: "1" },
    offDuty: { type: "Duty Status", code: "1" },
    sleeper_berth: { type: "Duty Status", code: "2" },
    sleeperBerth: { type: "Duty Status", code: "2" },
    personal_conveyance: { type: "Special Duty Status", code: "5" },
    yard_move: { type: "Special Duty Status", code: "6" },
  }
  return map[status] || { type: "Duty Status", code: "1" }
}

const renderTransferLogsSheet = (
  data: TransferLogsSheetData,
  comment: string,
  email: string,
) => {
  return `
TTM Konnect FMCSA Transfer Report
Range: ${data.metadata.reportRange}
Driver: ${data.driver.name} (${data.driver.driverId})
Co-Driver: ${data.driver.coDriver}
Carrier: ${data.driver.carrierName} (${data.driver.carrierDotNumber})
Vehicle: ${data.vehicle.truckId} • VIN ${data.vehicle.vin}
Miles: ${data.vehicle.totalMiles} • Engine Hours: ${data.vehicle.engineHoursStart} → ${data.vehicle.engineHoursEnd}

Comment: ${comment}
Recipient: ${email}
`
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  rangeContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  datePickerRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  datePickerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrowButton: {
    padding: 8,
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "700",
  },
  dateDisplayText: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionChipOutline: {
    borderWidth: 1,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  statusFooter: {
    fontSize: 12,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  reportContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summarySubtitle: {
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingBottom: 30,
    paddingTop:12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginBottom: -10,
    gap: 16,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 14,
  },
  textArea: {
    height: 96,
    textAlignVertical: "top",
  },
})

export default TransferLogsScreen

