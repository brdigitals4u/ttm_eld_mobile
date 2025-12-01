/**
 * Driver Note Sheet Component
 *
 * Allows drivers to attach free-text notes to historical records
 * Preserves original timestamp and adds note timestamp
 */

import React, { useState, useRef, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { FileText, Send, X } from "lucide-react-native"

import { EldHistoryRecord } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"

import { Text } from "./Text"

export interface DriverNoteSheetProps {
  visible: boolean
  record: EldHistoryRecord | null
  onDismiss: () => void
  onSave: (recordId: string, note: string) => Promise<void>
}

export const DriverNoteSheet: React.FC<DriverNoteSheetProps> = ({
  visible,
  record,
  onDismiss,
  onSave,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const snapPoints = useMemo(() => ["60%"], [])

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present()
      setNote("") // Reset note when opening
    } else {
      bottomSheetRef.current?.dismiss()
    }
  }, [visible])

  React.useEffect(() => {
    if (!visible) {
      setNote("")
      setIsSaving(false)
    }
  }, [visible])

  const handleSave = async () => {
    if (!record || !note.trim() || isSaving) return

    setIsSaving(true)
    try {
      await onSave(record.id, note.trim())
      setNote("")
      onDismiss()
    } catch (error) {
      console.error("Failed to save note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNote("")
    onDismiss()
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  )

  if (!record) {
    return null
  }

  const recordTime = record.eventTime
    ? new Date(record.eventTime).toLocaleString()
    : record.receivedAt.toLocaleString()

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isSaving}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <FileText size={24} color={colors.tint} />
          <Text style={styles.title}>{translate("eld.driverNote.title" as any)}</Text>
        </View>

        {/* Record Info */}
        <View style={styles.recordInfo}>
          <Text style={styles.recordInfoLabel}>
            {translate("eld.driverNote.recordTime" as any)}
          </Text>
          <Text style={styles.recordInfoValue}>{recordTime}</Text>
          {record.latitude && record.longitude && (
            <>
              <Text style={styles.recordInfoLabel}>
                {translate("eld.driverNote.location" as any)}
              </Text>
              <Text style={styles.recordInfoValue}>
                {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
              </Text>
            </>
          )}
        </View>

        {/* Note Input */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>{translate("eld.driverNote.note" as any)}</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            value={note}
            onChangeText={setNote}
            placeholder={translate("eld.driverNote.notePlaceholder" as any)}
            placeholderTextColor={colors.light?.textSecondary || colors.text}
            maxLength={500}
            editable={!isSaving}
          />
          <Text style={styles.charCount}>
            {translate("eld.driverNote.charCount" as any, { count: note.length })}
          </Text>
        </View>

        {/* Info Text */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{translate("eld.driverNote.info" as any)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <X size={20} color={colors.text} />
            <Text style={styles.cancelButtonText}>{translate("common.cancel" as any)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (!note.trim() || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!note.trim() || isSaving}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isSaving
                ? translate("eld.driverNote.saving" as any)
                : translate("eld.driverNote.saveNote" as any)}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
  },
  cancelButton: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  charCount: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    textAlign: "right",
  },
  content: {
    flex: 1,
    padding: 24,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 24,
    padding: 12,
  },
  infoText: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  noteInput: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 4,
    minHeight: 120,
    padding: 12,
    textAlignVertical: "top",
  },
  noteLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  noteSection: {
    marginBottom: 24,
  },
  recordInfo: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  recordInfoLabel: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    marginBottom: 4,
  },
  recordInfoValue: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.tint,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
  },
})
