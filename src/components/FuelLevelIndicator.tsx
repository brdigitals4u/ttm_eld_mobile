import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { Fuel } from "lucide-react-native"
import * as Progress from "react-native-progress"

interface FuelLevelIndicatorProps {
  fuelLevel: number // Fuel level in percentage (0-100)
}

export const FuelLevelIndicator: React.FC<FuelLevelIndicatorProps> = ({ fuelLevel }) => {
  const progress = Math.min(Math.max(fuelLevel / 100, 0), 1)
  const displayFuel = Math.round(fuelLevel)

  // Get color based on fuel level
  const getFuelColor = () => {
    if (fuelLevel > 50) return "#0071ce" // Primary blue (full)
    if (fuelLevel > 25) return "#F59E0B" // Orange (medium)
    return "#EF4444" // Red (low)
  }

  return (
    <View style={styles.container}>
      <View style={styles.gaugeContainer}>
        <Progress.Circle
          size={140}
          progress={progress}
          color={getFuelColor()}
          thickness={12}
          showsText={false}
          strokeCap="round"
          unfilledColor="#E5E7EB"
          borderWidth={0}
        />
        <View style={styles.fuelContent}>
          <View style={styles.iconContainer}>
            <Fuel size={24} color={getFuelColor()} strokeWidth={2.5} />
          </View>
          <Text style={[styles.fuelValue, { color: getFuelColor() }]}>{displayFuel}</Text>
          <Text style={styles.fuelUnit}>%</Text>
        </View>
      </View>
      <Text style={styles.label}>Fuel Level</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fuelContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  fuelUnit: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  fuelValue: {
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
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
})
