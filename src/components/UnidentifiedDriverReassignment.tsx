/**
 * Unidentified Driver Reassignment Component
 *
 * Allows drivers to review and assume unidentified driver records
 * Creates new events for the driver with filled-in missing elements
 */

import React, { useState, useRef, useMemo, useCallback } from "react"
import { View, StyleSheet, TouchableOpacity, FlatList, ListRenderItem } from "react-native"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import { format } from "date-fns"
import { User, CheckCircle, X, AlertCircle } from "lucide-react-native"

import { useAuth } from "@/stores/authStore"
import { colors } from "@/theme/colors"
import { translate } from "@/i18n/translate"

import { Text } from "./Text"
import { TextInput } from "react-native-paper"

export interface UnidentifiedDriverRecord {
  id: string
  timestamp: Date
  eventType: string
  location?: {
    latitude: number
    longitude: number
  }
  vehicleId?: string
  missingFields: string[]
  rawData: any
}

export interface UnidentifiedDriverReassignmentProps {
  visible: boolean
  records: UnidentifiedDriverRecord[]
  onDismiss: () => void
  onReassign: (recordIds: string[], annotation: string) => Promise<void>
}

export const UnidentifiedDriverReassignment: React.FC<UnidentifiedDriverReassignmentProps> = ({
  visible,
  records,
  onDismiss,
  onReassign,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [annotation, setAnnotation] = useState("")
  const [isReassigning, setIsReassigning] = useState(false)
  const { driverProfile } = useAuth()

  const snapPoints = useMemo(() => ["85%"], [])

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present()
      // Select all records by default
      setSelectedRecords(new Set(records.map((r) => r.id)))
    } else {
      bottomSheetRef.current?.dismiss()
      setSelectedRecords(new Set())
      setAnnotation("")
    }
  }, [visible, records])

  const toggleRecord = useCallback((recordId: string) => {
    setSelectedRecords((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(recordId)) {
        newSelected.delete(recordId)
      } else {
        newSelected.add(recordId)
      }
      return newSelected
    })
  }, [])

  // Render item for FlatList
  const renderRecordItem: ListRenderItem<UnidentifiedDriverRecord> = useCallback(
    ({ item: record }) => {
      const isSelected = selectedRecords.has(record.id)
      return (
        <TouchableOpacity
          style={[styles.recordCard, isSelected && styles.recordCardSelected]}
          onPress={() => toggleRecord(record.id)}
        >
          <View style={styles.recordCheckbox}>
            {isSelected ? (
              <CheckCircle size={24} color={colors.tint} fill={colors.tint} />
            ) : (
              <View style={styles.checkboxEmpty} />
            )}
          </View>
          <View style={styles.recordContent}>
            <Text style={styles.recordTime}>
              {format(record.timestamp, "MMM dd, yyyy HH:mm:ss")}
            </Text>
            <Text style={styles.recordType}>
              {translate("common.event" as any) || "Event"}: {record.eventType}
            </Text>
            {record.missingFields.length > 0 && (
              <View style={styles.missingFieldsContainer}>
                <Text style={styles.missingFieldsLabel}>
                  {translate("eld.unidentified.missing" as any)}
                </Text>
                <Text style={styles.missingFieldsText}>
                  {record.missingFields.join(", ")}
                </Text>
              </View>
            )}
            {record.location && (
              <Text style={styles.recordLocation}>
                {translate("eld.unidentified.location" as any)}:{" "}
                {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )
    },
    [selectedRecords, toggleRecord]
  )

  const keyExtractor = useCallback((item: UnidentifiedDriverRecord) => item.id, [])

  // Estimate item height for getItemLayout optimization
  const ITEM_HEIGHT = 120
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  )

  const handleReassign = async () => {
    if (selectedRecords.size === 0) {
      return
    }

    if (annotation.trim().length < 4) {
      // Show error - annotation required
      return
    }

    setIsReassigning(true)
    try {
      await onReassign(Array.from(selectedRecords), annotation.trim())
      // Success - modal will be dismissed by parent
    } catch (error) {
      console.error("Failed to reassign records:", error)
    } finally {
      setIsReassigning(false)
    }
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  )

  if (!visible || records.length === 0) {
    return null
  }

  const selectedCount = selectedRecords.size

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isReassigning}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <User size={24} color={colors.tint} />
          <Text style={styles.title}>{translate("eld.unidentified.title" as any)}</Text>
          <Text style={styles.subtitle}>
            {translate("eld.unidentified.subtitle" as any, {
              count: records.length,
              plural: records.length !== 1 ? "s" : "",
            })}
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <AlertCircle size={16} color={colors.tint} />
          <Text style={styles.infoText}>{translate("eld.unidentified.info" as any)}</Text>
        </View>

        {/* Records List - Using FlatList for better performance */}
        <FlatList
          data={records}
          renderItem={renderRecordItem}
          keyExtractor={keyExtractor}
          style={styles.recordsList}
          contentContainerStyle={styles.recordsListContent}
          showsVerticalScrollIndicator
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          getItemLayout={getItemLayout}
        />

        {/* Annotation Input */}
        <View style={styles.annotationContainer}>
          <Text style={styles.annotationLabel}>
            {translate("eld.unidentified.annotationLabel" as any)}
          </Text>
          <TextInput
            style={styles.annotationInput}
            multiline
            value={annotation}
            onChangeText={setAnnotation}
            placeholder={translate("eld.unidentified.annotationPlaceholder" as any)}
            placeholderTextColor={colors.light?.textSecondary || colors.text}
            maxLength={500}
            editable={!isReassigning}
          />
          <Text style={styles.annotationCharCount}>{annotation.length} / 500</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onDismiss}
            disabled={isReassigning}
          >
            <X size={20} color={colors.text} />
            <Text style={styles.cancelButtonText}>{translate("common.cancel" as any)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.reassignButton,
              (selectedCount === 0 || annotation.trim().length < 4 || isReassigning) &&
                styles.reassignButtonDisabled,
            ]}
            onPress={handleReassign}
            disabled={selectedCount === 0 || annotation.trim().length < 4 || isReassigning}
          >
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.reassignButtonText}>
              {isReassigning
                ? translate("eld.unidentified.reassigning" as any)
                : translate("eld.unidentified.reassign" as any, {
                    count: selectedCount,
                    plural: selectedCount !== 1 ? "s" : "",
                  })}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  annotationCharCount: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    textAlign: "right",
  },
  annotationContainer: {
    marginBottom: 16,
  },
  annotationInput: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    marginBottom: 4,
    minHeight: 80,
    padding: 12,
    textAlignVertical: "top",
  },
  annotationLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
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
  checkboxEmpty: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    width: 24,
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
    marginBottom: 24,
  },
  infoBox: {
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  infoText: {
    color: colors.light?.textSecondary || colors.text,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  missingFieldsContainer: {
    marginTop: 4,
  },
  missingFieldsLabel: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  missingFieldsText: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 2,
  },
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  reassignButton: {
    backgroundColor: colors.tint,
  },
  reassignButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  reassignButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  recordCard: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 8,
    padding: 12,
  },
  recordCardSelected: {
    backgroundColor: "#F0F4FF",
    borderColor: colors.tint,
  },
  recordCheckbox: {
    justifyContent: "center",
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordLocation: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 11,
    marginTop: 4,
  },
  recordTime: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  recordType: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    marginBottom: 4,
  },
  recordsList: {
    flex: 1,
    marginBottom: 16,
  },
  recordsListContent: {
    paddingBottom: 8,
  },
  subtitle: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 14,
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 12,
  },
})
