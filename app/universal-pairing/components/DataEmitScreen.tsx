import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  FlatList,
  InteractionManager,
  NativeModules,
  ScrollView,
} from "react-native";
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/context/theme-context";
import Button from "@/components/Button";
import { UniversalDevice, DeviceData } from "../types";
import colors from "@/constants/Colors";

interface DataEmitScreenProps {
  device: UniversalDevice | null;
  deviceData: DeviceData[];
  onDisconnect: () => void;
  onBack: () => void;
}

const DataEmitScreen: React.FC<DataEmitScreenProps> = ({
  device,
  deviceData,
  onDisconnect,
  onBack,
}) => {
  const startDataStreaming = useCallback(async () => {
    if (device) {
      try {
        await NativeModules.JimiBridge.startDataStreaming(device.id, null);
        console.log('Data streaming started successfully');
      } catch (error) {
        console.error('Error starting data streaming:', error);
      }
    }
  }, [device]);

  const [sensorData, setSensorData] = useState<{[key: string]: any}>({});

  const requestSpecificData = useCallback(async (dataType: string) => {
    if (device) {
      try {
        await NativeModules.JimiBridge.requestSpecificData(device.id, dataType);
        console.log(`Requested data for ${dataType}`);
      } catch (error) {
        console.error(`Error requesting data for ${dataType}:`, error);
      }
    }
  }, [device]);

  // Update sensor data when new data comes in
  useEffect(() => {
    if (deviceData.length > 0) {
      const latestDataMap: {[key: string]: any} = {};
      deviceData.forEach(data => {
        latestDataMap[data.dataType] = data;
      });
      setSensorData(latestDataMap);
    }
  }, [deviceData]);

  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [lastDisconnectReason, setLastDisconnectReason] = useState<string | null>(null);
  const [disconnectInfo, setDisconnectInfo] = useState<any>(null);
  const mountedRef = useRef(true);
  const renderCountRef = useRef(0);

  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    // Start pulsing animation for connection indicator
    pulseAnimation.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // // Effect to handle disconnect reasons and connection state
  // useEffect(() => {
  //   const handleDisconnectEvent = (disconnectionData: any) => {
  //     if (!mountedRef.current) return;
      
  //     console.log('Device disconnected with details:', disconnectionData);
      
  //     // Batch state updates for performance
  //     InteractionManager.runAfterInteractions(() => {
  //       setIsConnected(false);
  //       setLastDisconnectReason(disconnectionData.disconnectReason || 'Unknown reason');
  //       setDisconnectInfo({
  //         reason: disconnectionData.disconnectReason,
  //         status: disconnectionData.disconnectStatus,
  //         category: disconnectionData.disconnectCategory,
  //         wasUnexpected: disconnectionData.wasUnexpected,
  //         timestamp: disconnectionData.timestamp,
  //       });
  //     });
  //   };

  //   const handleConnectEvent = (connectionData: any) => {
  //     if (!mountedRef.current) return;
      
  //     console.log('Device connected:', connectionData);
      
  //     InteractionManager.runAfterInteractions(() => {
  //       setIsConnected(true);
  //       setLastDisconnectReason(null);
  //       setDisconnectInfo(null);
  //     });
  //   };

  //   // Note: These would be actual event listeners in a real implementation
  //   // For now, this shows the structure for handling the enhanced disconnect data
    
  //   return () => {
  //     Disc
  //   };
  // }, []);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });

  const handleDisconnect = () => {
    setConfirmDisconnect(true);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getDeviceIcon = () => {
    if (!device) return "🛠️";
    switch (device.deviceCategory?.toLowerCase()) {
      case "eld":
        return "🚛";
      case "camera":
        return "📷";
      case "tracking":
        return "📍";
      case "bluetooth":
        return "📶";
      case "sensor":
        return "🔬";
      default:
        return "🛠️";
    }
  };

  // Memoize expensive calculations
  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  }, []);

  const formatDataType = useCallback((dataType: string) => {
    return dataType
      ?.replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  // Memoize latest data calculation
  const latestData = useMemo(() => {
    if (!deviceData || deviceData.length === 0) return null;
    return deviceData[deviceData.length - 1];
  }, [deviceData]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: DeviceData, index: number) => {
    return `${item.timestamp}-${index}`;
  }, []);

  // Empty component for FlatList
  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Data Received
        </Text>
        <Text style={[styles.emptyMessage, { color: colors.inactive }]}>
          Waiting for data from the connected device...
        </Text>
      </View>
    ),
    [colors]
  );

  // Memoize reversed data array for FlatList
  const reversedDeviceData = useMemo(() => {
    return deviceData.slice().reverse();
  }, [deviceData]);

  // Memoized render function for FlatList items

  const renderDataItem = useCallback(
    ({ item, index }: { item: DeviceData; index: number }) => {
      return (
        <Animated.View
          key={`${item.timestamp}-${index}`}
          entering={SlideInDown.delay(index * 100)}
          style={[
            styles.dataItem,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderLeftColor: item.isRealData
                ? colors.success
                : colors.warning,
            },
          ]}
        >
          <View style={styles.dataHeader}>
            <Text style={[styles.dataType, { color: colors.text }]}>
              {formatDataType(item.dataType)}
            </Text>
            <Text style={[styles.timestamp, { color: colors.inactive }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>

          <View style={styles.dataContent}>
            {item.value !== undefined && (
              <Text style={[styles.dataValue, { color: colors.text }]}>
                Value: {item.value}
              </Text>
            )}

            {item.sensorValue !== undefined && (
              <Text style={[styles.dataValue, { color: colors.text }]}>
                Sensor: {item.sensorValue}
              </Text>
            )}

            {item.batteryLevel !== undefined && (
              <Text style={[styles.dataValue, { color: colors.text }]}>
                Battery: {item.batteryLevel}%
              </Text>
            )}

            {item.signalStrength !== undefined && (
              <Text style={[styles.dataValue, { color: colors.text }]}>
                Signal: {item.signalStrength} dBm
              </Text>
            )}

            {item.rawData && (
              <Text
                style={[styles.rawData, { color: colors.inactive }]}
                numberOfLines={2}
              >
                Raw:{" "}
                {item.rawData.length > 50
                  ? `${item.rawData.substring(0, 50)}...`
                  : item.rawData}
              </Text>
            )}
          </View>

          <View style={styles.dataFooter}>
            {item.isRealData && (
              <View
                style={[
                  styles.realDataBadge,
                  { backgroundColor: colors.success + "20" },
                ]}
              >
                <Text style={[styles.realDataText, { color: colors.success }]}>
                  Real Data
                </Text>
              </View>
            )}

            {item.protocol && (
              <Text style={[styles.protocol, { color: colors.inactive }]}>
                {item.protocol}
              </Text>
            )}
          </View>
        </Animated.View>
      );
    },
    []
  );
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.deviceHeader}>
          <View
            style={[
              styles.deviceIconContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <Animated.View style={animatedPulseStyle}>
              <Text style={styles.deviceIcon}>{getDeviceIcon()}</Text>
            </Animated.View>

            {/* Connection Status Indicator */}
            <View
              style={[
                styles.connectionIndicator,
                {
                  backgroundColor: isConnected ? colors.success : colors.danger,
                },
              ]}
            />
          </View>

          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {device?.name || "Unknown Device"}
            </Text>
            <Text style={[styles.deviceId, { color: colors.inactive }]}>
              {device?.address || device?.id || "N/A"}
            </Text>
            <Text
              style={[
                styles.connectionStatus,
                {
                  color: isConnected ? colors.success : colors.danger,
                },
              ]}
            >
              {isConnected ? "● Connected" : "● Disconnected"}
            </Text>
          </View>
        </View>
      </View>

      {/* Disconnect Status */}
      {!isConnected && disconnectInfo && (
        <Animated.View
          entering={SlideInDown.delay(100)}
          style={[
            styles.disconnectCard,
            { 
              backgroundColor: colors.card, 
              borderColor: disconnectInfo.wasUnexpected ? colors.danger : colors.warning,
              borderLeftColor: disconnectInfo.wasUnexpected ? colors.danger : colors.warning 
            },
          ]}
        >
          <View style={styles.disconnectHeader}>
            <Text style={[styles.disconnectTitle, { color: colors.text }]}>
              {disconnectInfo.wasUnexpected ? '⚠️ Unexpected Disconnect' : '✓ Normal Disconnect'}
            </Text>
            <Text style={[styles.disconnectTime, { color: colors.inactive }]}>
              {disconnectInfo.timestamp ? formatTimestamp(disconnectInfo.timestamp) : 'Unknown time'}
            </Text>
          </View>
          <Text style={[styles.disconnectReason, { color: colors.text }]}>
            Reason: {disconnectInfo.reason || 'Unknown'}
          </Text>
          <View style={styles.disconnectMeta}>
            <Text style={[styles.disconnectCategory, { color: colors.inactive }]}>
              Category: {disconnectInfo.category || 'UNKNOWN'}
            </Text>
            <Text style={[styles.disconnectStatus, { color: colors.inactive }]}>
              Status Code: {disconnectInfo.status || 'N/A'}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Latest Data Summary */}
      {latestData && (
        <Animated.View
          entering={SlideInDown.delay(200)}
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Latest Data
          </Text>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {formatDataType(latestData.dataType)}
            </Text>
            <Text style={[styles.summaryTime, { color: colors.inactive }]}>
              {formatTimestamp(latestData.timestamp)}
            </Text>
          </View>
          {latestData.value !== undefined && (
            <Text style={[styles.summaryDetail, { color: colors.text }]}>
              Value: {latestData.value}
            </Text>
          )}
        </Animated.View>
      )}

{/* Controls for Data */}
      <View style={styles.controlsContainer}>
        <Text style={[styles.controlsTitle, { color: colors.text }]}>Data Controls</Text>
        
        <View style={styles.buttonRow}>
          <Button 
            title="Start All Streaming" 
            onPress={startDataStreaming} 
            style={styles.controlButton}
            variant="primary"
          />
          <Button 
            title="Request All Data" 
            onPress={() => requestSpecificData('all')} 
            style={styles.controlButton}
            variant="secondary"
          />
        </View>
        
        <Text style={[styles.specificDataTitle, { color: colors.text }]}>Sensor Data:</Text>
        
        <View style={styles.sensorGrid}>
          {/* Fuel Level Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('fuel_level')}
          >
            <Text style={styles.sensorIcon}>⛽</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>Fuel Level</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.fuel_level ? `${sensorData.fuel_level.value}%` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.fuel_level ? formatTimestamp(sensorData.fuel_level.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>

          {/* GPS Location Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('gps_location')}
          >
            <Text style={styles.sensorIcon}>📍</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>GPS Location</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.gps_location ? `${sensorData.gps_location.value}°` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.gps_location ? formatTimestamp(sensorData.gps_location.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>

          {/* Speed Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('speed')}
          >
            <Text style={styles.sensorIcon}>🚗</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>Speed</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.speed ? `${sensorData.speed.value} mph` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.speed ? formatTimestamp(sensorData.speed.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>

          {/* Temperature Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('temperature')}
          >
            <Text style={styles.sensorIcon}>🌡️</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>Temperature</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.temperature ? `${sensorData.temperature.value}°C` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.temperature ? formatTimestamp(sensorData.temperature.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>

          {/* OBD Data Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('obd_data')}
          >
            <Text style={styles.sensorIcon}>🔧</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>OBD Data</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.obd_data ? `${sensorData.obd_data.value} RPM` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.obd_data ? formatTimestamp(sensorData.obd_data.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>

          {/* Engine Data Card */}
          <TouchableOpacity 
            style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => requestSpecificData('engine_data')}
          >
            <Text style={styles.sensorIcon}>🏭</Text>
            <Text style={[styles.sensorLabel, { color: colors.text }]}>Engine Data</Text>
            <Text style={[styles.sensorValue, { color: colors.primary }]}>
              {sensorData.engine_data ? `${sensorData.engine_data.value}°F` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData.engine_data ? formatTimestamp(sensorData.engine_data.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Stream */}
      <View style={styles.dataSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data Stream ({deviceData.length} messages)
        </Text>

        <FlatList
          style={styles.dataList}
          data={reversedDeviceData}
          keyExtractor={keyExtractor}
          renderItem={renderDataItem}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Back to Devices"
          onPress={onBack}
          variant="secondary"
          style={styles.backButton}
        />
        <Button
          title={confirmDisconnect ? "Confirm Disconnect" : "Disconnect"}
          onPress={handleDisconnect}
          variant={confirmDisconnect ? "primary" : "outline"}
          style={styles.disconnectButton}
        />
      </View>
      </ScrollView>

      <Modal
        visible={confirmDisconnect}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDisconnect(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Disonnect
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#4CAF50" }]}
                onPress={() => {
                  onDisconnect();
                  setConfirmDisconnect(false);
                  onBack();
                }}
              >
                <Text style={styles.modalButtonText}>Confirmed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "transparent" }]}
                onPress={() => setConfirmDisconnect(false)}
              >
                <Text
                  style={[styles.modalButtonText, { color: colors.primary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    marginBottom: 20,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceIcon: {
    fontSize: 36,
  },
  connectionIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  connectionStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryTime: {
    fontSize: 12,
  },
  summaryDetail: {
    fontSize: 14,
  },
  disconnectCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  disconnectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  disconnectTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  disconnectTime: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  disconnectReason: {
    fontSize: 14,
    marginBottom: 8,
  },
  disconnectMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disconnectCategory: {
    fontSize: 12,
    fontWeight: "500",
  },
  disconnectStatus: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  dataSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  dataList: {
    flex: 1,
  },
  dataContainer: {
    paddingBottom: 20,
  },
  dataItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dataHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dataType: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  dataContent: {
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 14,
    marginBottom: 2,
  },
  rawData: {
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 4,
  },
  dataFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  realDataBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  realDataText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  protocol: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flex: 1,
  },
  disconnectButton: {
    flex: 1,
    backgroundColor: colors.dark.card,
    color: colors.dark.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    width: "100%",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#fff",
  },
  controlsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  specificDataTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  controlButton: {
    flex: 1,
  },
  smallButton: {
    width: '30%',
    marginBottom: 8,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  sensorCard: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  sensorTime: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default DataEmitScreen;
