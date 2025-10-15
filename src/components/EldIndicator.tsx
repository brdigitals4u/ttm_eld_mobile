import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { useObdData } from '@/contexts'

const COLORS = {
  green: '#10B981',    // ELD connected and working
  red: '#EF4444',      // ELD disconnected or error
  sync: '#5750F1',     // Syncing data to API
  border: '#E6E7FB',
}

export const EldIndicator: React.FC = () => {
  const { isConnected, isSyncing, obdData, awsSyncStatus, lastUpdate } = useObdData()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  // Check if any sync is active (local or AWS)
  const isAnySyncing = isSyncing || awsSyncStatus === 'syncing'

  // Pulse animation for syncing state
  useEffect(() => {
    if (isAnySyncing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => {
        pulse.stop()
      }
    } else {
      pulseAnim.setValue(1)
      return undefined
    }
  }, [isAnySyncing, pulseAnim])

  // Rotation animation for syncing state
  useEffect(() => {
    if (isAnySyncing) {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      )
      rotate.start()
      return () => {
        rotate.stop()
        rotateAnim.setValue(0)
      }
    } else {
      return undefined
    }
  }, [isAnySyncing, rotateAnim])

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Determine color based on state (prioritize errors)
  const getColor = () => {
    const debugInfo = {
      isConnected,
      obdDataLength: obdData.length,
      isSyncing,
      awsSyncStatus,
      lastUpdate: lastUpdate?.toISOString(),
      timestamp: new Date().toISOString()
    }
    
    console.log('🔍 EldIndicator Debug:', debugInfo)

    // Error states (highest priority)
    if (awsSyncStatus === 'error') {
      console.log('🔴 EldIndicator: RED - AWS sync error')
      return COLORS.red
    }
    if (!isConnected) {
      console.log('🔴 EldIndicator: RED - Not connected')
      return COLORS.red
    }
    
    // If connected but no data received yet, show blue (syncing/connecting)
    if (isConnected && obdData.length === 0) {
      console.log('🔵 EldIndicator: BLUE - Connected but no data')
      return COLORS.sync
    }
    
    // Syncing states
    if (isSyncing || awsSyncStatus === 'syncing') {
      console.log('🔵 EldIndicator: BLUE - Syncing in progress')
      return COLORS.sync
    }
    
    // Success state
    if (awsSyncStatus === 'success') {
      console.log('🟢 EldIndicator: GREEN - AWS sync success')
      return COLORS.green
    }
    
    // Default: connected and idle
    console.log('🟢 EldIndicator: GREEN - Connected and idle')
    return COLORS.green
  }

  const color = getColor()
  
  // Show dual-ring for dual sync mode
  const showDualRing = isAnySyncing

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: pulseAnim },
            { rotate: isAnySyncing ? rotation : '0deg' },
          ],
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: color }]}>
        {/* Outer ring for AWS sync */}
        {showDualRing && (
          <View style={[styles.syncRing, styles.outerRing]} />
        )}
        {/* Inner ring for local sync */}
        {isSyncing && !awsSyncStatus && (
          <View style={[styles.syncRing, styles.innerRing]} />
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  syncRing: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.sync,
    opacity: 0.3,
  },
  outerRing: {
    width: 20,
    height: 20,
    top: -4,
    left: -4,
    opacity: 0.2,
  },
  innerRing: {
    width: 16,
    height: 16,
    top: -2,
    left: -2,
    opacity: 0.4,
  },
})

