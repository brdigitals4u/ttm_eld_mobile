import React, { useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native"
import { router } from "expo-router"
import {
  AlertTriangle,
  ArrowLeft,
  Bed,
  Briefcase,
  Coffee,
  Lock,
  MoreHorizontal,
  Settings,
  Truck,
  User,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/Button"
import ElevatedCard from "@/components/EvevatedCard"
import { useStatus } from "@/contexts"
import { useAppTheme } from "@/theme/context"
import { DriverStatus } from "@/types/status"

// Simple StatusButton component replacement
const StatusButton = ({
  status,
  label,
  isActive,
  onPress,
  icon,
}: {
  status: string
  label: string
  isActive: boolean
  onPress: () => void
  icon: React.ReactNode
}) => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors

  return (
    <TouchableOpacity
      style={[
        styles.statusButton,
        {
          backgroundColor: isActive ? colors.tint : isDark ? colors.cardBackground : "#f3f4f6",
          borderColor: isActive ? colors.tint : colors.border,
        },
      ]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[
          styles.statusButtonLabel,
          {
            color: isActive ? "#fff" : colors.text,
            fontWeight: isActive ? "600" : "400",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export default function StatusScreen() {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const {
    currentStatus,
    hoursOfService,
    formatDuration,
    certification,
    canUpdateStatus,
    splitSleepSettings,
    toggleSplitSleep,
    updateStatus,
  } = useStatus()
  const [showDoneForDayModal, setShowDoneForDayModal] = useState(false)
  const insets = useSafeAreaInsets()

  const handleStatusChange = async (status: DriverStatus) => {
    if (!canUpdateStatus()) {
      return
    }

    try {
      console.log("Status button clicked:", status)
    } catch (error) {
      console.error("Status change error:", error)
    }

    // Show "Done for the day?" modal when selecting Off Duty
    if (status === "offDuty") {
      setShowDoneForDayModal(true)
      return
    }

    // For now, use a simple reason. In a full implementation, this could be a modal to collect reason
    await updateStatus(status, `Changed to ${status}`)
  }

  const handleGoOffDuty = async () => {
    setShowDoneForDayModal(false)
    await updateStatus("offDuty", "Going off duty")
  }

  const handleGoOffDutyAndSignOut = () => {
    setShowDoneForDayModal(false)
    // In a real app, this would sign out the user after going off duty
    Alert.alert("Sign Out", "You will be signed out after going off duty.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: async () => {
          await updateStatus("offDuty", "Going off duty and signing out")
          // TODO: Implement sign out functionality
          Alert.alert("Success", "Status updated. Sign out functionality coming soon.")
        },
      },
    ])
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Update Your Status</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textDim }]}>
        Select your current duty status
      </Text>

      {certification.isCertified && (
        <ElevatedCard style={[styles.certificationWarning, { backgroundColor: colors.warning }]}>
          <View style={styles.warningContent}>
            <Lock size={24} color={isDark ? "#000" : "#fff"} />
            <Text style={[styles.warningText, { color: isDark ? "#000" : "#fff" }]}>
              Logs are certified. Status updates are disabled until logs are uncertified.
            </Text>
          </View>
        </ElevatedCard>
      )}

      <View style={[styles.statusButtons, { opacity: canUpdateStatus() ? 1 : 0.5 }]}>
        <StatusButton
          status="driving"
          label="Driving"
          isActive={currentStatus === "driving"}
          onPress={() => handleStatusChange("driving")}
          icon={
            <Truck
              size={20}
              color={currentStatus === "driving" ? (isDark ? "#000" : "#fff") : "#10B981"}
            />
          }
        />

        <StatusButton
          status="onDuty"
          label="On Duty (Not Driving)"
          isActive={currentStatus === "onDuty"}
          onPress={() => handleStatusChange("onDuty")}
          icon={
            <Briefcase
              size={20}
              color={currentStatus === "onDuty" ? (isDark ? "#000" : "#fff") : "#F59E0B"}
            />
          }
        />

        <StatusButton
          status="offDuty"
          label="Off Duty"
          isActive={currentStatus === "offDuty"}
          onPress={() => handleStatusChange("offDuty")}
          icon={
            <Coffee
              size={20}
              color={currentStatus === "offDuty" ? (isDark ? "#000" : "#fff") : "#3B82F6"}
            />
          }
        />

        <StatusButton
          status="sleeperBerth"
          label="Sleeper Berth"
          isActive={currentStatus === "sleeperBerth"}
          onPress={() => handleStatusChange("sleeperBerth")}
          icon={
            <Bed
              size={20}
              color={currentStatus === "sleeperBerth" ? (isDark ? "#000" : "#fff") : "#6366F1"}
            />
          }
        />

        <StatusButton
          status="personalConveyance"
          label="Personal Conveyance"
          isActive={currentStatus === "personalConveyance"}
          onPress={() => handleStatusChange("personalConveyance")}
          icon={
            <User
              size={20}
              color={
                currentStatus === "personalConveyance" ? (isDark ? "#000" : "#fff") : colors.tint
              }
            />
          }
        />

        <StatusButton
          status="yardMoves"
          label="Yard Moves"
          isActive={currentStatus === "yardMoves"}
          onPress={() => handleStatusChange("yardMoves")}
          icon={
            <MoreHorizontal
              size={20}
              color={currentStatus === "yardMoves" ? (isDark ? "#000" : "#fff") : colors.warning}
            />
          }
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Sleep Settings</Text>

      <ElevatedCard>
        <View style={styles.splitSleepRow}>
          <View style={styles.splitSleepInfo}>
            <Text style={[styles.splitSleepLabel, { color: colors.text }]}>Split Sleep Toggle</Text>
            <Text style={[styles.splitSleepDescription, { color: colors.textDim }]}>
              Adds {splitSleepSettings.additionalHours} hours to driving time
            </Text>
          </View>
          <Switch
            value={splitSleepSettings.enabled}
            onValueChange={(enabled) =>
              toggleSplitSleep(enabled, splitSleepSettings.additionalHours)
            }
            trackColor={{ false: colors.textDim, true: colors.tint }}
            thumbColor={splitSleepSettings.enabled ? "#fff" : "#f4f3f4"}
          />
        </View>
      </ElevatedCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Hours of Service Summary</Text>

      <ElevatedCard>
        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Drive Time Remaining:</Text>
          <Text
            style={[
              styles.hosValue,
              {
                color: hoursOfService.driveTimeRemaining < 60 ? colors.error : colors.text,
              },
            ]}
          >
            {formatDuration(hoursOfService.driveTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Shift Time Remaining:</Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hoursOfService.shiftTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Cycle Time Remaining:</Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hoursOfService.cycleTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.textDim }]}>Break Required In:</Text>
          <Text
            style={[
              styles.hosValue,
              {
                color: hoursOfService.breakTimeRemaining < 30 ? colors.error : colors.text,
              },
            ]}
          >
            {formatDuration(hoursOfService.breakTimeRemaining)}
          </Text>
        </View>
      </ElevatedCard>

      {hoursOfService.driveTimeRemaining < 60 && (
        <ElevatedCard style={[styles.warningCard, { backgroundColor: colors.error }]}>
          <View style={styles.warningContent}>
            <AlertTriangle size={24} color={isDark ? "#000" : "#fff"} />
            <Text style={[styles.warningText, { color: isDark ? "#000" : "#fff" }]}>
              You have less than {formatDuration(hoursOfService.driveTimeRemaining)} of driving time
              remaining. Plan to take a break soon.
            </Text>
          </View>
        </ElevatedCard>
      )}

      <Text style={[styles.infoText, { color: colors.textDim }]}>
        {canUpdateStatus()
          ? "Remember to update your status whenever your duty status changes to maintain accurate records."
          : "Status updates are disabled because logs have been certified."}
      </Text>

      {/* Done for the day modal */}
      <Modal
        visible={showDoneForDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoneForDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Done for the day?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleGoOffDutyAndSignOut}
              >
                <Text style={styles.primaryModalButtonText}>Go Off Duty & Sign Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={handleGoOffDuty}
              >
                <Text style={[styles.secondaryModalButtonText, { color: colors.tint }]}>
                  Go Off Duty
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={() => setShowDoneForDayModal(false)}
              >
                <Text style={[styles.secondaryModalButtonText, { color: colors.tint }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  certificationWarning: {
    marginBottom: 24,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  hosLabel: {
    fontSize: 16,
  },
  hosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hosValue: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  infoText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalButtons: {
    gap: 12,
    width: "100%",
  },
  modalContent: {
    alignItems: "center",
    borderRadius: 12,
    maxWidth: 320,
    padding: 24,
    width: "100%",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 24,
    textAlign: "center",
  },
  primaryModalButton: {
    backgroundColor: "#6B7280",
  },
  primaryModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  secondaryModalButton: {
    backgroundColor: "transparent",
  },
  secondaryModalButtonText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  splitSleepDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  splitSleepInfo: {
    flex: 1,
  },
  splitSleepLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  splitSleepRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 16,
  },
  statusButtonLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  statusButtons: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  warningCard: {
    marginBottom: 24,
    marginTop: 16,
  },
  warningContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    marginLeft: 12,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
   backButton: {
    padding: 8,
  },
})
