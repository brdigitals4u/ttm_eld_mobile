import { router } from 'expo-router';
import { ArrowLeft, Bluetooth, RefreshCw, Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseLogger } from '@/src/services/FirebaseService';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useAuth } from '@/context/auth-context';
import { useEld } from '@/context/eld-context';
import { useTheme } from '@/context/theme-context';
import { EldDevice } from '@/types/eld';

// Check if running on web
const isWeb = false;

export default function EldPairingScreen() {
  const { colors, isDark } = useTheme();
  const { startScan, stopScan, devices, isScanning, connectToDevice, error } = useEld();
  const { vehicleInfo, setVehicleInfo } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<EldDevice | null>(null);
  const [pairingCode, setPairingCode] = useState('123456');

  useEffect(() => {
    if (!isWeb) {
      // Start scanning when the screen loads
      startScan();
    }

    return () => {
      if (!isWeb) {
        stopScan();
      }
    };
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleRefreshScan = async () => {
    try {
      await FirebaseLogger.logEvent('eld_refresh_scan_clicked', {
        screen: 'eld_pairing',
        action: 'refresh_scan_button'
      });
    } catch (error) {
      FirebaseLogger.recordError(error as Error);
    }
    
    if (!isWeb) {
      startScan();
    } else {
      Alert.alert('Web Limitation', 'Bluetooth scanning is not available on web.');
    }
  };

  const handleDeviceSelect = async (device: EldDevice) => {
    try {
      await FirebaseLogger.logEvent('eld_device_selected', {
        screen: 'eld_pairing',
        action: 'device_select',
        device_id: device.id,
        device_name: device.name || 'unknown'
      });
    } catch (error) {
      FirebaseLogger.recordError(error as Error);
    }
    setSelectedDevice(device);
  };

  const handleBackPress = async () => {
    try {
      await FirebaseLogger.logEvent('eld_pairing_back_pressed', {
        screen: 'eld_pairing',
        action: 'back_button'
      });
    } catch (error) {
      FirebaseLogger.recordError(error as Error);
    }
    router.back();
  };

const handlePairDevice = async () => {
    if (!selectedDevice) return;

    if (isWeb) {
      Alert.alert('Web Limitation', 'Bluetooth connection is not available on web.');
      
      // For web demo, simulate a successful connection
      if (vehicleInfo) {
        const updatedVehicleInfo = {
          ...vehicleInfo,
          eldConnected: true,
          eldId: selectedDevice.id,
        };
        await setVehicleInfo(updatedVehicleInfo);
      }
      
      router.replace('/(app)/(tabs)');
      return;
    }

    // Prompt for machine number first
    Alert.prompt(
      'Machine Number',
      'Enter the machine number for the ELD device:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Pairing cancelled'),
        },
        {
          text: 'Next',
          onPress: async (machineNumber) => {
            if (!machineNumber?.trim()) {
              Alert.alert('Error', 'Machine number is required');
              return;
            }

            // Prompt for passcode
            Alert.prompt(
              'Passcode',
              'Enter the passcode for the ELD device:',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => console.log('Passcode cancelled'),
                },
                {
                  text: 'Connect',
                  onPress: async (passcode) => {
                    if (!passcode?.trim()) {
                      Alert.alert('Error', 'Passcode is required');
                      return;
                    }

                    try {
                      // Check for Bluetooth permissions
                      if (Platform.OS === 'android') {
                        const { PermissionsAndroid } = require('react-native');
                        const permissions = [
                          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        ];
                        
                        const granted = await PermissionsAndroid.requestMultiple(permissions);
                        const allGranted = Object.values(granted).every(
                          status => status === PermissionsAndroid.RESULTS.GRANTED
                        );
                        
                        if (!allGranted) {
                          Alert.alert('Permission Denied', 'Bluetooth permissions are required to connect.');
                          return;
                        }
                      }

                      // Import TTMBLEManager and connect with proper parameters
                      const TTMBLEManager = require('../../src/utils/TTMBLEManager').default;
                      
                      // Use machine number as imei and set needPair to true
                      await TTMBLEManager.connect(
                        selectedDevice.address || selectedDevice.id, 
                        machineNumber.trim(), 
                        true
                      );

                      if (vehicleInfo) {
                        const updatedVehicleInfo = {
                          ...vehicleInfo,
                          eldConnected: true,
                          eldId: selectedDevice.id,
                          machineNumber: machineNumber.trim(),
                        };
                        await setVehicleInfo(updatedVehicleInfo);
                      }

                      router.replace('/(app)/(tabs)');
                    } catch (error) {
                      console.error('Failed to pair device:', error);
                      Alert.alert('Pairing Error', 'Failed to pair with the device. Please try again.');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSkip = () => {
    router.replace('/(app)/(tabs)');
  };

  const renderDeviceItem = ({ item }: { item: EldDevice }) => (
    <Card
      style={[
        styles.deviceCard,
        {
          borderColor: selectedDevice?.id === item.id ? colors.primary : 'transparent',
          borderWidth: selectedDevice?.id === item.id ? 2 : 0,
        },
      ]}
      onTouchEnd={() => handleDeviceSelect(item)}
    >
      <View style={styles.deviceInfo}>
        <Bluetooth size={24} color={colors.primary} />
        <View style={styles.deviceDetails}>
          <Text style={[styles.deviceName, { color: colors.text }]}>
            {item.name || 'Unknown Device'}
          </Text>
          <Text style={[styles.deviceAddress, { color: colors.inactive }]}>
            {item.address}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.header}>
        <Truck size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>ELD Pairing</Text>
        <Text style={[styles.subtitle, { color: colors.inactive }]}>
          Connect your Electronic Logging Device
        </Text>
      </View>

      <View style={styles.content}>
        {isWeb ? (
          <Card>
            <Text style={[styles.webNotice, { color: colors.text }]}>
              Bluetooth functionality is limited on web browsers. In a real device, you would see available ELD devices here.
            </Text>
            <Text style={[styles.webNoticeSubtext, { color: colors.inactive }]}>
              For demo purposes, you can select from the simulated devices below.
            </Text>
          </Card>
        ) : null}

        <View style={styles.scanHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Devices
          </Text>
          <Button
            title={isScanning ? 'Scanning...' : 'Refresh'}
            onPress={handleRefreshScan}
            variant="outline"
            icon={<RefreshCw size={16} color={colors.primary} />}
            disabled={isScanning}
          />
        </View>

        {devices.length === 0 && !isScanning ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.inactive }]}>
              No devices found. Make sure your ELD is powered on and in pairing mode.
            </Text>
          </Card>
        ) : (
          <FlatList
            data={!isWeb ? devices : [
              // Mock devices for web demo
              { id: 'eld-001', name: 'ELD Device 1', address: '00:11:22:33:44:55', isConnected: false },
              { id: 'eld-002', name: 'ELD Device 2', address: '55:44:33:22:11:00', isConnected: false },
              { id: 'eld-003', name: 'TruckLog ELD', address: '12:34:56:78:90:AB', isConnected: false },
            ]}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id}
            style={styles.deviceList}
            contentContainerStyle={styles.deviceListContent}
          />
        )}

        {selectedDevice && (
          <Card style={styles.pairingCard}>
            <Text style={[styles.pairingTitle, { color: colors.text }]}>
              Pairing Information
            </Text>
            <Text style={[styles.pairingInstructions, { color: colors.inactive }]}>
              Tap the ELD device and enter this pairing code:
            </Text>
            <Text style={[styles.pairingCode, { color: colors.primary }]}>
              {pairingCode}
            </Text>
          </Card>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Pair Device"
            onPress={handlePairDevice}
            disabled={!selectedDevice}
            fullWidth
          />
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    paddingBottom: 16,
  },
  deviceCard: {
    marginVertical: 8,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deviceAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
  },
  pairingCard: {
    marginTop: 16,
    alignItems: 'center',
  },
  pairingTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  pairingInstructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  pairingCode: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 2,
  },
  buttonContainer: {
    marginTop: 24,
  },
  webNotice: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  webNoticeSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});