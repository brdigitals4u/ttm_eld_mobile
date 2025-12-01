import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native"

import { handleData } from "../services/handleData"
import JMBluetoothService from "../services/JMBluetoothService"
import { VinData, ObdEldData } from "../types/JMBluetooth"
// Define OBDDataItem interface for display
interface OBDDataItem {
  id: string
  name: string
  value: string
  unit: string
  isError?: boolean
}

const ObdDataScreen: React.FC<any> = () => {
  const [isReporting, setIsReporting] = useState(false)
  const [vinData, setVinData] = useState<VinData | null>(null)
  const [dataReceived, setDataReceived] = useState(true)
  const [obdDisplayData, setObdDisplayData] = useState<OBDDataItem[]>([])
  const [errorData, setErrorData] = useState<OBDDataItem[]>([])

  // Button functions

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current

  // Extract gauge values from OBD data
  const getDataValue = (name: string): number => {
    const item = obdDisplayData.find((data) => data.name.toLowerCase().includes(name.toLowerCase()))
    const value = item ? parseFloat(item.value) : 0
    return isNaN(value) ? 0 : Math.max(0, value)
  }

  // Gauge data with proper fallbacks
  const speedKmh = getDataValue("Wheel-Based Vehicle Speed") || getDataValue("Vehicle Speed") || 0

  // Initialize OBD system
  const initializeObdSystem = React.useCallback(async () => {
    try {
      const isConnected = await JMBluetoothService.getConnectionStatus()
      if (!isConnected) {
        console.log("⚠️ Device not connected, retrying in 2 seconds...")
        setTimeout(initializeObdSystem, 2000)
        return
      }
      console.log("🔧 Device connected, starting OBD reporting...")
      await JMBluetoothService.startReportEldData()
      console.log("✅ OBD reporting started")
    } catch (error) {
      console.error("❌ Failed to start OBD reporting:", error)
      setTimeout(initializeObdSystem, 3000)
    }
  }, [])

  useEffect(() => {
    console.log("🚀 ObdDataScreen mounted - initializing OBD system...")

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    // Start OBD system after a delay
    setTimeout(initializeObdSystem, 3000)

    // Connection monitor
    const connectionMonitor = setInterval(async () => {
      try {
        const isConnected = await JMBluetoothService.getConnectionStatus()
        if (!isConnected && isReporting) {
          console.log("⚠️ Device disconnected, stopping reporting...")
          setIsReporting(false)
        } else if (isConnected && !isReporting) {
          console.log("🔄 Connection restored, restarting OBD reporting...")
          initializeObdSystem()
        }
      } catch (error) {
        console.error("❌ Connection monitor error:", error)
      }
    }, 5000)

    // Event listeners
    const obdEldDataListener = JMBluetoothService.addEventListener(
      "onObdEldDataReceived",
      (_data: ObdEldData) => {
        const displayDataFn = handleData(_data)
        setObdDisplayData(displayDataFn)
        setDataReceived(true)
        setIsReporting(true)
      },
    )

    const obdVinDataListener = JMBluetoothService.addEventListener(
      "onObdVinDataReceived",
      (data: any) => {
        console.log("📋 onObdVinDataReceived:", data)
        setVinData(data)
      },
    )

    const obdErrorDataListener = JMBluetoothService.addEventListener(
      "onObdErrorDataReceived",
      (data: any) => {
        console.log("📋 onObdErrorDataReceived:", data)
        const errorItems: OBDDataItem[] = []
        if (data.ecuList && Array.isArray(data.ecuList)) {
          data.ecuList.forEach((ecu: any, ecuIndex: number) => {
            if (ecu.errorCodeList && Array.isArray(ecu.errorCodeList)) {
              ecu.errorCodeList.forEach((errorCode: string, codeIndex: number) => {
                errorItems.push({
                  id: `error_${ecuIndex}_${codeIndex}`,
                  name: `ECU ${ecu.ecuId || ecuIndex}`,
                  value: errorCode,
                  unit: "",
                  isError: true,
                })
              })
            }
          })
        }
        setErrorData(errorItems)
      },
    )

    const disconnectedListener = JMBluetoothService.addEventListener("onDisconnected", () => {
      console.log("❌ Device disconnected")
      setIsReporting(false)
      setDataReceived(false)
    })

    // Cleanup
    return () => {
      clearInterval(connectionMonitor)
      JMBluetoothService.removeEventListener(obdEldDataListener)
      JMBluetoothService.removeEventListener(obdVinDataListener)
      JMBluetoothService.removeEventListener(obdErrorDataListener)
      JMBluetoothService.removeEventListener(disconnectedListener)
    }
  }, [initializeObdSystem, isReporting, fadeAnim, scaleAnim])

  // Render item for data list

  // Render item for error list

  return <View> data </View>
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    elevation: 3,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#161E28",
    fontSize: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  connectionDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  connectionStatus: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  connectionText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  container: {
    backgroundColor: "#f8f9fa",
    flex: 1,
  },
  dataItem: {
    borderBottomColor: "#F0F0F0",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dataName: {
    color: "#041032",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dataUnit: {
    color: "#041032",
    flex: 1,
    fontSize: 14,
  },
  dataUnitContainer: {
    alignItems: "center",
    flexDirection: "row",
  },
  dataUnitLabel: {
    color: "#828899",
    fontSize: 14,
    marginRight: 8,
  },
  dataValue: {
    color: "#041032",
    flex: 1,
    fontSize: 14,
  },
  dataValueContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 2,
  },
  dataValueLabel: {
    color: "#828899",
    fontSize: 14,
    marginRight: 8,
  },
  debugGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  debugItem: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    width: "50%",
  },
  debugSection: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bfdbfe",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 16,
  },
  debugTitle: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#E5E7EB",
    opacity: 0.7,
  },
  disabledButtonText: {
    color: "#6B7280",
  },
  errorItem: {
    backgroundColor: "#ffffff",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  errorSection: {
    backgroundColor: "#fef2f2",
    borderLeftColor: "#ef4444",
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 20,
    padding: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
  },
  errorTitle: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  gaugeLabel: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  gaugeValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  gaugeWrapper: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    flex: 1,
    marginHorizontal: 5,
    paddingHorizontal: 10,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerSubtitle: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  hiddenLabel: {
    fontSize: 1,
    opacity: 0,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE0E7",
    borderRadius: 6,
    borderWidth: 1,
    maxHeight: 1560,
  },
  mainGaugesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    color: "#161E28",
    fontSize: 20,
  },
  noDataContainer: {
    alignItems: "center",
    padding: 20,
  },
  noDataText: {
    color: "#828899",
    fontSize: 16,
    textAlign: "center",
  },
  premiumBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    right: -8,
    top: -8,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: "#161E28",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },

  smallGaugeLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },

  smallGaugeValue: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  smallGaugeWrapper: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    marginHorizontal: 2,
    paddingHorizontal: 5,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  smallGaugesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  statusContainer: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 16,
  },
  statusText: {
    color: "#828899",
    fontSize: 12,
    textAlign: "center",
  },
  testButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 25,
    elevation: 3,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: "#161E28",
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 16,
    textAlign: "center",
  },
  vinContainer: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  vinLabel: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  vinValue: {
    color: "#041032",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
})

export default ObdDataScreen
