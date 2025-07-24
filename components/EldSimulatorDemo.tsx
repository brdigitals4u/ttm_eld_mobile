// components/EldSimulatorDemo.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { eldTestConfig, TestMode } from '../services/EldTestConfig';
import { eldSimulator, SimulationScenario, EldDeviceType, SimulatedEldDevice } from '../services/EldSimulator';
import { BLEDevice, NotifyData } from '../src/utils/TTMBLEManager';

interface SimulatorStatus {
  isScanning: boolean;
  connectedDevice: SimulatedEldDevice | null;
  availableDevices: SimulatedEldDevice[];
  currentScenario: SimulationScenario;
  testMode: TestMode;
}

export default function EldSimulatorDemo() {
  const [status, setStatus] = useState<SimulatorStatus | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
  const [eldData, setEldData] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    const initializeSimulator = async () => {
      try {
        eldTestConfig.setTestMode(TestMode.SIMULATOR);
        eldTestConfig.enableDebugMode(true);
        await eldTestConfig.initialize();
        addLog('ELD Simulator initialized');
        updateStatus();
      } catch (error) {
        addLog(`Initialization failed: ${error}`);
      }
    };

    initializeSimulator();

    // Set up event listeners
    const deviceScannedListener = eldSimulator.onDeviceScanned((device: BLEDevice) => {
      setDiscoveredDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (!exists) {
          addLog(`Device discovered: ${device.name}`);
          return [...prev, device];
        }
        return prev;
      });
    });

    const connectedListener = eldSimulator.onConnected(() => {
      addLog('Device connected successfully');
      updateStatus();
    });

    const disconnectedListener = eldSimulator.onDisconnected(() => {
      addLog('Device disconnected');
      updateStatus();
    });

    const connectFailureListener = eldSimulator.onConnectFailure((error) => {
      addLog(`Connection failed: ${error.message}`);
      updateStatus();
    });

    const authenticationListener = eldSimulator.onAuthenticationPassed(() => {
      addLog('Device authentication passed');
    });

    const dataListener = eldSimulator.onNotifyReceived((data: NotifyData) => {
      addLog(`Data received: ${data.dataType}`);
      setEldData(prev => [data.rawData, ...prev.slice(0, 4)]);
    });

    return () => {
      deviceScannedListener.remove();
      connectedListener.remove();
      disconnectedListener.remove();
      connectFailureListener.remove();
      authenticationListener.remove();
      dataListener.remove();
    };
  }, []);

  const updateStatus = () => {
    const simulatorStatus = eldTestConfig.getSimulatorStatus();
    setStatus(simulatorStatus);
  };

  const handleScan = async () => {
    try {
      setDiscoveredDevices([]);
      addLog('Starting device scan...');
      await eldSimulator.startScan(10000);
      updateStatus();
    } catch (error) {
      addLog(`Scan failed: ${error}`);
    }
  };

  const handleStopScan = async () => {
    try {
      await eldSimulator.stopScan();
      addLog('Scan stopped');
      updateStatus();
    } catch (error) {
      addLog(`Stop scan failed: ${error}`);
    }
  };

  const handleConnect = async (device: BLEDevice) => {
    try {
      const availableDevices = eldSimulator.getAvailableDevices();
      const fullDevice = availableDevices.find(d => d.address === device.address);
      
      if (!fullDevice) {
        Alert.alert('Error', 'Device details not found');
        return;
      }

      addLog(`Connecting to ${device.name}...`);
      await eldSimulator.connect(device.address, fullDevice.imei);
      updateStatus();
    } catch (error) {
      addLog(`Connection failed: ${error}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await eldSimulator.disconnect();
      updateStatus();
    } catch (error) {
      addLog(`Disconnect failed: ${error}`);
    }
  };

  const handleStartDataStream = async () => {
    try {
      await eldSimulator.startReportEldData();
      addLog('ELD data streaming started');
    } catch (error) {
      addLog(`Data stream failed: ${error}`);
    }
  };

  const handleScenarioChange = (scenario: SimulationScenario) => {
    eldTestConfig.setSimulationScenario(scenario);
    addLog(`Scenario changed to: ${scenario}`);
    updateStatus();
  };

  const handleRunTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
      addLog(`Running test: ${testName}`);
      await testFn();
      addLog(`Test completed: ${testName}`);
    } catch (error) {
      addLog(`Test failed: ${testName} - ${error}`);
    }
  };

  const handleConnectivityTest = async () => {
    const result = await eldTestConfig.runConnectivityTest();
    Alert.alert(
      'Connectivity Test',
      `Success: ${result.success}\n\nDetails: ${result.details}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ELD Simulator Demo</Text>
      
      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        {status && (
          <View>
            <Text>Test Mode: {status.testMode}</Text>
            <Text>Scenario: {status.currentScenario}</Text>
            <Text>Scanning: {status.isScanning ? 'Yes' : 'No'}</Text>
            <Text>Connected: {status.connectedDevice ? status.connectedDevice.name : 'None'}</Text>
            <Text>Available Devices: {status.availableDevices.length}</Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleScan}>
            <Text style={styles.buttonText}>Scan Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleStopScan}>
            <Text style={styles.buttonText}>Stop Scan</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={handleDisconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleStartDataStream}>
            <Text style={styles.buttonText}>Start Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Discovered Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovered Devices ({discoveredDevices.length})</Text>
        {discoveredDevices.map((device) => (
          <TouchableOpacity 
            key={device.id} 
            style={styles.deviceItem}
            onPress={() => handleConnect(device)}
          >
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceDetails}>
              {device.address} | Signal: {device.signal}dBm
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Simulation Scenarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simulation Scenarios</Text>
        <View style={styles.scenarioGrid}>
          {
            Object.values(SimulationScenario).map((scenario) => (
              <TouchableOpacity 
                key={scenario}
                style={[
                  styles.scenarioButton,
                  status?.currentScenario === scenario && styles.activeScenario
                ]}
                onPress={() => handleScenarioChange(scenario)}
              >
                <Text style={styles.scenarioText}>
                  {scenario.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))
          }
        </View>
      </View>

      {/* Test Scenarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Scenarios</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleRunTest('Connection Issues', () => eldTestConfig.simulateConnectionIssues())}
          >
            <Text style={styles.buttonText}>Connection Test</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleRunTest('Auth Failure', () => eldTestConfig.simulateAuthenticationFailure())}
          >
            <Text style={styles.buttonText}>Auth Test</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => handleRunTest('Device Malfunction', () => eldTestConfig.simulateDeviceMalfunction())}
          >
            <Text style={styles.buttonText}>Malfunction Test</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleConnectivityTest}
          >
            <Text style={styles.buttonText}>Full Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ELD Data Stream */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ELD Data Stream</Text>
        {eldData.map((data, index) => (
          <View key={index} style={styles.dataItem}>
            <Text style={styles.dataText}>{data.substring(0, 200)}...</Text>
          </View>
        ))}
      </View>

      {/* Activity Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Log</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deviceItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scenarioButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeScenario: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  scenarioText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  dataItem: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  logText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
