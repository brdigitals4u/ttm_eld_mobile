/**
 * Mandatory Setup Screen
 * 
 * Full-screen overlay that blocks HOS/ELD features until
 * vehicle and trip are assigned.
 */

import React from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { AlertTriangle, Truck, Package } from 'lucide-react-native'
import { translate } from '@/i18n/translate'
import { colors } from '@/theme/colors'

interface MandatorySetupScreenProps {
  hasVehicle: boolean
  hasTrip: boolean
  onContactManager?: () => void
}

export const MandatorySetupScreen: React.FC<MandatorySetupScreenProps> = ({
  hasVehicle,
  hasTrip,
  onContactManager,
}) => {
  const missingItems = []
  if (!hasVehicle) missingItems.push('vehicle')
  if (!hasTrip) missingItems.push('trip')

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={64} color="#F97316" strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {translate('vehicleTrip.mandatorySetup' as any)}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {translate('vehicleTrip.mandatoryMessage' as any)}
        </Text>

        {/* Missing Items */}
        <View style={styles.missingContainer}>
          {!hasVehicle && (
            <View style={styles.missingItem}>
              <Truck size={24} color="#EF4444" />
              <View style={styles.missingTextContainer}>
                <Text style={styles.missingTitle}>
                  {translate('vehicleTrip.vehicleRequired' as any)}
                </Text>
                <Text style={styles.missingSubtitle}>
                  {translate('vehicleTrip.vehicleMissing' as any)}
                </Text>
              </View>
            </View>
          )}

          {!hasTrip && (
            <View style={styles.missingItem}>
              <Package size={24} color="#EF4444" />
              <View style={styles.missingTextContainer}>
                <Text style={styles.missingTitle}>
                  {translate('vehicleTrip.tripRequired' as any)}
                </Text>
                <Text style={styles.missingSubtitle}>
                  {translate('vehicleTrip.tripMissing' as any)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Contact Manager Button */}
        {onContactManager && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={onContactManager}
          >
            <Text style={styles.contactButtonText}>
              {translate('vehicleTrip.contactManager' as any)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Text */}
        <Text style={styles.infoText}>
          {translate('vehicleTrip.contactManager' as any)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  missingContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  missingTextContainer: {
    flex: 1,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  missingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  contactButton: {
    backgroundColor: colors.PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
})

