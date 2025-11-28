/**
 * Orange DTC (Diagnostic Trouble Code) indicator icon
 * Shows count badge when active DTCs are present
 * Navigates to DTC history screen on press
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Text } from './Text'
import { useObdData } from '@/contexts/obd-data-context'
import { colors } from '@/theme/colors'
import { translate } from '@/i18n/translate'

const ORANGE_COLOR = '#FF9500' // Orange color for DTC indicator

export const DtcIndicator: React.FC = () => {
  const { recentMalfunctions } = useObdData()
  
  // Count DTC codes (each record now contains one code, so count = records.length)
  // But we sum codes.length for backward compatibility
  const activeDtcCount = recentMalfunctions.reduce((count, record) => {
    return count + record.codes.length
  }, 0)

  const handlePress = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
    // Navigate to DTC history screen
    router.push('/dtc-history' as any)
  }

  // Always show icon, but use different styling when no DTCs
  const hasActiveDtcs = activeDtcCount > 0
  const iconColor = hasActiveDtcs ? ORANGE_COLOR : colors.palette.neutral500 || '#6B7280'

  if (!hasActiveDtcs) {
    return null
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <AlertTriangle size={24} color={iconColor} strokeWidth={2} />
        {hasActiveDtcs && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {translate('dtc.badge' as any)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F1FA',
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: ORANGE_COLOR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
})

