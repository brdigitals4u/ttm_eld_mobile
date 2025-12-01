import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { Gauge } from "lucide-react-native"
import * as Progress from "react-native-progress"
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  useAnimatedProps,
} from "react-native-reanimated"

interface SpeedGaugeProps {
  speed: number // Speed in mph or km/h
  maxSpeed?: number // Maximum speed for gauge (default 120)
  unit?: "mph" | "km/h"
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({ speed, maxSpeed = 120, unit = "mph" }) => {
  const progress = Math.min(speed / maxSpeed, 1)
  const displaySpeed = Math.round(speed)

  // Get color based on speed - using primary brand color
  const getSpeedColor = () => {
    if (speed < 30) return "#22C55E" // Green
    if (speed < 60) return "#0071ce" // Primary blue
    if (speed < 80) return "#F59E0B" // Orange
    return "#EF4444" // Red
  }

  return (
    <View style={styles.container}>
      <View style={styles.gaugeContainer}>
        <Progress.Circle
          size={140}
          progress={progress}
          color={getSpeedColor()}
          thickness={12}
          showsText={false}
          strokeCap="round"
          unfilledColor="#E5E7EB"
          borderWidth={0}
        />
        <View style={styles.speedContent}>
          <View style={styles.iconContainer}>
            <Gauge size={24} color={getSpeedColor()} strokeWidth={2.5} />
          </View>
          <Text style={[styles.speedValue, { color: getSpeedColor() }]}>{displaySpeed}</Text>
          <Text style={styles.speedUnit}>{unit}</Text>
        </View>
      </View>
      <Text style={styles.label}>Current Speed</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },
  speedContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  speedUnit: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  speedValue: {
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
})
