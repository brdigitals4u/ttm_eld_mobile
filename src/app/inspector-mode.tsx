import React, { useState } from "react"
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native"
import { router } from "expo-router"
import { ArrowLeft, Clock, FileText, Lock, Share2, Unlock } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import LogEntry from "@/components/LogEntry"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { useAuth, useStatus } from "@/contexts"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

export default function InspectorModeScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { statusHistory } = useStatus()
  const { user, vehicleInfo, driverProfile, organizationSettings, vehicleAssignment } = useAuth()
  const [isLocked, setIsLocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState("")
  const [tempPin, setTempPin] = useState("")
  const [isCreatingPin, setIsCreatingPin] = useState(false)

  const handleExitInspectorMode = () => {
    if (isLocked) {
      toast.warning(translate("inspectorMode.unlockToExit" as any))
      return
    }

    router.back()
    toast.success(translate("inspectorMode.exited" as any))
  }

  const handleToggleLock = () => {
    if (isLocked) {
      // Unlock - ask for PIN
      setIsCreatingPin(false)
      setShowPinModal(true)
    } else {
      // Lock - create new PIN
      setIsCreatingPin(true)
      setShowPinModal(true)
    }
  }

  const handlePinSubmit = () => {
    if (isCreatingPin) {
      if (pin.length >= 4) {
        setTempPin(pin)
        setIsLocked(true)
        setShowPinModal(false)
        setPin("")
        toast.success(translate("inspectorMode.screenLocked" as any))
      } else {
        toast.error(translate("inspectorMode.pinRequired" as any))
      }
    } else {
      if (pin === tempPin) {
        setIsLocked(false)
        setShowPinModal(false)
        setPin("")
        setTempPin("")
        toast.success(translate("inspectorMode.screenUnlocked" as any))
      } else {
        toast.error(translate("inspectorMode.incorrectPin" as any))
        setPin("")
      }
    }
  }

  const handlePinCancel = () => {
    setShowPinModal(false)
    setPin("")
    setIsCreatingPin(false)
  }

  const handleShareLogs = () => {
    if (isLocked) {
      toast.warning(translate("inspectorMode.unlockToAccess" as any))
      return
    }
    router.push("/logs/transfer?source=inspector")
  }

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...statusHistory].sort((a, b) => b.timestamp - a.timestamp)

  // Get today's logs
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayLogs = sortedLogs.filter((log) => log.timestamp >= today.getTime())

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleExitInspectorMode} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {translate("inspectorMode.title" as any)}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ElevatedCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              {translate("inspectorMode.driver" as any)}:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.name || user?.name || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              {translate("inspectorMode.license" as any)}:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.license_number || user?.licenseNumber || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              {translate("inspectorMode.vehicle" as any)}:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {vehicleAssignment?.vehicle_info?.vehicle_unit || vehicleInfo?.vehicle_unit || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              {translate("inspectorMode.company" as any)}:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {organizationSettings?.organization_name || user?.organizationName || "N/A"}
            </Text>
          </View>
        </ElevatedCard>

        <View style={styles.actionsContainer}>
          <LoadingButton
            title={translate("transferLogs.share" as any)}
            onPress={handleShareLogs}
            icon={<Share2 size={18} color={isDark ? colors.text : "#fff"} />}
            style={{ flex: 1, marginRight: 8 }}
          />
          <LoadingButton
            title={
              isLocked
                ? translate("inspectorMode.unlock" as any)
                : translate("inspectorMode.lock" as any)
            }
            onPress={handleToggleLock}
            variant={isLocked ? "outline" : "secondary"}
            icon={
              isLocked ? (
                <Unlock size={18} color={colors.tint} />
              ) : (
                <Lock size={18} color={isDark ? colors.text : "#fff"} />
              )
            }
          />
        </View>

        <View style={styles.logsHeader}>
          <View style={styles.logsHeaderLeft}>
            <Clock size={20} color={colors.tint} />
            <Text style={[styles.logsTitle, { color: colors.text }]}>
              {translate("inspectorMode.todayLogs" as any)}
            </Text>
          </View>
          <Text style={[styles.logsCount, { color: colors.textDim }]}>
            {todayLogs.length} entries
          </Text>
        </View>

        {todayLogs.length === 0 ? (
          <ElevatedCard>
            <View style={styles.emptyLogs}>
              <FileText size={32} color={colors.textDim} />
              <Text style={[styles.emptyLogsText, { color: colors.textDim }]}>
                No logs recorded today
              </Text>
            </View>
          </ElevatedCard>
        ) : (
          <FlatList
            data={todayLogs}
            renderItem={({ item }) => <LogEntry log={item} />}
            keyExtractor={(item) => item?.timestamp?.toString()}
            style={styles.logsList}
            contentContainerStyle={styles.logsListContent}
          />
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textDim }]}>
            This device is in inspector mode.{" "}
            {isLocked ? "Screen is locked." : "Screen is unlocked."}
          </Text>
        </View>
      </View>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isCreatingPin
                ? translate("inspectorMode.createPin" as any)
                : translate("inspectorMode.enterPin" as any)}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textDim }]}>
              {isCreatingPin
                ? translate("inspectorMode.createPin" as any) +
                  " - " +
                  translate("inspectorMode.pinRequired" as any)
                : translate("inspectorMode.enterPin" as any)}
            </Text>

            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={pin}
              onChangeText={setPin}
              placeholder={translate("inspectorMode.enterPin" as any)}
              placeholderTextColor={colors.textDim}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <LoadingButton
                title={translate("common.cancel" as any)}
                onPress={handlePinCancel}
                variant="outline"
              />
              <LoadingButton
                title={
                  isCreatingPin
                    ? translate("inspectorMode.createPin" as any)
                    : translate("inspectorMode.unlock" as any)
                }
                onPress={handlePinSubmit}
                disabled={pin.length < 4}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 600,
    padding: 20,
    width: "100%",
  },
  emptyLogs: {
    alignItems: "center",
    padding: 24,
  },
  emptyLogsText: {
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    width: 100,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
  },
  logsCount: {
    fontSize: 14,
  },
  logsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logsHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingBottom: 16,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalContent: {
    alignItems: "center",
    borderRadius: 12,
    maxWidth: 400,
    padding: 24,
    width: "80%",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  pinInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    height: 48,
    marginBottom: 24,
    paddingHorizontal: 16,
    textAlign: "center",
    width: "100%",
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
})
