import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { Bluetooth, Radio, Signal, CheckCircle, X, Search, AlertCircle } from "lucide-react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { EldConnectionModal } from "@/components/EldConnectionModal"
import { Header } from "@/components/Header"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import { useConnectionState } from "../services/ConnectionStateService"
import JMBluetoothService from "../services/JMBluetoothService"
import { BleDevice } from "../types/JMBluetooth"
import { saveEldDevice } from "../utils/eldStorage"

const __DEV__ = process.env.NODE_ENV === "development"

interface DeviceScanScreenProps {
  navigation?: any
}

// Signal strength helper function
const getSignalStrength = (dBm: number, colors: any): { bars: number; color: string } => {
  if (dBm >= -50) return { bars: 4, color: colors.success }
  if (dBm >= -60) return { bars: 3, color: colors.success }
  if (dBm >= -70) return { bars: 2, color: colors.warning }
  if (dBm >= -80) return { bars: 1, color: colors.warning }
  return { bars: 1, color: colors.error }
}

// Signal strength bars component
const SignalStrengthBars: React.FC<{ signal: number; colors: any }> = ({ signal, colors }) => {
  const { bars, color } = getSignalStrength(signal, colors)

  return (
    <View style={styles.signalBarsContainer}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[
            styles.signalBar,
            {
              height: bar * 4 + 4,
              backgroundColor: bar <= bars ? color : colors.border,
              opacity: bar <= bars ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  )
}

// Device card component
const DeviceCard: React.FC<{
  device: BleDevice
  isConnecting: boolean
  onPress: () => void
  colors: any
}> = React.memo(({ device, isConnecting, onPress, colors }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start()
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isConnecting}
        activeOpacity={0.8}
      >
        <View style={styles.deviceCardLeft}>
          <View style={styles.deviceIconContainer}>
            <Bluetooth size={24} color={colors.tint} />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName} weight="semiBold">
              {device.name || "Unknown Device"}
            </Text>
            <Text style={styles.deviceAddress} size="xs" preset="formHelper">
              {device.address}
            </Text>
            <View style={styles.deviceSignalRow}>
              <Signal size={12} color={colors.textDim} />
              <Text style={styles.deviceSignal} size="xs" preset="formHelper">
                {device.signal} dBm
              </Text>
              <SignalStrengthBars signal={device.signal} colors={colors} />
            </View>
          </View>
        </View>
        <View style={styles.deviceCardRight}>
          {isConnecting ? (
            <View style={styles.connectingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.connectButton}>
              <Text style={styles.connectButtonText} weight="semiBold">
                {translate("deviceScan.connect" as any)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
})

DeviceCard.displayName = "DeviceCard"

const DeviceScanScreen: React.FC<DeviceScanScreenProps> = ({ navigation: _navigation }) => {
  const { theme } = useAppTheme()
  const { colors: themeColors, isDark } = theme
  const [devices, setDevices] = useState<BleDevice[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true)

  const [_selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null)
  const { isConnecting, setConnecting } = useConnectionState()

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim = useRef(new Animated.Value(0)).current

  // Connection status for modal
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "establishing" | "authenticating"
  >("connecting")

  useEffect(() => {
    initializeBluetooth()
    setupEventListeners()

    return () => {
      JMBluetoothService.removeAllEventListeners()
    }
  }, [])

  // Pulse animation for scanning
  useEffect(() => {
    if (isScanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      )
      pulse.start()

      // Wave animation
      const wave = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      )
      wave.start()

      return () => {
        pulse.stop()
        wave.stop()
      }
    } else {
      pulseAnim.setValue(1)
      waveAnim.setValue(0)
      return undefined
    }
  }, [isScanning, pulseAnim, waveAnim])

  const initializeBluetooth = async () => {
    try {
      await JMBluetoothService.initializeSDK()
      const permissionResult = await JMBluetoothService.requestPermissions()

      if (permissionResult.granted) {
        setIsInitialized(true)
        const status = await JMBluetoothService.getConnectionStatus()
        setBluetoothEnabled(status.isBluetoothEnabled)
      } else {
        toast.error(
          permissionResult.message || translate("deviceScan.bluetoothPermissionsRequired" as any),
        )
      }
    } catch (error) {
      console.error("Bluetooth initialization error:", error)
      toast.error(`${translate("deviceScan.failedToInitializeBluetooth" as any)}: ${error}`)
    }
  }

  const setupEventListeners = () => {
    JMBluetoothService.addEventListener("onDeviceFound", (device: BleDevice) => {
      setDevices((prevDevices) => {
        // Check if device already exists
        const exists = prevDevices.find((d) => d.address === device.address)
        if (!exists) {
          return [...prevDevices, device]
        }
        return prevDevices
      })
    })

    JMBluetoothService.addEventListener("onScanStopped", () => {
      setIsScanning(false)
    })

    JMBluetoothService.addEventListener("onScanFinished", () => {
      setIsScanning(false)
    })

    JMBluetoothService.addEventListener("onConnected", () => {
      setConnectionStatus("authenticating")
      console.log("Device connected - waiting for authentication")
    })

    JMBluetoothService.addEventListener("onConnectFailure", (error) => {
      setConnecting(false)
      setConnectionStatus("connecting")
      toast.error(`Failed to connect: ${error.status}`)
    })

    JMBluetoothService.addEventListener("onAuthenticationPassed", async (data: any) => {
      console.log("Device authentication passed:", data)

      // Save ELD device info to storage
      if (_selectedDevice) {
        await saveEldDevice({
          address: _selectedDevice.address || "",
          name: _selectedDevice.name,
          connectedAt: new Date().toISOString(),
        })
      }

      try {
        // Step 1: Check connection status
        console.log("📡 Step 1: Checking connection status...")
        const status = await JMBluetoothService.getConnectionStatus()
        console.log("📡 Connection status:", status)

        if (!status.isConnected) {
          console.warn("⚠️ Device not connected after authentication")
          toast.error(translate("deviceScan.deviceNotConnected" as any))
          setConnecting(false)
          return
        }

        // Step 2: Wait for stable connection (2 seconds)
        console.log("⏳ Waiting for stable connection...")
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 3: Re-check connection before transmitting
        const recheckStatus = await JMBluetoothService.getConnectionStatus()
        if (!recheckStatus.isConnected) {
          console.warn("⚠️ Connection lost during wait period")
          toast.error(translate("deviceScan.connectionLost" as any))
          setConnecting(false)
          return
        }

        // Step 4: Start ELD reporting (transmit)
        console.log("📤 Step 2: Starting ELD data transmission...")
        const transmitResult = await JMBluetoothService.startReportEldData()
        console.log("📤 ELD transmission start result:", transmitResult)

        if (!transmitResult) {
          console.warn("⚠️ ELD transmission start returned false")
          toast.error(translate("deviceScan.failedToStartEldTransmission" as any))
        } else {
          console.log("✅ ELD data transmission started successfully")
        }

        // Step 5: Wait a moment for transmission to initialize
        console.log("⏳ Waiting for transmission to initialize...")
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Step 6: Navigate to dashboard
        console.log("✅ Step 3: Navigating to dashboard...")
        setConnecting(false)
        router.replace("/(tabs)/dashboard")
      } catch (error) {
        console.error("❌ Error during connection check and transmission:", error)
        toast.error(`${translate("deviceScan.failedToCompleteSetup" as any)}: ${error}`)
        setConnecting(false)
        router.replace("/(tabs)/dashboard")
      }
    })

    JMBluetoothService.addEventListener("onDisconnected", () => {
      setConnecting(false)
      setConnectionStatus("connecting")
      toast.warning(translate("deviceScan.deviceDisconnected" as any))
    })
  }

  const startScan = async () => {
    if (!isInitialized) {
      toast.error(translate("deviceScan.bluetoothNotInitialized" as any))
      return
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setDevices([])
      setIsScanning(true)
      await JMBluetoothService.startScan()
    } catch (error) {
      setIsScanning(false)
      toast.error(`${translate("deviceScan.failedToStartScan" as any)}: ${error}`)
    }
  }

  const stopScan = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await JMBluetoothService.stopScan()
      setIsScanning(false)
    } catch (error) {
      toast.error(`${translate("deviceScan.failedToStopScan" as any)}: ${error}`)
    }
  }

  const connectToDevice = async (device: BleDevice) => {
    if (!device.address) {
      toast.error(translate("deviceScan.invalidDeviceAddress" as any))
      return
    }

    try {
      setSelectedDevice(device)
      setConnecting(true)
      setConnectionStatus("connecting")

      // Use the regular connect method - the native module now handles proper connection
      await JMBluetoothService.connect(device.address)
    } catch (error) {
      setConnecting(false)
      setConnectionStatus("connecting")
      toast.error(`${translate("deviceScan.failedToConnect" as any)}: ${error}`)
    }
  }

  const renderDevice = useCallback(
    ({ item }: { item: BleDevice }) => (
      <DeviceCard device={item} isConnecting={isConnecting} onPress={() => connectToDevice(item)} colors={themeColors} />
    ),
    [isConnecting, themeColors],
  )

  const keyExtractor = useCallback((item: BleDevice) => item.address || `device-${item.name}`, [])

  // Estimate item height for getItemLayout optimization
  const DEVICE_ITEM_HEIGHT = 100
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: DEVICE_ITEM_HEIGHT,
      offset: DEVICE_ITEM_HEIGHT * index,
      index,
    }),
    [],
  )

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  })

  const EmptyState = () => {
    if (!isInitialized) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <AlertCircle size={64} color={colors.textDim} />
          </View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            {translate("deviceScan.bluetoothNotInitialized" as any)}
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            {translate("deviceScan.bluetoothPermissionsRequired" as any)}
          </Text>
        </View>
      )
    }

    if (!bluetoothEnabled) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIconContainer}>
            <X size={64} color={colors.error} />
          </View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            Bluetooth Disabled
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            Please enable Bluetooth in your device settings
          </Text>
        </View>
      )
    }

    if (isScanning) {
      return (
        <View style={styles.emptyState}>
          <Animated.View
            style={[
              styles.emptyStateIconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.waveRing,
                {
                  opacity: waveOpacity,
                  transform: [
                    { scale: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
                  ],
                },
              ]}
            />
            <Search size={64} color={themeColors.tint} />
          </Animated.View>
          <Text style={styles.emptyStateTitle} weight="bold" size="lg">
            {translate("deviceScan.scanning" as any)}
          </Text>
          <Text style={styles.emptyStateText} preset="formHelper" size="sm">
            Searching for nearby ELD devices...
          </Text>
          <ActivityIndicator
            style={styles.scanningIndicator}
            size="large"
            color={themeColors.tint}
          />
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconContainer}>
          <Bluetooth size={64} color={colors.textDim} />
        </View>
        <Text style={styles.emptyStateTitle} weight="bold" size="lg">
          {translate("deviceScan.noDevices" as any)}
        </Text>
        <Text style={styles.emptyStateText} preset="formHelper" size="sm">
          Tap the scan button to search for ELD devices
        </Text>
      </View>
    )
  }

  return (
    <>
      {/* Header */}
      <Header
        title={translate("deviceScan.title" as any)}
        titleMode="center"
        backgroundColor={themeColors.background}
        LeftActionComponent={
          <Animated.View
            style={[
              styles.headerIconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Bluetooth size={32} color={isScanning ? themeColors.tint : themeColors.textDim} />
          </Animated.View>
        }
        titleContainerStyle={{
          alignItems: "center",
        }}
        RightActionComponent={
          <TouchableOpacity
            style={[
              styles.scanButton,
              isScanning && styles.scanningButton,
              !isInitialized && styles.scanButtonDisabled,
            ]}
            onPress={isScanning ? stopScan : startScan}
            disabled={!isInitialized}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <View style={styles.scanButtonContent}>
                <ActivityIndicator
                  color={themeColors.buttonPrimaryText || "#FFFFFF"}
                  size="small"
                />
                <Text style={styles.scanButtonText} weight="semiBold">
                  {translate("deviceScan.stopScan" as any) || "Stop Scan"}
                </Text>
              </View>
            ) : (
              <View style={styles.scanButtonContent}>
                <Search size={20} color={themeColors.buttonPrimaryText || "#FFFFFF"} />
                <Text style={styles.scanButtonText} weight="semiBold">
                  {isInitialized
                    ? translate("deviceScan.startScan" as any)
                    : translate("common.loading" as any)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          paddingBottom: 12,
        }}
        style={{
          paddingHorizontal: 16,
        }}
        safeAreaEdges={["top"]}
      />

      {/* Status Row */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isInitialized
                  ? isScanning
                    ? themeColors.warning
                    : themeColors.success
                  : themeColors.error,
              },
            ]}
          />
          <Text style={styles.statusText} size="xs" preset="formHelper">
            {isInitialized
              ? isScanning
                ? translate("deviceScan.scanning" as any)
                : "Ready"
              : translate("common.loading" as any)}
          </Text>
        </View>
      </View>

      {/* Device List */}
      <View style={styles.deviceList}>
        {devices.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.deviceListContent}
            // Performance optimizations
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={11}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            getItemLayout={getItemLayout}
          />
        )}
      </View>

      {/* Connection Loading Modal */}
      <EldConnectionModal visible={isConnecting} status={connectionStatus} />
    </>
  )
}

