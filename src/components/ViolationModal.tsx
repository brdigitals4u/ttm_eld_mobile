/**
 * Violation Modal Component
 * 
 * Full-screen bottom sheet for critical violations.
 * Cannot be dismissed - driver must acknowledge.
 */

import React, { useMemo, useRef, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native'
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { AlertTriangle } from 'lucide-react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useViolationNotifications, ActiveViolation } from '@/contexts/ViolationNotificationContext'
import { colors } from '@/theme/colors'

interface ViolationModalProps {
  violation: ActiveViolation
}

export const ViolationModal: React.FC<ViolationModalProps> = ({ violation }) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { removeViolation } = useViolationNotifications()

  // Auto-present when violation is set
  useEffect(() => {
    if (violation) {
      // Trigger haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        // Also trigger impact for stronger feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }

      // Show modal
      setTimeout(() => {
        bottomSheetRef.current?.present()
      }, 100)
    }
  }, [violation])

  const snapPoints = useMemo(() => ['90%'], [])

  const handleViewDetails = () => {
    bottomSheetRef.current?.dismiss()
    router.push('/violations' as any)
  }

  const handleOkay = () => {
    // Note: For critical violations, we don't remove them on "Okay"
    // They should remain until resolved by backend
    bottomSheetRef.current?.dismiss()
  }

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="none" // Cannot dismiss by tapping backdrop
      opacity={0.8}
    />
  )

  if (!violation) {
    return null
  }

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={false} // Cannot dismiss by dragging
      enableDismissOnClose={false}
      backgroundStyle={styles.modalBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={64} color="#FFFFFF" strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{violation.title}</Text>

        {/* Message */}
        <Text style={styles.message}>{violation.message}</Text>

        {/* Metadata Section */}
        {violation.metadata && (
          <View style={styles.metadataContainer}>
            {violation.metadata.remaining_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Time Remaining:</Text>
                <Text style={styles.metadataValue}>
                  {violation.metadata.remaining_minutes} minutes
                </Text>
              </View>
            )}
            {violation.metadata.used_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Time Used:</Text>
                <Text style={styles.metadataValue}>
                  {Math.floor(violation.metadata.used_minutes / 60)}h {violation.metadata.used_minutes % 60}m
                </Text>
              </View>
            )}
            {violation.metadata.limit_minutes !== undefined && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Limit:</Text>
                <Text style={styles.metadataValue}>
                  {Math.floor(violation.metadata.limit_minutes / 60)}h {violation.metadata.limit_minutes % 60}m
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.viewDetailsButton]}
            onPress={handleViewDetails}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.okayButton]}
            onPress={handleOkay}
          >
            <Text style={styles.okayButtonText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: '#DC2626', // Red background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  metadataContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  metadataValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  viewDetailsButton: {
    backgroundColor: '#FFFFFF',
  },
  viewDetailsButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  okayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  okayButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})

