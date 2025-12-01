/**
 * History Fetch Sheet Component
 *
 * Manual history fetch UI with presets and custom date/time selector
 * Shows progress and allows pause/cancel/resume
 */

import React, { useState, useRef, useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native"
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Calendar, Clock, Play, Pause, X } from "lucide-react-native"

import { translate } from "@/i18n/translate"
import { eldHistoryService } from "@/services/eld-history-service"
import { useAppTheme } from "@/theme/context"

import { HistoryProgressIndicator } from "./HistoryProgressIndicator"
import { Text } from "./Text"

export interface HistoryFetchSheetProps {
  visible: boolean
  onDismiss: () => void
  onComplete?: (recordsCount: number) => void
}

const getPresets = () => [
  { label: translate("eld.history.last5Minutes" as any), minutes: 5 },
  { label: translate("eld.history.last30Minutes" as any), minutes: 30 },
  { label: translate("eld.history.last1Hour" as any), minutes: 60 },
  { label: translate("eld.history.last4Hours" as any), minutes: 240 },
  { label: translate("eld.history.last24Hours" as any), minutes: 1440 },
]

export const HistoryFetchSheet: React.FC<HistoryFetchSheetProps> = ({
  visible,
  onDismiss,
  onComplete,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const bottomSheetRef = useRef<BottomSheetModal>(null)

  // Safety check for theme colors
  if (!colors) {
    console.warn("⚠️ Theme colors not available in HistoryFetchSheet")
  }
  const [startDate, setStartDate] = useState(new Date(Date.now() - 4 * 60 * 60 * 1000)) // Default: 4 hours ago
  const [endDate, setEndDate] = useState(new Date())
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [recordsReceived, setRecordsReceived] = useState(0)
  const [fetchId, setFetchId] = useState<string | null>(null)

  const snapPoints = useMemo(() => ["80%"], [])

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present()
    } else {
      bottomSheetRef.current?.dismiss()
    }
  }, [visible])

  const handlePreset = (minutes: number) => {
    const end = new Date()
    const start = new Date(end.getTime() - minutes * 60 * 1000)
    setStartDate(start)
    setEndDate(end)
  }

  const handleFetch = async () => {
    if (isFetching) return

    setIsFetching(true)
    setCurrentChunk(0)
    setRecordsReceived(0)

    try {
      const id = `fetch-${Date.now()}`
      setFetchId(id)

      const result = await eldHistoryService.fetchHistory({
        type: 1,
        start: startDate,
        end: endDate,
        chunkSizeMinutes: 60,
        onProgress: (chunk, total) => {
          setCurrentChunk(
            chunk.status === "completed"
              ? total
              : chunk.status === "fetching"
                ? currentChunk + 1
                : currentChunk,
          )
          setTotalChunks(total)
        },
        onChunkComplete: (chunk, records) => {
          setRecordsReceived((prev) => prev + records.length)
        },
        onComplete: (allRecords) => {
          setIsFetching(false)
          setRecordsReceived(allRecords.length)
          onComplete?.(allRecords.length)
          setTimeout(() => {
            onDismiss()
          }, 2000)
        },
        onError: (error) => {
          console.error("History fetch error:", error)
          setIsFetching(false)
        },
      })

      setTotalChunks(result.totalChunks)
    } catch (error) {
      console.error("Failed to fetch history:", error)
      setIsFetching(false)
    }
  }

  const handleCancel = () => {
    if (fetchId) {
      eldHistoryService.cancelFetch(fetchId)
    }
    setIsFetching(false)
    setCurrentChunk(0)
    setTotalChunks(0)
    setRecordsReceived(0)
  }

  const handlePause = () => {
    // Pause functionality would need to be implemented in the service
    console.log("Pause - to be implemented")
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  )

  // Create dynamic styles based on theme
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignItems: "center" as const,
          borderRadius: 8,
          flex: 1,
          flexDirection: "row" as const,
          gap: 8,
          justifyContent: "center" as const,
          padding: 16,
        },
        buttonContainer: {
          flexDirection: "row" as const,
          gap: 12,
          marginTop: "auto",
        },
        cancelButton: {
          backgroundColor: "#DC2626",
        },
        cancelButtonSecondary: {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderWidth: 1,
        },
        cancelButtonSecondaryText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600" as const,
        },
        cancelButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "600" as const,
        },
        content: {
          flex: 1,
          padding: 24,
        },
        dateButton: {
          alignItems: "center" as const,
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row" as const,
          gap: 8,
          padding: 12,
        },
        dateField: {
          flex: 1,
        },
        dateLabel: {
          color: colors.textSecondary,
          fontSize: 12,
          marginBottom: 4,
        },
        dateRow: {
          flexDirection: "row" as const,
          gap: 12,
        },
        dateText: {
          color: colors.text,
          flex: 1,
          fontSize: 14,
        },
        fetchButton: {
          backgroundColor: colors.tint,
        },
        fetchButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "600" as const,
        },
        handleIndicator: {
          backgroundColor: colors.border,
        },
        modalBackground: {
          backgroundColor: colors.cardBackground,
        },
        pauseButton: {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderWidth: 1,
        },
        pauseButtonText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600" as const,
        },
        presetButton: {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          minWidth: "30%",
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        presetGrid: {
          flexDirection: "row" as const,
          flexWrap: "wrap" as const,
          gap: 8,
        },
        presetText: {
          color: colors.text,
          fontSize: 14,
          textAlign: "center" as const,
        },
        progressSection: {
          marginBottom: 24,
        },
        section: {
          marginBottom: 24,
        },
        sectionTitle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600" as const,
          marginBottom: 12,
        },
        title: {
          color: colors.text,
          fontSize: 24,
          fontWeight: "bold" as const,
          marginBottom: 24,
        },
      }),
    [colors],
  )

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isFetching}
      backgroundStyle={dynamicStyles.modalBackground}
      handleIndicatorStyle={dynamicStyles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={dynamicStyles.content}>
        <Text style={dynamicStyles.title}>{translate("eld.history.title" as any)}</Text>

        {/* Presets */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>
            {translate("eld.history.quickPresets" as any)}
          </Text>
          <View style={dynamicStyles.presetGrid}>
            {getPresets().map((preset) => (
              <TouchableOpacity
                key={preset.minutes}
                style={dynamicStyles.presetButton}
                onPress={() => handlePreset(preset.minutes)}
                disabled={isFetching}
              >
                <Text style={dynamicStyles.presetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Date Range */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>
            {translate("eld.history.customRange" as any)}
          </Text>

          <View style={dynamicStyles.dateRow}>
            <View style={dynamicStyles.dateField}>
              <Text style={dynamicStyles.dateLabel}>{translate("eld.history.start" as any)}</Text>
              <TouchableOpacity
                style={dynamicStyles.dateButton}
                onPress={() => setShowStartPicker(true)}
                disabled={isFetching}
              >
                <Calendar size={16} color={colors.tint} />
                <Text style={dynamicStyles.dateText}>{startDate.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.dateField}>
              <Text style={dynamicStyles.dateLabel}>{translate("eld.history.end" as any)}</Text>
              <TouchableOpacity
                style={dynamicStyles.dateButton}
                onPress={() => setShowEndPicker(true)}
                disabled={isFetching}
              >
                <Calendar size={16} color={colors.tint} />
                <Text style={dynamicStyles.dateText}>{endDate.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {Platform.OS !== "web" && (
            <>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartPicker(false)
                    if (date) setStartDate(date)
                  }}
                  maximumDate={endDate}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndPicker(false)
                    if (date) setEndDate(date)
                  }}
                  minimumDate={startDate}
                  maximumDate={new Date()}
                />
              )}
            </>
          )}
        </View>

        {/* Progress Indicator */}
        {isFetching && (
          <View style={dynamicStyles.progressSection}>
            <HistoryProgressIndicator
              stage="custom"
              currentChunk={currentChunk}
              totalChunks={totalChunks}
              recordsReceived={recordsReceived}
              onCancel={handleCancel}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={dynamicStyles.buttonContainer}>
          {isFetching ? (
            <>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.pauseButton]}
                onPress={handlePause}
              >
                <Pause size={20} color={colors.text} />
                <Text style={dynamicStyles.pauseButtonText}>
                  {translate("eld.history.pause" as any)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.cancelButton]}
                onPress={handleCancel}
              >
                <X size={20} color="#FFFFFF" />
                <Text style={dynamicStyles.cancelButtonText}>
                  {translate("eld.history.cancel" as any)}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.cancelButtonSecondary]}
                onPress={onDismiss}
              >
                <Text style={dynamicStyles.cancelButtonSecondaryText}>
                  {translate("common.cancel" as any)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.fetchButton]}
                onPress={handleFetch}
                disabled={startDate >= endDate}
              >
                <Play size={20} color="#FFFFFF" />
                <Text style={dynamicStyles.fetchButtonText}>
                  {translate("eld.history.fetchHistory" as any)}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}
