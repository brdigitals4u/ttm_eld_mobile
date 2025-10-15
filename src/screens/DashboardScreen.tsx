import React, { useMemo } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { RefreshCw, Link as LinkIcon } from "lucide-react-native"

import { useAuth } from "@/stores/authStore"
import { useStatus, useObdData } from "@/contexts"
import { EldIndicator } from "@/components/EldIndicator"

const __DEV__ = process.env.NODE_ENV === 'development'

export const DashboardScreen = () => {
  const {
    user,
    driverProfile,
    hosStatus,
    vehicleAssignment,
    organizationSettings,
    isAuthenticated,
    isLoading,
  } = useAuth()
  const { logEntries, certification } = useStatus()
  const { obdData, isConnected, isSyncing, awsSyncStatus, lastUpdate } = useObdData()

  const data = useMemo(() => {
    if (!isAuthenticated || !user || !driverProfile || !hosStatus) {
      return {
        appTitle: "TTM Konnect",
        connected: false,
        driver: "Loading...",
        coDriver: "N/A",
        truck: "N/A",
        trailer: "N/A",
        duty: "OFF_DUTY",
        cycleLabel: "USA 70 hours / 8 days",
        stopIn: 0,
        driveLeft: 0,
        shiftLeft: 0,
        cycleLeft: 0,
        cycleDays: 0,
        dateTitle: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        vehicleUnit: "N/A",
      }
    }

    // Extract HOS time data
    const drivingTimeRemaining =
      hosStatus.driving_time_remaining || hosStatus.time_remaining?.driving_time_remaining || 0
    const onDutyTimeRemaining =
      hosStatus.on_duty_time_remaining || hosStatus.time_remaining?.on_duty_time_remaining || 0
    const cycleTimeRemaining =
      hosStatus.cycle_time_remaining || hosStatus.time_remaining?.cycle_time_remaining || 0

    // Calculate cycle days (assuming 70-hour cycle)
    const cycleDays = Math.ceil(cycleTimeRemaining / (24 * 60))

    // Get vehicle info
    const vehicleInfo = vehicleAssignment?.vehicle_info
    const vehicleUnit = vehicleInfo?.vehicle_unit || "N/A"
    const truck = vehicleInfo?.make || "N/A"
    const trailer = vehicleInfo?.model || "N/A"

    // Get current date
    const currentDate = new Date()
    const dateTitle = `Today | ${currentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    })}`

    // Get organization name for app title
    const orgName = organizationSettings?.organization_name || "TTM Konnect"

    // Count uncertified logs
    const uncertifiedLogsCount = logEntries.filter(log => !log.isCertified).length
    
    // Debug logging
    console.log("📊 DashboardScreen Debug:")
    console.log("  📋 Total logEntries:", logEntries.length)
    console.log("  ❌ Uncertified logs:", uncertifiedLogsCount)
    console.log("  📝 First few log dates:", logEntries.slice(0, 3).map(log => new Date(log.startTime).toDateString()))

    return {
      appTitle: orgName,
      connected: true, // Assume connected if we have data
      driver: `${user.firstName} ${user.lastName}`,
      coDriver: "N/A", // Not available in current data structure
      truck: vehicleUnit,
      trailer: "N/A", // Not available in current data structure
      duty: hosStatus.current_status || "OFF_DUTY",
      cycleLabel: "USA 70 hours / 8 days",
      stopIn: onDutyTimeRemaining, // Using on-duty time as stop-in time
      driveLeft: drivingTimeRemaining,
      shiftLeft: onDutyTimeRemaining,
      cycleLeft: cycleTimeRemaining,
      cycleDays: cycleDays,
      dateTitle: dateTitle,
      vehicleUnit: vehicleUnit,
      uncertifiedLogsCount: uncertifiedLogsCount,
      isCertified: certification.isCertified,
    }
  }, [user, driverProfile, hosStatus, vehicleAssignment, organizationSettings, isAuthenticated, logEntries, certification])

  const time = (m: number) =>
    `${String(Math.floor(Math.round(m) / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`
  const cycleTime = (m: number) => `${Math.floor(Math.round(m) / 60)}:${String(Math.round(m) % 60).padStart(2, "0")}`
  const pct = (remain: number, total: number) =>
    Math.max(0, Math.min(100, ((total - remain) / total) * 100))

  // Helper function to get duty status styling
  const getDutyStatusStyle = (status: string) => {
    const normalizedStatus = status.toUpperCase()
    switch (normalizedStatus) {
      case "DRIVING":
        return { backgroundColor: "#FFF4DC", borderColor: "#F59E0B", textColor: "#B45309" }
      case "ON_DUTY":
      case "ON-DUTY":
        return { backgroundColor: "#EFF6FF", borderColor: "#3B82F6", textColor: "#1E40AF" }
      case "OFF_DUTY":
      case "OFF-DUTY":
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
      case "SLEEPER":
        return { backgroundColor: "#FEF3C7", borderColor: "#D97706", textColor: "#92400E" }
      default:
        return { backgroundColor: "#F3F4F6", borderColor: "#6B7280", textColor: "#374151" }
    }
  }

  const dutyStyle = getDutyStatusStyle(data.duty)

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.cc}>
        <View style={s.headerRow}>
          <Text style={s.appTitle}>TTM Konnect</Text>
        </View>
        <View style={s.card}>
          <Text style={s.driverName}>Loading dashboard...</Text>
        </View>
      </ScrollView>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.cc}>
        <View style={s.headerRow}>
          <Text style={s.appTitle}>TTM Konnect</Text>
        </View>
        <View style={s.card}>
          <Text style={s.driverName}>Please log in to view dashboard</Text>
          <TouchableOpacity
            style={[s.signBtn, { marginTop: 16 }]}
            onPress={() => router.push("/login")}
          >
            <Text style={s.signText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.cc}>
      <View style={s.headerRow}>
        <Text style={s.appTitle}>{data.appTitle}</Text>
        <View style={s.headerIcons}>
          <EldIndicator />
        </View>
      </View>

      <View style={s.card}>
        <View style={[s.connectedBar, data.connected ? s.connected : s.disconnected]}>
          <Text style={[s.connectedText, data.connected ? s.connectedTextOn : s.connectedTextOff]}>
            {data.connected ? "CONNECTED" : "DISCONNECTED"}
          </Text>
        </View>

        <View style={s.driverRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>{data.driver}</Text>
            <Text style={s.meta}>Co-Driver: {data.coDriver}</Text>
            <Text style={s.meta}>
              Truck: {data.truck} Trailer: {data.trailer}
            </Text>
          </View>
          <TouchableOpacity style={s.smallFab} onPress={() => router.push("/status")}>
            <RefreshCw size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.dutyRow}>
          <Text style={s.dutyLabel}>Duty Status</Text>
          <View
            style={[
              s.dutyPill,
              { backgroundColor: dutyStyle.backgroundColor, borderColor: dutyStyle.borderColor },
            ]}
          >
            <Text style={[s.dutyText, { color: dutyStyle.textColor }]}>{data.duty}</Text>
          </View>
        </View>

        {/* Certification Status */}
        <View style={s.certificationRow}>
          <Text style={s.certificationLabel}>Logs Status</Text>
          <View style={[s.certificationPill, data.isCertified ? s.certified : s.uncertified]}>
            <Text style={[s.certificationText, data.isCertified ? s.certifiedText : s.uncertifiedText]}>
              {data.isCertified ? 'CERTIFIED' : `${data.uncertifiedLogsCount} UNCERTIFIED`}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <View style={s.cycleHeader}>
          <Text style={s.flag}>🇺🇸</Text>
          <Text style={s.cycleHeaderText}>{data.cycleLabel}</Text>
        </View>

        <View style={s.timersRow}>
          <View style={s.timerCol}>
            <Text style={s.timerValue}>{time(data.driveLeft)}</Text>
            <Text style={s.timerLabel}>Drive Left</Text>
            <View style={s.bar}>
              <View style={[s.fillGreen, { width: `${pct(data.driveLeft, 660)}%` }]} />
            </View>
          </View>

          <View style={s.centerCircle}>
            <Text style={s.centerTime}>{time(data.stopIn)}</Text>
            <Text style={s.centerLabel}>Stop In</Text>
          </View>

          <View style={s.timerCol}>
            <Text style={s.timerValue}>{time(data.shiftLeft)}</Text>
            <Text style={s.timerLabel}>Shift Left</Text>
            <View style={s.bar}>
              <View style={[s.fillGreen, { width: `${pct(data.shiftLeft, 840)}%` }]} />
            </View>
          </View>
        </View>

        <View style={s.cycleRow}>
          <Text style={s.cycleLeft}>Cycle Left</Text>
          <Text style={s.cycleRight}>
            {cycleTime(data.cycleLeft)} ({data.cycleDays} Days)
          </Text>
        </View>
        <View style={s.bar}>
          <View style={[s.fillGreen, { width: `${pct(data.cycleLeft, 4200)}%` }]} />
        </View>
      </View>

      <View style={s.card}>
        <View style={s.logsHeader}>
          <Text style={s.logsTitle}>{data.dateTitle}</Text>
          <TouchableOpacity style={s.signBtn} onPress={() => router.push("/(tabs)/logs")}>
            <Text style={s.signText}>Sign</Text>
          </TouchableOpacity>
        </View>

        <View style={s.chart}>
          <View style={s.lane}>
            <View style={[s.blockBlue, { left: "6%", width: "42%" }]} />
          </View>
          <View style={s.lane} />
          <View style={s.lane}>
            <View style={[s.blockBlue, { left: "36%", width: "50%" }]} />
          </View>
          <View style={s.lane}>
            <View style={[s.blockBlue, { left: "82%", width: "14%" }]} />
          </View>
          <View style={s.axis} />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionLabel}>Vehicle Information</Text>
        <Text style={s.vehicleValue}>{data.vehicleUnit}</Text>
      </View>

      {/* Debug OBD Data Status */}
      {__DEV__ && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>OBD Data Debug (Dev Mode)</Text>
          <Text style={s.debugText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
          <Text style={s.debugText}>Data Count: {obdData.length}</Text>
          <Text style={s.debugText}>Syncing: {isSyncing ? 'Yes' : 'No'}</Text>
          <Text style={s.debugText}>AWS Status: {awsSyncStatus}</Text>
          <Text style={s.debugText}>Last Update: {lastUpdate?.toLocaleTimeString() || 'Never'}</Text>
          {obdData.length > 0 && (
            <View style={s.debugDataContainer}>
              <Text style={s.debugText}>Recent Data:</Text>
              {obdData.slice(0, 3).map((item, index) => (
                <Text key={index} style={s.debugDataText}>
                  {item.name}: {item.value} {item.unit}
                </Text>
              ))}
            </View>
          )}
          
          {/* Debug Buttons */}
          <View style={s.debugButtonContainer}>
            <TouchableOpacity 
              style={s.debugButton}
              onPress={async () => {
                console.log('🧪 Testing AWS API...')
                try {
                  const { awsApiService } = await import('@/services/AwsApiService')
                  const result = await awsApiService.testAwsApi()
                  console.log('🧪 AWS Test Result:', result)
                  alert(`AWS Test: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.error || 'No error'}`)
                } catch (error) {
                  console.error('🧪 AWS Test Error:', error)
                  alert(`AWS Test Error: ${error}`)
                }
              }}
            >
              <Text style={s.debugButtonText}>Test AWS API</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={s.debugButton}
              onPress={() => {
                console.log('🔍 Checking AWS Config...')
                const { awsConfig } = require('@/config/aws-config')
                console.log('🔍 AWS Config:', awsConfig)
                alert(`AWS Sync: ${awsConfig.features.enableAwsSync ? 'ENABLED' : 'DISABLED'}\nLocal Sync: ${awsConfig.features.enableLocalSync ? 'ENABLED' : 'DISABLED'}`)
              }}
            >
              <Text style={s.debugButtonText}>Check Config</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.debugButtonContainer}>
            <TouchableOpacity 
              style={s.debugButton}
              onPress={async () => {
                console.log('🔧 Manually starting OBD reporting...')
                try {
                  const JMBluetoothService = (await import('@/services/JMBluetoothService')).default
                  
                  console.log('🔧 Starting OBD data reporting...')
                  const obdResult = await JMBluetoothService.startReportObdData()
                  console.log('✅ OBD reporting started:', obdResult)
                  
                  console.log('🔧 Configuring OBD PIDs...')
                  const pidResult = await JMBluetoothService.configureAllPIDs()
                  console.log('✅ OBD PIDs configured:', pidResult)
                  
                  alert(`OBD Setup Complete!\nReporting: ${obdResult ? 'SUCCESS' : 'FAILED'}\nPIDs: ${pidResult ? 'SUCCESS' : 'FAILED'}`)
                } catch (error) {
                  console.error('❌ Manual OBD setup failed:', error)
                  alert(`OBD Setup Failed: ${error}`)
                }
              }}
            >
              <Text style={s.debugButtonText}>Start OBD</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={s.debugButton}
              onPress={async () => {
                console.log('🔍 Checking connection status...')
                try {
                  const JMBluetoothService = (await import('@/services/JMBluetoothService')).default
                  const status = await JMBluetoothService.getConnectionStatus()
                  console.log('🔍 Current status:', status)
                  alert(`Connection: ${status.isConnected ? 'CONNECTED' : 'DISCONNECTED'}\nDevice: ${status.currentDevice || 'None'}\nBLE: ${status.isBluetoothEnabled ? 'ON' : 'OFF'}`)
                } catch (error) {
                  console.error('❌ Status check failed:', error)
                  alert(`Status Check Failed: ${error}`)
                }
              }}
            >
              <Text style={s.debugButtonText}>Check Status</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.debugButtonContainer}>
            <TouchableOpacity 
              style={s.debugButton}
              onPress={async () => {
                console.log('🧪 Testing AWS sync with sample data...')
                try {
                  const { awsApiService } = await import('@/services/AwsApiService')
                  
                  // Create sample OBD data
                  const sampleData = [
                    {
                      vehicleId: 'TEST_VEHICLE_001',
                      driverId: '75b6071c-e792-4cb5-8c83-1e518464c4d1',
                      timestamp: Date.now(),
                      dataType: 'engine_data',
                      latitude: 34.381824,
                      longitude: -117.388832,
                      gpsSpeed: 0,
                      gpsTime: new Date().toISOString(),
                      gpsRotation: 0,
                      eventTime: new Date().toISOString(),
                      eventType: 0,
                      eventId: 999,
                      isLiveEvent: 1,
                      engineSpeed: 1200,
                      vehicleSpeed: 0,
                      coolantTemp: 85,
                      fuelLevel: 75,
                      batteryVoltage: 14.2,
                      odometer: 123456,
                      allData: [
                        {
                          id: 'test_pid',
                          name: 'Test Engine Speed',
                          value: '1200',
                          unit: 'rpm'
                        }
                      ]
                    }
                  ]
                  
                  const result = await awsApiService.saveObdDataBatch(sampleData)
                  console.log('🧪 AWS Batch Test Result:', result)
                  alert(`AWS Batch Test: ${result.success ? 'SUCCESS' : 'FAILED'}\n${result.error || 'No error'}`)
                } catch (error) {
                  console.error('🧪 AWS Batch Test Error:', error)
                  alert(`AWS Batch Test Error: ${error}`)
                }
              }}
            >
              <Text style={s.debugButtonText}>Test AWS Batch</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.debugButtonContainer}>
            <TouchableOpacity 
              style={s.debugButton}
              onPress={async () => {
                console.log('🔍 Checking OBD reporting status...')
                try {
                  const JMBluetoothService = (await import('@/services/JMBluetoothService')).default
                  
                  // Check if OBD reporting is active
                  const status = await JMBluetoothService.getConnectionStatus()
                  console.log('🔍 OBD Status Check:', status)
                  
                  // Try to get OBD reporting status (if available)
                  let obdStatus = 'Unknown'
                  try {
                    // This might not be available in all versions
                    obdStatus = await JMBluetoothService.getObdReportingStatus?.() || 'Method not available'
                  } catch (e) {
                    obdStatus = 'Method not available'
                  }
                  
                  alert(`Connection: ${status.isConnected ? 'CONNECTED' : 'DISCONNECTED'}\nDevice: ${status.currentDevice || 'None'}\nOBD Status: ${obdStatus}`)
                } catch (error) {
                  console.error('❌ OBD status check failed:', error)
                  alert(`OBD Status Check Failed: ${error}`)
                }
              }}
            >
              <Text style={s.debugButtonText}>Check OBD Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  appTitle: { color: "#0A2A4E", fontSize: 20, fontWeight: "800" },
  axis: { backgroundColor: "#E5E7EB", height: 1, marginTop: 12 },
  bar: {
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    height: 10,
    marginTop: 10,
    overflow: "hidden",
    width: "100%",
  },
  blockBlue: {
    backgroundColor: "#327BFF",
    borderRadius: 6,
    bottom: 3,
    position: "absolute",
    top: 3,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6E9EF",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    gap: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  cc: { gap: 16, padding: 16, paddingTop: 24 },
  centerCircle: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#16A34A",
    borderRadius: 110,
    borderWidth: 10,
    height: 190,
    justifyContent: "center",
    marginHorizontal: 10,
    width: 190,
  },
  centerLabel: { color: "#6B7280", fontSize: 16, marginTop: 2 },
  centerTime: { color: "#0F172A", fontSize: 40, fontWeight: "900" },
  chart: { gap: 10, marginTop: 12 },
  connected: { backgroundColor: "#DFF6E7" },

  connectedBar: {
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    width: "100%",
  },
  connectedText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.4 },
  connectedTextOff: { color: "#B8860B" },
  connectedTextOn: { color: "#1E7E34" },

  cycleHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  cycleHeaderText: { color: "#5B6475", fontSize: 14, fontWeight: "600" },
  cycleLeft: { color: "#6B7280", fontSize: 14 },
  cycleRight: { color: "#0F172A", fontSize: 16, fontWeight: "800" },

  cycleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  disconnected: { backgroundColor: "#FFF1CC" },
  driverName: { color: "#111827", fontSize: 18, fontWeight: "800" },

  driverRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  dutyLabel: { color: "#6B7280", fontSize: 13 },
  dutyPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  dutyRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dutyText: { fontSize: 12, fontWeight: "900" },

  // Certification styles
  certificationRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  certificationLabel: { color: "#6B7280", fontSize: 13 },
  certificationPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  certificationText: { fontSize: 12, fontWeight: "900" },
  certified: { backgroundColor: "#DFF6E7", borderColor: "#16A34A" },
  certifiedText: { color: "#15803D" },
  uncertified: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
  uncertifiedText: { color: "#B45309" },
  fillGreen: { backgroundColor: "#16A34A", borderRadius: 5, height: "100%" },
  flag: { fontSize: 16 },

  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerIcons: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
  },
  headerIconButton: {
    padding: 4,
  },
  lane: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    overflow: "hidden",
  },

  logsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  logsTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  meta: { color: "#6B7280", fontSize: 13, marginTop: 2 },

  screen: { backgroundColor: "#F3F5F9", flex: 1, marginTop: 45, paddingBottom: 20 },
  sectionLabel: { color: "#6B7280", fontSize: 15, fontWeight: "600" },
  signBtn: {
    backgroundColor: "#0A7BFF",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  signText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  smallFab: {
    alignItems: "center",
    backgroundColor: "#0A7BFF",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  timerCol: { alignItems: "center", flex: 1 },
  timerLabel: { color: "#6B7280", fontSize: 13, marginTop: 2 },
  timerValue: { color: "#0F172A", fontSize: 20, fontWeight: "800" },

  timersRow: { alignItems: "center", flexDirection: "row", marginTop: 4 },
  vehicleValue: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 6 },
  
  // Debug styles
  debugText: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  debugDataContainer: { marginTop: 8, paddingLeft: 8 },
  debugDataText: { color: "#374151", fontSize: 11, marginTop: 1 },
  debugButtonContainer: { 
    flexDirection: "row", 
    gap: 8, 
    marginTop: 12 
  },
  debugButton: {
    backgroundColor: "#5750F1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
})
