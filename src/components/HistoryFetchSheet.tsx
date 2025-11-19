/**
 * History Fetch Sheet Component
 * 
 * Manual history fetch UI with presets and custom date/time selector
 * Shows progress and allows pause/cancel/resume
 */

import React, { useState, useRef, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Calendar, Clock, Play, Pause, X } from 'lucide-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Text } from './Text'
import { colors } from '@/theme/colors'
import { eldHistoryService } from '@/services/eld-history-service'
import { HistoryProgressIndicator } from './HistoryProgressIndicator'
import { translate } from '@/i18n/translate'

export interface HistoryFetchSheetProps {
  visible: boolean
  onDismiss: () => void
  onComplete?: (recordsCount: number) => void
}

const getPresets = () => [
  { label: translate('eld.history.last5Minutes' as any), minutes: 5 },
  { label: translate('eld.history.last30Minutes' as any), minutes: 30 },
  { label: translate('eld.history.last1Hour' as any), minutes: 60 },
  { label: translate('eld.history.last4Hours' as any), minutes: 240 },
  { label: translate('eld.history.last24Hours' as any), minutes: 1440 },
]

export const HistoryFetchSheet: React.FC<HistoryFetchSheetProps> = ({
  visible,
  onDismiss,
  onComplete,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 4 * 60 * 60 * 1000)) // Default: 4 hours ago
  const [endDate, setEndDate] = useState(new Date())
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [recordsReceived, setRecordsReceived] = useState(0)
  const [fetchId, setFetchId] = useState<string | null>(null)

  const snapPoints = useMemo(() => ['80%'], [])

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
          setCurrentChunk(chunk.status === 'completed' ? total : chunk.status === 'fetching' ? currentChunk + 1 : currentChunk)
          setTotalChunks(total)
        },
        onChunkComplete: (chunk, records) => {
          setRecordsReceived(prev => prev + records.length)
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
          console.error('History fetch error:', error)
          setIsFetching(false)
        },
      })

      setTotalChunks(result.totalChunks)
    } catch (error) {
      console.error('Failed to fetch history:', error)
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
    console.log('Pause - to be implemented')
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.5}
    />
  )

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!isFetching}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{translate('eld.history.title' as any)}</Text>

        {/* Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate('eld.history.quickPresets' as any)}</Text>
          <View style={styles.presetGrid}>
            {getPresets().map((preset) => (
              <TouchableOpacity
                key={preset.minutes}
                style={styles.presetButton}
                onPress={() => handlePreset(preset.minutes)}
                disabled={isFetching}
              >
                <Text style={styles.presetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate('eld.history.customRange' as any)}</Text>
          
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{translate('eld.history.start' as any)}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
                disabled={isFetching}
              >
                <Calendar size={16} color={colors.tint} />
                <Text style={styles.dateText}>
                  {startDate.toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>{translate('eld.history.end' as any)}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
                disabled={isFetching}
              >
                <Calendar size={16} color={colors.tint} />
                <Text style={styles.dateText}>
                  {endDate.toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {Platform.OS !== 'web' && (
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
          <View style={styles.progressSection}>
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
        <View style={styles.buttonContainer}>
          {isFetching ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.pauseButton]}
                onPress={handlePause}
              >
                <Pause size={20} color={colors.text} />
                <Text style={styles.pauseButtonText}>{translate('eld.history.pause' as any)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <X size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>{translate('eld.history.cancel' as any)}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButtonSecondary]}
                onPress={onDismiss}
              >
                <Text style={styles.cancelButtonSecondaryText}>{translate('common.cancel' as any)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.fetchButton]}
                onPress={handleFetch}
                disabled={startDate >= endDate}
              >
                <Play size={20} color="#FFFFFF" />
                <Text style={styles.fetchButtonText}>{translate('eld.history.fetchHistory' as any)}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: colors.cardBackground,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '30%',
  },
  presetText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  progressSection: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  fetchButton: {
    backgroundColor: colors.tint,
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pauseButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
})

