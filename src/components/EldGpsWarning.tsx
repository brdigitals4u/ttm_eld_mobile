/**
 * ELD GPS Warning Component
 * 
 * Banner that appears when GPS is lost for >60 minutes while driving
 * Provides quick diagnostic actions and note-taking
 */

import React, { useState, useRef, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native'
import { AlertTriangle, MapPin, RefreshCw, FileText } from 'lucide-react-native'
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import * as Location from 'expo-location'
import { Text } from './Text'
import { colors } from '@/theme/colors'
import { translate } from '@/i18n/translate'

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
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  const snapPoints = useMemo(() => ['60%'], [])

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
    if (status !== 'granted') {
      // Request permission
      await Location.requestForegroundPermissionsAsync()
    }

    // Try to get current location
    try {
      await Location.getCurrentPositionAsync({})
      // If successful, GPS is working
      onDismiss?.()
    } catch (error) {
      console.warn('GPS still not available:', error)
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
      setNote('')
      setShowNoteInput(false)
    }
  }

  const handleManualLocation = () => {
    // Open manual location capture (would need to be implemented)
    console.log('Manual location capture - to be implemented')
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.5}
    />
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
        <Text style={styles.bannerText}>{translate('eld.gpsWarning.bannerText' as any)}</Text>
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
            <Text style={styles.title}>{translate('eld.gpsWarning.title' as any)}</Text>
            <Text style={styles.subtitle}>
              {translate('eld.gpsWarning.duration' as any, { minutes: Math.round(durationMinutes) })}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDiagnose}>
              <MapPin size={20} color={colors.tint} />
              <Text style={styles.actionText}>{translate('eld.gpsWarning.checkPermission' as any)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleReconnect}>
              <RefreshCw size={20} color={colors.tint} />
              <Text style={styles.actionText}>{translate('eld.gpsWarning.reconnect' as any)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleManualLocation}>
              <MapPin size={20} color={colors.tint} />
              <Text style={styles.actionText}>{translate('eld.gpsWarning.markLocation' as any)}</Text>
            </TouchableOpacity>
          </View>

          {/* Note Section */}
          {!showNoteInput ? (
            <TouchableOpacity style={styles.noteButton} onPress={handleAddNote}>
              <FileText size={20} color={colors.tint} />
              <Text style={styles.noteButtonText}>{translate('eld.gpsWarning.addNote' as any)}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noteInputContainer}>
              <Text style={styles.noteLabel}>{translate('eld.gpsWarning.noteLabel' as any)}</Text>
              <View style={styles.noteInputRow}>
                <TextInput
                  style={styles.noteInput}
                  multiline
                  value={note}
                  onChangeText={setNote}
                  placeholder={translate('eld.gpsWarning.notePlaceholder' as any)}
                  placeholderTextColor={colors.light?.textSecondary || colors.text}
                />
              </View>
              <View style={styles.noteActions}>
                <TouchableOpacity
                  style={[styles.noteActionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowNoteInput(false)
                    setNote('')
                  }}
                >
                  <Text style={styles.cancelButtonText}>{translate('common.cancel' as any)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.noteActionButton, styles.saveButton]}
                  onPress={handleSaveNote}
                >
                  <Text style={styles.saveButtonText}>{translate('eld.gpsWarning.saveNote' as any)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>{translate('eld.gpsWarning.acknowledge' as any)}</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  bannerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.light?.textSecondary || colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    marginBottom: 24,
  },
  noteButtonText: {
    fontSize: 16,
    color: colors.tint,
    flex: 1,
  },
  noteInputContainer: {
    marginBottom: 24,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  noteInputRow: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    padding: 12,
  },
  noteInput: {
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  noteActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.tint,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: colors.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
})