const styles = StyleSheet.create({
  connectButton: {
    backgroundColor: themeColors.tint,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  connectButtonText: {
    color: themeColors.cardBackground,
    fontSize: 14,
  },
  connectingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  deviceAddress: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 6,
  },
  deviceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 16,
    shadowColor: colors.palette.light.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceCardLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  deviceCardRight: {
    marginLeft: 12,
  },
  deviceIconContainer: {
    alignItems: "center",
    backgroundColor: colors.infoBackground,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceList: {
    flex: 1,
    padding: 20,
  },
  deviceListContent: {
    paddingBottom: 20,
  },
  deviceName: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 4,
  },
  deviceSignal: {
    color: colors.textDim,
    fontSize: 12,
  },
  deviceSignalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    alignItems: "center",
    backgroundColor: colors.sectionBackground,
    borderRadius: 60,
    height: 120,
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    width: 120,
  },
  emptyStateText: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  headerIconContainer: {
    alignItems: "center",
    backgroundColor: colors.infoBackground,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    marginRight: 12,
    width: 56,
  },
  scanButton: {
    alignItems: "center",
    backgroundColor: themeColors.tint,
    borderRadius: 12,
    elevation: 4,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: themeColors.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  scanButtonDisabled: {
    backgroundColor: colors.textDim,
    opacity: 0.5,
  },
  scanButtonText: {
    color: themeColors.cardBackground,
    fontSize: 16,
  },
  scanningButton: {
    backgroundColor: colors.error,
  },
  scanningIndicator: {
    marginTop: 16,
  },
  signalBar: {
    borderRadius: 1.5,
    width: 3,
  },
  signalBarsContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    marginLeft: 4,
  },
  statusContainer: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  statusText: {
    color: colors.textDim,
  },
  waveRing: {
    borderColor: themeColors.tint,
    borderRadius: 60,
    borderWidth: 2,
    height: 120,
    position: "absolute",
    width: 120,
  },
})

export default DeviceScanScreen
