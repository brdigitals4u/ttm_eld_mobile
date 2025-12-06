import React, { useEffect, useRef } from "react"
import { View, StyleSheet, Animated } from "react-native"

import { useObdData } from "@/contexts"

const COLORS = {
  green: "#10B981", // ELD connected and working
  red: "#EF4444", // ELD disconnected or error
  sync: "#5750F1", // Syncing data to API
  border: "#E6E7FB",
}

export const EldIndicator: React.FC = () => {
  const { isConnected, isSyncing, obdData, awsSyncStatus } = useObdData()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  // Check if any sync is active (local or AWS)
  const isAnySyncing = isSyncing || awsSyncStatus === "syncing"

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
        ]),
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
        }),
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

  // Safety check: Ensure rotateAnim exists before interpolation
  // This prevents "Illegal node ID" errors from Animated.multiply
  const rotation = rotateAnim && rotateAnim.interpolate
    ? rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      })
    : "0deg" // Fallback value

  // Determine color based on state (prioritize errors)
  const getColor = () => {
    // Error states (highest priority)
    if (awsSyncStatus === "error") return COLORS.red
    if (!isConnected) return COLORS.red
    if (obdData.length === 0) return COLORS.red // No data received

    // Syncing states
    if (isSyncing || awsSyncStatus === "syncing") return COLORS.sync

    // Success state
    if (awsSyncStatus === "success") return COLORS.green

    // Default: connected and idle
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
          transform: [{ scale: pulseAnim }, { rotate: isAnySyncing ? rotation : "0deg" }],
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: color }]}>
        {/* Outer ring for AWS sync */}
        {showDualRing && <View style={[styles.syncRing, styles.outerRing]} />}
        {/* Inner ring for local sync */}
        {isSyncing && !awsSyncStatus && <View style={[styles.syncRing, styles.innerRing]} />}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 6,
    justifyContent: "center",
    width: 6,
  },
  indicator: {
    borderRadius: 6,
    elevation: 2,
    height: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 2,
  },
  innerRing: {
    height: 16,
    left: -2,
    opacity: 0.4,
    top: -2,
    width: 16,
  },
  outerRing: {
    height: 20,
    left: -4,
    opacity: 0.2,
    top: -4,
    width: 20,
  },
  syncRing: {
    borderColor: COLORS.sync,
    borderRadius: 8,
    borderWidth: 2,
    opacity: 0.3,
    position: "absolute",
  },
})
