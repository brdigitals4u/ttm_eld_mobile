/**
 * Live Vehicle Data Component
 * 
 * Displays real-time ELD data including speed, fuel level, and auto-duty status changes
 */

import React from "react"
import { View, StyleSheet } from "react-native"
import { Clock, Truck, AlertCircle } from "lucide-react-native"
import { Text } from "@/components/Text"
import { SpeedGauge } from "@/components/SpeedGauge"
import { FuelLevelIndicator } from "@/components/FuelLevelIndicator"
import { colors } from "@/theme/colors"
import { AutoDutyChange } from "@/contexts/obd-data-context"

interface LiveVehicleDataProps {
  eldConnected: boolean
  obdData: Array<{ name: string; value: string }>
  currentSpeed: number
  fuelLevel: number
  recentAutoDutyChanges?: AutoDutyChange[]
}

export const LiveVehicleData: React.FC<LiveVehicleDataProps> = ({
  eldConnected,
  obdData,
  currentSpeed,
  fuelLevel,
  recentAutoDutyChanges = [],
}) => {
  if (!eldConnected) {
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Vehicle Data</Text>
        <View style={styles.eldStatusBadge}>
          <View style={styles.eldStatusDot} />
          <Text style={styles.eldStatusText}>ELD Connected</Text>
        </View>
      </View>

      {obdData.length === 0 ? (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataText}>Waiting for OBD data...</Text>
          <Text style={styles.noDataSubtext}>
            {eldConnected ? "ELD is connected but no data received yet" : "ELD not connected"}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.gaugesRow}>
            <View style={styles.gaugeCard}>
              <SpeedGauge speed={currentSpeed} unit="mph" maxSpeed={120} />
            </View>
            <View style={styles.gaugeCard}>
              <FuelLevelIndicator fuelLevel={fuelLevel} />
            </View>
          </View>

          {/* Auto-Duty Status Changes */}
          {recentAutoDutyChanges && recentAutoDutyChanges.length > 0 && (
            <View style={styles.autoDutyChangesCard}>
              <View style={styles.autoDutyChangesHeader}>
                <Clock size={16} color={colors.PRIMARY} strokeWidth={2} />
                <Text style={styles.autoDutyChangesTitle}>Auto Status Changes</Text>
              </View>
              <View style={styles.autoDutyChangesList}>
                {recentAutoDutyChanges.slice().reverse().map((change, index) => {
                  const changeTime = new Date(change.timestamp)
                  const timeAgo = Math.floor((Date.now() - changeTime.getTime()) / 1000)
                  const timeAgoText = timeAgo < 60 
                    ? `${timeAgo}s ago` 
                    : timeAgo < 3600 
                    ? `${Math.floor(timeAgo / 60)}m ago`
                    : `${Math.floor(timeAgo / 3600)}h ago`
                  
                  const isDrivingToOnDuty = change.old_status === 'driving' && change.new_status === 'on_duty'
                  const isOnDutyToDriving = change.old_status === 'on_duty' && change.new_status === 'driving'
                  
                  return (
                    <View key={`${change.seq}-${index}`} style={styles.autoDutyChangeItem}>
                      <View style={styles.autoDutyChangeLeft}>
                        {isDrivingToOnDuty && <AlertCircle size={14} color="#F59E0B" strokeWidth={2} />}
                        {isOnDutyToDriving && <Truck size={14} color="#22C55E" strokeWidth={2} />}
                        {!isDrivingToOnDuty && !isOnDutyToDriving && <Clock size={14} color={colors.PRIMARY} strokeWidth={2} />}
                        <View style={styles.autoDutyChangeText}>
                          <Text style={styles.autoDutyChangeStatus}>
                            {change.old_status.replace(/_/g, ' ').toUpperCase()} → {change.new_status.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                          {change.reason && (
                            <Text style={styles.autoDutyChangeReason}>{change.reason}</Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.autoDutyChangeTime}>{timeAgoText}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  eldStatusBadge: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eldStatusDot: {
    backgroundColor: "#10B981",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  eldStatusText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  noDataCard: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 24,
  },
  noDataText: {
    color: "#92400E",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  noDataSubtext: {
    color: "#B45309",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  gaugesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  gaugeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    elevation: 2,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  // Auto-Duty Changes
  autoDutyChangesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  autoDutyChangesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  autoDutyChangesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  autoDutyChangesList: {
    gap: 12,
  },
  autoDutyChangeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  autoDutyChangeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  autoDutyChangeText: {
    flex: 1,
    gap: 4,
  },
  autoDutyChangeStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  autoDutyChangeReason: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
  },
  autoDutyChangeTime: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
})

