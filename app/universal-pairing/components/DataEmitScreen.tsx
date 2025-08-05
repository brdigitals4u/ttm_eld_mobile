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
import { UniversalDevice, DeviceData } from '../types';
import colors from '@/constants/Colors';
import ELDDisplay from './eld/ELDDisplay';

// Import logging services
import { FirebaseLogger } from '../../../src/utils/FirebaseLogger';
import { SentryLogger } from '../../../src/utils/SentryLogger';
import { SupabaseLogger } from '../../../src/utils/SupabaseLogger';

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

  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const startDataStreaming = useCallback(async () => {
    try {
      // Null checks and fallbacks
      const deviceId = device?.id || 'unknown';
      const deviceName = device?.name || 'Unknown Device';
      
      if (!device) {
        console.warn('⚠️ No device available for data streaming');
        
        // Log warning to analytics
        FirebaseLogger.logELDEvent('data_streaming_no_device');
        SentryLogger.logELDEvent('data_streaming_no_device');
        return;
      }
      
      console.log('📊 Starting data streaming for device:', {
        deviceId,
        deviceName,
        timestamp: new Date().toISOString(),
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('data_streaming_started', {
        deviceId,
        deviceName,
      });
      SentryLogger.logELDEvent('data_streaming_started', {
        deviceId,
        deviceName,
      });
      
      await NativeModules.JimiBridge.startDataStreaming(deviceId, null);
      console.log('✅ Data streaming started successfully');
      
      // Log success to analytics
      FirebaseLogger.logELDEvent('data_streaming_success', {
        deviceId,
        deviceName,
      });
      SentryLogger.logELDEvent('data_streaming_success', {
        deviceId,
        deviceName,
      });
      
    } catch (error: any) {
      console.error('❌ Error starting data streaming:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('data_streaming_error', { 
        error: error?.message || 'Unknown error',
        deviceId: device?.id || 'unknown',
      });
      SentryLogger.logELDEvent('data_streaming_error', { 
        error: error?.message || 'Unknown error',
        deviceId: device?.id || 'unknown',
      });
    }
  }, [device]);

  const [sensorData, setSensorData] = useState<{[key: string]: any}>({});

  const requestSpecificData = useCallback(async (dataType: string) => {
    try {
      // Null checks and fallbacks
      const deviceId = device?.id || 'unknown';
      const deviceName = device?.name || 'Unknown Device';
      
      if (!device) {
        console.warn('⚠️ No device available for specific data request');
        
        // Log warning to analytics
        FirebaseLogger.logELDEvent('specific_data_request_no_device', { dataType });
        SentryLogger.logELDEvent('specific_data_request_no_device', { dataType });
        return;
      }
      
      console.log(`📊 Requesting specific data for ${dataType}:`, {
        deviceId,
        deviceName,
        dataType,
        timestamp: new Date().toISOString(),
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('specific_data_requested', {
        deviceId,
        deviceName,
        dataType,
      });
      SentryLogger.logELDEvent('specific_data_requested', {
        deviceId,
        deviceName,
        dataType,
      });
      
      await NativeModules.JimiBridge.requestSpecificData(deviceId, dataType);
      console.log(`✅ Requested data for ${dataType}`);
      
      // Log success to analytics
      FirebaseLogger.logELDEvent('specific_data_request_success', {
        deviceId,
        deviceName,
        dataType,
      });
      SentryLogger.logELDEvent('specific_data_request_success', {
        deviceId,
        deviceName,
        dataType,
      });
      
    } catch (error: any) {
      console.error(`❌ Error requesting data for ${dataType}:`, error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('specific_data_request_error', { 
        error: error?.message || 'Unknown error',
        dataType,
        deviceId: device?.id || 'unknown',
      });
      SentryLogger.logELDEvent('specific_data_request_error', { 
        error: error?.message || 'Unknown error',
        dataType,
        deviceId: device?.id || 'unknown',
      });
    }
  }, [device]);

  // Function to start automatic streaming
  const startAutoStreaming = useCallback(() => {
    try {
      // Null checks and fallbacks
      const deviceId = device?.id || 'unknown';
      const deviceName = device?.name || 'Unknown Device';
      
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
      
      setIsAutoStreaming(true);
      console.log('🔄 Starting automatic data streaming every 5 seconds:', {
        deviceId,
        deviceName,
        timestamp: new Date().toISOString(),
      });
      
      // Log to analytics
      FirebaseLogger.logELDEvent('auto_streaming_started', {
        deviceId,
        deviceName,
        interval: 5000,
      });
      SentryLogger.logELDEvent('auto_streaming_started', {
        deviceId,
        deviceName,
        interval: 5000,
      });
      
      // Start streaming immediately
      startDataStreaming();
      
      // Set up interval for every 5 seconds
      streamingIntervalRef.current = setInterval(() => {
        if (device && isConnected) {
          startDataStreaming();
        } else {
          console.warn('⚠️ Auto streaming stopped: device not connected');
          
          // Log warning to analytics
          FirebaseLogger.logELDEvent('auto_streaming_stopped_no_connection', {
            deviceId,
            deviceName,
          });
          SentryLogger.logELDEvent('auto_streaming_stopped_no_connection', {
            deviceId,
            deviceName,
          });
        }
      }, 5000);
      
    } catch (error: any) {
      console.error('❌ Error starting auto streaming:', error);
      
      // Log error to analytics
      FirebaseLogger.logELDEvent('auto_streaming_error', { 
        error: error?.message || 'Unknown error',
        deviceId: device?.id || 'unknown',
      });
      SentryLogger.logELDEvent('auto_streaming_error', { 
        error: error?.message || 'Unknown error',
        deviceId: device?.id || 'unknown',
      });
    }
  }, [device, isConnected, startDataStreaming]);

  // Function to stop automatic streaming
  const stopAutoStreaming = useCallback(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setIsAutoStreaming(false);
    console.log('Stopped automatic data streaming');
  }, []);

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

  const [lastDisconnectReason, setLastDisconnectReason] = useState<string | null>(null);
  const [disconnectInfo, setDisconnectInfo] = useState<any>(null);
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const mountedRef = useRef(true);
  const renderCountRef = useRef(0);
  const streamingIntervalRef = useRef<any>(null);
  
  // Check if this is an ELD device
  const isELDDevice = device?.protocol === 'ELD_DEVICE';

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
      // Clear interval on unmount
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  // Effect to stop auto streaming when device disconnects
  useEffect(() => {
    if (!isConnected && isAutoStreaming) {
      stopAutoStreaming();
    }
  }, [isConnected, isAutoStreaming, stopAutoStreaming]);

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

  // Test function to simulate ELD data flow
  const testELDDataFlow = useCallback(async () => {
    try {
      console.log('🧪 Starting ELD Test Data Flow...');
      
      // Log test start
      FirebaseLogger.logELDEvent('test_eld_flow_started', {
        deviceId: device?.id || 'test-device',
        deviceName: device?.name || 'Test ELD Device',
      });
      
      // Simulate ELD JSON data from hardware
      const testELDData = {
        // 24-Hour Period Data
        period_start_time: { value: "2024-01-15T00:00:00Z", timestamp: new Date().toISOString() },
        date: { value: "2024-01-15", timestamp: new Date().toISOString() },
        time: { value: "10:30:00", timestamp: new Date().toISOString() },
        timezone_offset: { value: "-05:00", timestamp: new Date().toISOString() },
        
        // Carrier Information
        carrier_name: { value: "Test Carrier Inc.", timestamp: new Date().toISOString() },
        carrier_usdot_number: { value: "1234567", timestamp: new Date().toISOString() },
        
        // Vehicle Information
        vin: { value: "SALYK2EX2LA257358", timestamp: new Date().toISOString() },
        cmv_power_unit_number: { value: "TRUCK-001", timestamp: new Date().toISOString() },
        trailer_numbers: { value: "TRAILER-001", timestamp: new Date().toISOString() },
        vehicle_miles: { value: "1250.5", timestamp: new Date().toISOString() },
        engine_hours: { value: "3600", timestamp: new Date().toISOString() },
        
        // Driver Information
        driver_first_name: { value: "John", timestamp: new Date().toISOString() },
        driver_last_name: { value: "Driver", timestamp: new Date().toISOString() },
        driver_license_number: { value: "DL123456789", timestamp: new Date().toISOString() },
        driver_license_issuing_state: { value: "CA", timestamp: new Date().toISOString() },
        driver_location_description: { value: "Los Angeles, CA", timestamp: new Date().toISOString() },
        
        // ELD Device Information
        eld_identifier: { value: "ELD-TEST-001", timestamp: new Date().toISOString() },
        eld_provider: { value: "Test ELD Provider", timestamp: new Date().toISOString() },
        eld_registration_id: { value: "REG-123456", timestamp: new Date().toISOString() },
        eld_username: { value: "testdriver", timestamp: new Date().toISOString() },
        eld_account_type: { value: "DRIVER", timestamp: new Date().toISOString() },
        eld_authentication_value: { value: "AUTH-TEST-123", timestamp: new Date().toISOString() },
        
        // Event Data
        event_code: { value: "PERIODIC", timestamp: new Date().toISOString() },
        event_type: { value: "DRIVING", timestamp: new Date().toISOString() },
        event_sequence_id: { value: "12345", timestamp: new Date().toISOString() },
        event_record_origin: { value: "AUTOMATIC", timestamp: new Date().toISOString() },
        event_record_status: { value: "ACTIVE", timestamp: new Date().toISOString() },
        event_data_check_value: { value: "CHECK-123", timestamp: new Date().toISOString() },
        
        // Location Data
        latitude: { value: "40.7128", timestamp: new Date().toISOString() },
        longitude: { value: "-74.0060", timestamp: new Date().toISOString() },
        geo_location: { value: "New York, NY", timestamp: new Date().toISOString() },
        distance_since_last_valid_coordinates: { value: "0.5", timestamp: new Date().toISOString() },
        
        // Diagnostic Data
        malfunction_indicator_status: { value: "OK", timestamp: new Date().toISOString() },
        malfunction_diagnostic_code: { value: "P0000", timestamp: new Date().toISOString() },
        data_diagnostic_event_indicator_status: { value: "NORMAL", timestamp: new Date().toISOString() },
        
        // Configuration
        exempt_driver_configuration: { value: "NONE", timestamp: new Date().toISOString() },
        multiday_basis_used: { value: "7", timestamp: new Date().toISOString() },
        
        // Additional Data
        order_number: { value: "ORD-123456", timestamp: new Date().toISOString() },
        shipping_document_number: { value: "SHIP-789", timestamp: new Date().toISOString() },
        output_file_comment: { value: "Test comment", timestamp: new Date().toISOString() },
        comment_annotation: { value: "Test annotation", timestamp: new Date().toISOString() },
        
        // File Data
        file_data_check_value: { value: "FILE-CHECK-123", timestamp: new Date().toISOString() },
        line_data_check_value: { value: "LINE-CHECK-456", timestamp: new Date().toISOString() },
        
        // CAN Data (Engine Performance)
        engine_throttle: { value: "45.2", timestamp: new Date().toISOString() },
        engine_throttle_valve_1_position_1: { value: "42.1", timestamp: new Date().toISOString() },
        engine_intake_air_mass_flow_rate: { value: "12.5", timestamp: new Date().toISOString() },
        engine_percent_load_at_current_speed: { value: "78.5", timestamp: new Date().toISOString() },
        engine_speed: { value: "2200", timestamp: new Date().toISOString() },
        engine_runtime: { value: "3600", timestamp: new Date().toISOString() },
        engine_running_time: { value: "3600", timestamp: new Date().toISOString() },
        time_since_engine_start: { value: "1800", timestamp: new Date().toISOString() },
        accelerator_pedal_position_1: { value: "35.0", timestamp: new Date().toISOString() },
        
        // Vehicle Status
        wheel_based_vehicle_speed: { value: "65.0", timestamp: new Date().toISOString() },
        total_vehicle_distance: { value: "1250.5", timestamp: new Date().toISOString() },
        acc_out_status: { value: "ACTIVE", timestamp: new Date().toISOString() },
        malfunction_indicator_lamp: { value: "OFF", timestamp: new Date().toISOString() },
        
        // Environmental Data
        engine_inlet_air_temperature: { value: "85.0", timestamp: new Date().toISOString() },
        engine_coolant_temperature: { value: "185.0", timestamp: new Date().toISOString() },
        
        // OBD Test Data
        obd_rpm: { value: "2500", timestamp: new Date().toISOString() },
        obd_speed: { value: "65", timestamp: new Date().toISOString() },
        obd_temperature: { value: "185", timestamp: new Date().toISOString() },
        obd_fuel_level: { value: "75", timestamp: new Date().toISOString() },
        obd_voltage: { value: "13500", timestamp: new Date().toISOString() },
        obd_throttle: { value: "45", timestamp: new Date().toISOString() },
        
        // Additional sensor data
        fuel_level: { value: "75", timestamp: new Date().toISOString() },
        gps_location: { value: "40.7128, -74.0060", timestamp: new Date().toISOString() },
        speed: { value: "65", timestamp: new Date().toISOString() },
        temperature: { value: "23.5", timestamp: new Date().toISOString() },
        obd_data: { value: "2500", timestamp: new Date().toISOString() },
        engine_data: { value: "185", timestamp: new Date().toISOString() },
        battery: { value: "85", timestamp: new Date().toISOString() },
      };
      
      // Update sensor data with test values
      setSensorData(testELDData);
      
                    console.log('✅ Test ELD data flow completed successfully');
       
       // Log test completion
       FirebaseLogger.logELDEvent('test_eld_flow_completed', {
         deviceId: device?.id || 'test-device',
         dataPoints: Object.keys(testELDData).length,
       });
       
       // Show success message
       alert('🧪 Test ELD Data Flow Completed!\n\nAll ELD and OBD data has been populated with test values.\n\nYou can now see:\n• ELD Dashboard with FMCSA data\n• OBD Protocol comparison\n• Real-time data stream\n\nThis simulates the complete flow from KD032-43148B device.');
       
     } catch (error: any) {
       console.error('❌ Test ELD data flow failed:', error);
       
       // Log error
       FirebaseLogger.logELDEvent('test_eld_flow_error', {
         deviceId: device?.id || 'test-device',
         error: error?.message || 'Unknown error',
       });
       
       alert('❌ Test failed. Please check console for details.');
     }
  }, [device]);

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
            title={isAutoStreaming ? "Stop Auto Streaming" : "Start Auto Streaming (5s)"} 
            onPress={isAutoStreaming ? stopAutoStreaming : startAutoStreaming} 
            style={styles.controlButton}
            variant={isAutoStreaming ? "outline" : "primary"}
          />
          <Button 
            title="Manual Stream" 
            onPress={startDataStreaming} 
            style={styles.controlButton}
            variant="secondary"
          />
        </View>
        
        {/* Test ELD Data Flow Button */}
        <View style={styles.testButtonContainer}>
          <Button 
            title="🧪 TEST ELD Data Flow" 
            onPress={testELDDataFlow} 
            style={styles.testButton}
            variant="outline"
          />
          <Text style={[styles.testButtonDescription, { color: colors.inactive }]}>
            Simulates complete ELD + OBD data from KD032-43148B device
          </Text>
        </View>
        
        {isAutoStreaming && (
          <View style={[styles.streamingIndicator, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <Text style={[styles.streamingText, { color: colors.success }]}>🔄 Auto Streaming Every 5 Seconds</Text>
          </View>
        )}
        
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
              {sensorData?.fuel_level ? `${sensorData?.fuel_level.value}%` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.fuel_level ? formatTimestamp(sensorData?.fuel_level.timestamp) : 'No data'}
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
              {sensorData?.gps_location ? `${sensorData?.gps_location.value}°` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.gps_location ? formatTimestamp(sensorData?.gps_location.timestamp) : 'No data'}
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
              {sensorData?.speed ? `${sensorData?.speed.value} mph` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.speed ? formatTimestamp(sensorData?.speed.timestamp) : 'No data'}
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
              {sensorData?.temperature ? `${sensorData?.temperature.value}°C` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.temperature ? formatTimestamp(sensorData?.temperature.timestamp) : 'No data'}
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
              {sensorData?.obd_data ? `${sensorData?.obd_data.value} RPM` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.obd_data ? formatTimestamp(sensorData?.obd_data.timestamp) : 'No data'}
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
              {sensorData?.engine_data ? `${sensorData?.engine_data.value}°F` : '--'}
            </Text>
            <Text style={[styles.sensorTime, { color: colors.inactive }]}>
              {sensorData?.engine_data ? formatTimestamp(sensorData?.engine_data.timestamp) : 'No data'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.eldSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ELD Dashboard
          </Text>
          <ELDDisplay 
            device={{
              ...device,
              eldData: {
                // 24-Hour Period Data
                periodStartTime: sensorData?.period_start_time?.value,
                date: sensorData?.date?.value,
                time: sensorData?.time?.value,
                timeZoneOffset: sensorData?.timezone_offset?.value,
                
                // Carrier Information
                carrierName: sensorData?.carrier_name?.value,
                carrierUSDOTNumber: sensorData?.carrier_usdot_number?.value,
                
                // Vehicle Information
                vin: sensorData?.vin?.value,
                cmvPowerUnitNumber: sensorData?.cmv_power_unit_number?.value,
                trailerNumbers: sensorData?.trailer_numbers?.value,
                vehicleMiles: sensorData?.vehicle_miles?.value,
                engineHours: sensorData?.engine_hours?.value,
                
                // Driver Information
                driverFirstName: sensorData?.driver_first_name?.value,
                driverLastName: sensorData?.driver_last_name?.value,
                driverLicenseNumber: sensorData?.driver_license_number?.value,
                driverLicenseIssuingState: sensorData?.driver_license_issuing_state?.value,
                driverLocationDescription: sensorData?.driver_location_description?.value,
                
                // ELD Device Information
                eldIdentifier: sensorData?.eld_identifier?.value,
                eldProvider: sensorData?.eld_provider?.value,
                eldRegistrationId: sensorData?.eld_registration_id?.value,
                eldUsername: sensorData?.eld_username?.value,
                eldAccountType: sensorData?.eld_account_type?.value,
                eldAuthenticationValue: sensorData?.eld_authentication_value?.value,
                
                // Event Data
                eventCode: sensorData?.event_code?.value,
                eventType: sensorData?.event_type?.value,
                eventSequenceId: sensorData?.event_sequence_id?.value,
                eventRecordOrigin: sensorData?.event_record_origin?.value,
                eventRecordStatus: sensorData?.event_record_status?.value,
                eventDataCheckValue: sensorData?.event_data_check_value?.value,
                
                // Location Data
                latitude: sensorData?.latitude?.value,
                longitude: sensorData?.longitude?.value,
                geoLocation: sensorData?.geo_location?.value,
                distanceSinceLastValidCoordinates: sensorData?.distance_since_last_valid_coordinates?.value,
                
                // Diagnostic Data
                malfunctionIndicatorStatus: sensorData?.malfunction_indicator_status?.value,
                malfunctionDiagnosticCode: sensorData?.malfunction_diagnostic_code?.value,
                dataDiagnosticEventIndicatorStatus: sensorData?.data_diagnostic_event_indicator_status?.value,
                
                // Configuration
                exemptDriverConfiguration: sensorData?.exempt_driver_configuration?.value,
                multidayBasisUsed: sensorData?.multiday_basis_used?.value,
                
                // Additional Data
                orderNumber: sensorData?.order_number?.value,
                shippingDocumentNumber: sensorData?.shipping_document_number?.value,
                outputFileComment: sensorData?.output_file_comment?.value,
                commentAnnotation: sensorData?.comment_annotation?.value,
                
                // File Data
                fileDataCheckValue: sensorData?.file_data_check_value?.value,
                lineDataCheckValue: sensorData?.line_data_check_value?.value,
              },
              canData: {
                // Engine Performance Metrics
                engine_throttle: sensorData?.engine_throttle?.value,
                engine_throttle_valve_1_position_1: sensorData?.engine_throttle_valve_1_position_1?.value,
                engine_intake_air_mass_flow_rate: sensorData?.engine_intake_air_mass_flow_rate?.value,
                engine_percent_load_at_current_speed: sensorData?.engine_percent_load_at_current_speed?.value,
                engine_speed: sensorData?.engine_speed?.value,
                engine_runtime: sensorData?.engine_runtime?.value,
                engine_running_time: sensorData?.engine_running_time?.value,
                time_since_engine_start: sensorData?.time_since_engine_start?.value,
                accelerator_pedal_position_1: sensorData?.accelerator_pedal_position_1?.value,
                
                // Vehicle Status
                wheel_based_vehicle_speed: sensorData?.wheel_based_vehicle_speed?.value,
                total_vehicle_distance: sensorData?.total_vehicle_distance?.value,
                acc_out_status: sensorData?.acc_out_status?.value,
                malfunction_indicator_lamp: sensorData?.malfunction_indicator_lamp?.value,
                
                // Environmental Data
                engine_inlet_air_temperature: sensorData?.engine_inlet_air_temperature?.value,
                engine_coolant_temperature: sensorData?.engine_coolant_temperature?.value,
                intake_manifold_absolute_pressure: sensorData?.intake_manifold_absolute_pressure?.value,
                barometric_pressure: sensorData?.barometric_pressure?.value,
                
                // Fuel System
                fuel_level: sensorData?.fuel_level?.value,
                fuel_level_1: sensorData?.fuel_level_1?.value,
                
                // Electrical System
                voltage: sensorData?.voltage?.value,
                
                // Legacy fields for backward compatibility
                air_flow: sensorData?.air_flow?.value,
                engine_load: sensorData?.engine_load?.value,
                coolant_temp: sensorData?.coolant_temp?.value,
                vehicle_distance: sensorData?.vehicle_distance?.value,
                speed: sensorData?.speed?.value,
                engine_rpm: sensorData?.engine_rpm?.value,
              },
              gpsData: {
                latitude: sensorData?.gps_latitude?.value,
                longitude: sensorData?.gps_longitude?.value,
                heading: sensorData?.gps_heading?.value,
                timestamp: sensorData?.gps_timestamp?.value,
              },
              eventData: {
                event_type: sensorData?.event_type?.value,
                trigger: sensorData?.event_trigger?.value,
                id: sensorData?.event_id?.value,
              },
            }}
            timestamp={latestData?.timestamp}
          />
          
          {/* OBD Protocol Data Comparison */}
          <View style={styles.obdComparisonSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔧 OBD Protocol Data Comparison
            </Text>
            
            {/* OBD Engine Data */}
            <View style={styles.obdDataGrid}>
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>⚡</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Engine RPM</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_rpm ? `${sensorData?.obd_rpm.value} RPM` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x0C</Text>
              </View>
              
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>🚗</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Vehicle Speed</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_speed ? `${sensorData?.obd_speed.value} km/h` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x0D</Text>
              </View>
              
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>🌡️</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Engine Temp</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_temperature ? `${sensorData?.obd_temperature.value}°F` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x05</Text>
              </View>
              
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>⛽</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Fuel Level</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_fuel_level ? `${sensorData?.obd_fuel_level.value}%` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x2F</Text>
              </View>
              
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>🔋</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Voltage</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_voltage ? `${sensorData?.obd_voltage.value} mV` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x42</Text>
              </View>
              
              <View style={[styles.obdDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.obdDataIcon}>🎛️</Text>
                <Text style={[styles.obdDataLabel, { color: colors.text }]}>Throttle</Text>
                <Text style={[styles.obdDataValue, { color: colors.primary }]}>
                  {sensorData?.obd_throttle ? `${sensorData?.obd_throttle.value}%` : '--'}
                </Text>
                <Text style={[styles.obdDataSource, { color: colors.inactive }]}>OBD PID 0x11</Text>
              </View>
            </View>
          </View>
          
          {/* Regular Sensor Data for ELD Devices */}
          {isELDDevice && deviceData.length > 0 && (
            <View style={styles.regularSensorSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📊 Regular Sensor Data (ELD Device)
              </Text>
              <Text style={[styles.specificDataTitle, { color: colors.inactive }]}>
                Raw sensor data from ELD device - shows both ELD and sensor views
              </Text>
              
              <View style={styles.sensorGrid}>
                {deviceData.slice(-6).map((data, index) => (
                  <View key={index} style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.sensorIcon}>
                      {data.dataType === 'OBD_PROTOCOL' ? '🔧' : '📊'}
                    </Text>
                    <Text style={[styles.sensorLabel, { color: colors.text }]}>
                      {data.dataType === 'OBD_PROTOCOL' ? 'OBD Data' : 'Sensor Data'}
                    </Text>
                    <Text style={[styles.sensorValue, { color: colors.primary }]}>
                      {data.dataType === 'OBD_PROTOCOL' 
                        ? `${data.value || '--'}`
                        : `${data.value || '--'}`
                      }
                    </Text>
                    <Text style={[styles.sensorTime, { color: colors.inactive }]}>
                      {formatTimestamp(data.timestamp)}
                    </Text>
                    <Text style={[styles.sensorTime, { color: colors.inactive, fontSize: 10, fontFamily: "monospace" }]}>
                      {data.protocol}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
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
  streamingIndicator: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  streamingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eldSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  sensorSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  // OBD Comparison Styles
  obdComparisonSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  obdDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  obdDataCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  obdDataIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  obdDataLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  obdDataValue: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  obdDataSource: {
    fontSize: 10,
    fontFamily: "monospace",
    textAlign: "center",
    opacity: 0.7,
  },
  comparisonInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
  },
  comparisonInfoText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  // Test Button Styles
  testButtonContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  testButton: {
    marginBottom: 8,
  },
  testButtonDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  regularSensorSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default DataEmitScreen;
