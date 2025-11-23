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

const ORANGE_COLOR = '#FF9500' // Orange color for DTC indicator

export const DtcIndicator: React.FC = () => {
  const { recentMalfunctions } = useObdData()
  
  // Count unique DTC codes (one malfunction record can have multiple codes)
  const activeDtcCount = recentMalfunctions.reduce((count, record) => {
    return count + record.codes.length
  }, 0)

  const handlePress = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
    // Navigate to DTC history screen
    router.push('/dtc-history' as any)
  }

  // Only show if there are active DTCs
  if (activeDtcCount === 0) {
    return null
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <AlertTriangle size={24} color={ORANGE_COLOR} strokeWidth={2} />
        {activeDtcCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {activeDtcCount > 99 ? '99+' : activeDtcCount}
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

