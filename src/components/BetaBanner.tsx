/**
 * Beta Banner Component
 * 
 * Orange banner indicating the app is in beta
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { colors } from '@/theme/colors'

export const BetaBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>BETA</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})

