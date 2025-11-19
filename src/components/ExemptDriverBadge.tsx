/**
 * Exempt Driver Badge Component
 * 
 * Small indicator on dashboard showing exempt driver status
 * Opens bottom sheet with exempt driver details when clicked
 */

import React, { useRef, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Shield, Info, X } from 'lucide-react-native'
import { Text } from './Text'
import { colors } from '@/theme/colors'
import { useAuth } from '@/stores/authStore'
import { translate } from '@/i18n/translate'

export const ExemptDriverBadge: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const { driverProfile } = useAuth()

  const snapPoints = useMemo(() => ['50%'], [])

  const isExempt = driverProfile?.eld_exempt === true
  const exemptReason = driverProfile?.eld_exempt_reason || 'No reason provided'

  if (!isExempt) {
    return null // Don't show badge if driver is not exempt
  }

  const handlePress = () => {
    bottomSheetRef.current?.present()
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
    <>
      {/* Badge Indicator */}
      <TouchableOpacity
        style={styles.badge}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Shield size={16} color="#F59E0B" />
        <Text style={styles.badgeText}>{translate('eld.exempt.badge' as any)}</Text>
      </TouchableOpacity>

      {/* Details Bottom Sheet */}
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
            <View style={styles.iconContainer}>
              <Shield size={32} color="#F59E0B" />
            </View>
            <Text style={styles.title}>{translate('eld.exempt.title' as any)}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => bottomSheetRef.current?.dismiss()}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Info size={20} color={colors.tint} />
            <Text style={styles.infoText}>
              {translate('eld.exempt.info' as any)}
            </Text>
          </View>

          {/* Exempt Reason */}
          {exemptReason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>{translate('eld.exempt.exemptionReason' as any)}</Text>
              <Text style={styles.reasonText}>{exemptReason}</Text>
            </View>
          )}

          {/* Exempt Status Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate('eld.exempt.exemptStatus' as any)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{translate('eld.exempt.active' as any)}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate('eld.exempt.eldRecording' as any)}</Text>
              <Text style={styles.detailValue}>{translate('eld.exempt.stillActive' as any)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{translate('eld.exempt.diagnostics' as any)}</Text>
              <Text style={styles.detailValue}>{translate('eld.exempt.suspended' as any)}</Text>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              {translate('eld.exempt.note' as any)}
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F4FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reasonContainer: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
})

