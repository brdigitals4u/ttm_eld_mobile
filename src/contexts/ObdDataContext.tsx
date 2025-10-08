import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated,  FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import JMBluetoothService from '../services/JMBluetoothService';
import { VinData, ObdEldData } from '../types/JMBluetooth';
import { handleData } from '../services/handleData';
// Define OBDDataItem interface for display
interface OBDDataItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  isError?: boolean;
}



const ObdDataScreen: React.FC<any> = () => {
  const [isReporting, setIsReporting] = useState(false);
  const [vinData, setVinData] = useState<VinData | null>(null);
  const [dataReceived, setDataReceived] = useState(true);
  const [obdDisplayData, setObdDisplayData] = useState<OBDDataItem[]>([]);
  const [errorData, setErrorData] = useState<OBDDataItem[]>([]);

  // Button functions


  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  // Extract gauge values from OBD data
  const getDataValue = (name: string): number => {
    const item = obdDisplayData.find(data => 
      data.name.toLowerCase().includes(name.toLowerCase())
    );
    const value = item ? parseFloat(item.value) : 0;
    return isNaN(value) ? 0 : Math.max(0, value);
  };

  // Gauge data with proper fallbacks
  const speedKmh = getDataValue('Wheel-Based Vehicle Speed') || getDataValue('Vehicle Speed') || 0;


  // Initialize OBD system
  const initializeObdSystem = React.useCallback(async () => {
    try {
      const isConnected = await JMBluetoothService.getConnectionStatus();
      if (!isConnected) {
        console.log('⚠️ Device not connected, retrying in 2 seconds...');
        setTimeout(initializeObdSystem, 2000);
        return;
      }
      console.log('🔧 Device connected, starting OBD reporting...');
      await JMBluetoothService.startReportEldData();
      console.log('✅ OBD reporting started');
    } catch (error) {
      console.error('❌ Failed to start OBD reporting:', error);
      setTimeout(initializeObdSystem, 3000);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 ObdDataScreen mounted - initializing OBD system...');
    
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
    ]).start();

    // Start OBD system after a delay
    setTimeout(initializeObdSystem, 3000);

    // Connection monitor
    const connectionMonitor = setInterval(async () => {
      try {
        const isConnected = await JMBluetoothService.getConnectionStatus();
        if (!isConnected && isReporting) {
          console.log('⚠️ Device disconnected, stopping reporting...');
          setIsReporting(false);
        } else if (isConnected && !isReporting) {
          console.log('🔄 Connection restored, restarting OBD reporting...');
          initializeObdSystem();
        }
      } catch (error) {
        console.error('❌ Connection monitor error:', error);
      }
    }, 5000);

    // Event listeners
    const obdEldDataListener = JMBluetoothService.addEventListener(
      'onObdEldDataReceived',
      (_data: ObdEldData) => {
        const displayDataFn = handleData(_data);
        setObdDisplayData(displayDataFn);
        setDataReceived(true);
        setIsReporting(true);
      },
    );

    const obdVinDataListener = JMBluetoothService.addEventListener(
      'onObdVinDataReceived',
      (data: any) => {
        console.log('📋 onObdVinDataReceived:', data);
        setVinData(data);
      },
    );

    const obdErrorDataListener = JMBluetoothService.addEventListener(
      'onObdErrorDataReceived',
      (data: any) => {
        console.log('📋 onObdErrorDataReceived:', data);
        const errorItems: OBDDataItem[] = [];
        if (data.ecuList && Array.isArray(data.ecuList)) {
          data.ecuList.forEach((ecu: any, ecuIndex: number) => {
            if (ecu.errorCodeList && Array.isArray(ecu.errorCodeList)) {
              ecu.errorCodeList.forEach(
                (errorCode: string, codeIndex: number) => {
                  errorItems.push({
                    id: `error_${ecuIndex}_${codeIndex}`,
                    name: `ECU ${ecu.ecuId || ecuIndex}`,
                    value: errorCode,
                    unit: '',
                    isError: true,
                  });
                },
              );
            }
          });
        }
        setErrorData(errorItems);
      },
    );

    const disconnectedListener = JMBluetoothService.addEventListener(
      'onDisconnected',
      () => {
        console.log('❌ Device disconnected');
        setIsReporting(false);
        setDataReceived(false);
      },
    );

    // Cleanup
    return () => {
      clearInterval(connectionMonitor);
      JMBluetoothService.removeEventListener(obdEldDataListener);
      JMBluetoothService.removeEventListener(obdVinDataListener);
      JMBluetoothService.removeEventListener(obdErrorDataListener);
      JMBluetoothService.removeEventListener(disconnectedListener);
    };
  }, [initializeObdSystem, isReporting, fadeAnim, scaleAnim]);

    // Render item for data list

  // Render item for error list

  return (
    <View> data </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '400',
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  vinContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  mainGaugesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  gaugeWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 5,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gaugeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  gaugeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },
  smallGaugesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  smallGaugeWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 2,
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  smallGaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  smallGaugeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
    textAlign: 'center',
  },
  hiddenLabel: {
    opacity: 0,
    fontSize: 1,
  },
  debugSection: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 10,
  },
  debugGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  debugItem: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    width: '50%',
    marginBottom: 4,
  },
  errorSection: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 10,
  },
  errorItem: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  statusContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
   dataUnit: {
    fontSize: 14,
    color: '#041032',
    flex: 1,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#828899',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#828899',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#161E28',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#161E28',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: '#161E28',
  },
  vinValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#041032',
    marginLeft: 8,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#161E28',
    marginBottom: 12,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDE0E7',
    maxHeight: 1560,
  },
  dataItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  dataName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#041032',
    marginBottom: 4,
  },
 
  dataValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dataValueLabel: {
    fontSize: 14,
    color: '#828899',
    marginRight: 8,
  },
  dataValue: {
    fontSize: 14,
    color: '#041032',
    flex: 1,
  },
  dataUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataUnitLabel: {
    fontSize: 14,
    color: '#828899',
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#6B7280',
  },
  premiumBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B35',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  
});

export default ObdDataScreen;
