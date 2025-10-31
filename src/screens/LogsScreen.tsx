import React, { useState } from "react"
import {
  Alert,
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
import { Calendar, Download, FileText, Lock, Mail, Share2, Wifi } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import HOSChart from "@/components/HOSChart"
import LoadingButton from "@/components/LoadingButton"
import LogEntry from "@/components/LogEntry"
import { hosApi } from "@/api/hos"
import { toast } from "@/components/Toast"
import { useAuth } from "@/stores/authStore"
import { useStatus } from "@/contexts"
import { useAppTheme } from "@/theme/context"
import { Header } from "@/components/Header"

export const LogsScreen = () => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const { logEntries, certification, certifyLogs, uncertifyLogs } = useStatus()
  const { user, driverProfile, vehicleAssignment } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCertificationModal, setShowCertificationModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEldMaterialsModal, setShowEldMaterialsModal] = useState(false)
  const [signature, setSignature] = useState("")
  const [transferEmail, setTransferEmail] = useState("")

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
      // Show confirmation dialog for uncertifying
      Alert.alert(
        "Logs Already Certified",
        `Logs were certified by ${certification.certifiedBy} on ${new Date(certification.certifiedAt!).toLocaleString()}`,
        [
          { text: "OK" },
          {
            text: "Uncertify",
            onPress: () => {
              uncertifyLogs()
              toast.success("Logs have been uncertified")
            },
            style: "destructive",
          },
        ],
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
      // Call HOS API to certify the individual log
      await hosApi.certifyHOSLog(logId)

      // Update local state to mark log as certified
      // This would need to be implemented in the status context
      toast.success("Log entry certified successfully")
    } catch (error) {
      console.error("Failed to certify individual log:", error)
      toast.error("Failed to certify log entry")
      throw error
    }
  }

  const getFilteredLogs = () => {
    // Filter logs for the selected date
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
  const isToday = selectedDate.toDateString() === new Date().toDateString()

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
        rightText={certification.isCertified ? "CERTIFIED" : "" }
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

              <TouchableOpacity
                onPress={handleNextDay}
                style={styles.dateButton}
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
            <LoadingButton
              title={certification.isCertified ? "View Certification" : "Certify Logs"}
              onPress={handleCertifyLogs}
              variant={certification.isCertified ? "secondary" : "primary"}
              icon={<Lock size={18} color="#fff" />}
              style={{ marginBottom: 16 }}
            />
          </View>

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
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  ELD in Cab Materials
                </Text>
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
              {/* HOS Chart */}
              <HOSChart
                logs={filteredLogs.map((log) => ({
                  status: log.status,
                  timestamp: log.startTime,
                  reason: log.reason,
                  location: log.location,
                  isCertified: log.isCertified,
                }))}
                date={selectedDate}
                driverName={driverProfile?.name || user?.name || "Driver"}
                vehicleNumber={vehicleAssignment?.vehicle_info?.vehicle_unit || "Unknown"}
              />

              {/* Log Entries */}
              <View style={styles.logsContainer}>
                {filteredLogs.map((item: any) => (
                  <LogEntry
                    key={item?.timestamp?.toString()}
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
