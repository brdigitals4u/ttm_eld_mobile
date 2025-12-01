/**
 * ELD GPS Warning Component
 *
 * Banner that appears when GPS is lost for >60 minutes while driving
 * Provides quick diagnostic actions and note-taking
 */

import React, { useState, useRef, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, Platform, TextInput } from "react-native"
import * as Location from "expo-location"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { AlertTriangle, MapPin, RefreshCw, FileText } from "lucide-react-native"

import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"

import { Text } from "./Text"

export interface EldGpsWarningProps {
  visible: boolean
  durationMinutes: number
  onDismiss?: () => void
  onAddNote?: (note: string) => void
}

export const EldGpsWarning: React.FC<EldGpsWarningProps> = ({
  visible,
  durationMinutes,
  onDismiss,
  onAddNote,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [note, setNote] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)

  const snapPoints = useMemo(() => ["60%"], [])

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present()
    } else {
      bottomSheetRef.current?.dismiss()
    }
  }, [visible])

  const handleDiagnose = async () => {
    // Check GPS permissions
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== "granted") {
      // Request permission
      await Location.requestForegroundPermissionsAsync()
    }

    // Try to get current location
    try {
      await Location.getCurrentPositionAsync({})
      // If successful, GPS is working
      onDismiss?.()
    } catch (error) {
      console.warn("GPS still not available:", error)
    }
  }

  const handleReconnect = () => {
    // Trigger location service reconnect
    Location.requestForegroundPermissionsAsync().then(() => {
      handleDiagnose()
    })
  }

  const handleAddNote = () => {
    setShowNoteInput(true)
  }

  const handleSaveNote = () => {
    if (note.trim()) {
      onAddNote?.(note.trim())
      setNote("")
      setShowNoteInput(false)
    }
  }

  const handleManualLocation = () => {
    // Open manual location capture (would need to be implemented)
    console.log("Manual location capture - to be implemented")
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  )

  if (!visible) {
    return null
  }

  return (
    <>
      {/* Banner (always visible when warning is active) */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => bottomSheetRef.current?.present()}
        activeOpacity={0.8}
      >
        <AlertTriangle size={20} color="#F59E0B" />
        <Text style={styles.bannerText}>{translate("eld.gpsWarning.bannerText" as any)}</Text>
      </TouchableOpacity>

      {/* Diagnostic Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <AlertTriangle size={32} color="#F59E0B" />
            <Text style={styles.title}>{translate("eld.gpsWarning.title" as any)}</Text>
            <Text style={styles.subtitle}>
              {translate("eld.gpsWarning.duration" as any, {
                minutes: Math.round(durationMinutes),
              })}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDiagnose}>
              <MapPin size={20} color={colors.tint} />
              <Text style={styles.actionText}>
                {translate("eld.gpsWarning.checkPermission" as any)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleReconnect}>
              <RefreshCw size={20} color={colors.tint} />
              <Text style={styles.actionText}>{translate("eld.gpsWarning.reconnect" as any)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleManualLocation}>
              <MapPin size={20} color={colors.tint} />
              <Text style={styles.actionText}>
                {translate("eld.gpsWarning.markLocation" as any)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note Section */}
          {!showNoteInput ? (
            <TouchableOpacity style={styles.noteButton} onPress={handleAddNote}>
              <FileText size={20} color={colors.tint} />
              <Text style={styles.noteButtonText}>
                {translate("eld.gpsWarning.addNote" as any)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noteInputContainer}>
              <Text style={styles.noteLabel}>{translate("eld.gpsWarning.noteLabel" as any)}</Text>
              <View style={styles.noteInputRow}>
                <TextInput
                  style={styles.noteInput}
                  multiline
                  value={note}
                  onChangeText={setNote}
                  placeholder={translate("eld.gpsWarning.notePlaceholder" as any)}
                  placeholderTextColor={colors.light?.textSecondary || colors.text}
                />
              </View>
              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={[styles.noteActionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowNoteInput(false)
                    setNote("")
                  }}
                >
                  <Text style={styles.cancelButtonText}>{translate("common.cancel" as any)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.noteActionButton, styles.saveButton]}
                  onPress={handleSaveNote}
                >
                  <Text style={styles.saveButtonText}>
                    {translate("eld.gpsWarning.saveNote" as any)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>
              {translate("eld.gpsWarning.acknowledge" as any)}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  actionText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  banner: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderLeftColor: "#F59E0B",
    borderLeftWidth: 4,
    borderRadius: 8,
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
  },
  bannerText: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  dismissButton: {
    alignItems: "center",
    backgroundColor: colors.tint,
    borderRadius: 8,
    padding: 16,
  },
  dismissButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  noteActionButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  noteActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  noteButton: {
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    padding: 16,
  },
  noteButtonText: {
    color: colors.tint,
    flex: 1,
    fontSize: 16,
  },
  noteInput: {
    color: colors.text,
    fontSize: 16,
    textAlignVertical: "top",
  },
  noteInputContainer: {
    marginBottom: 24,
  },
  noteInputRow: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
    padding: 12,
  },
  noteLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: colors.tint,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,
  },
})
