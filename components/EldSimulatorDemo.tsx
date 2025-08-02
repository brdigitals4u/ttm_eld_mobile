// components/EldSimulatorDemo.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { startKD032Simulator, stopKD032Simulator, getKD032SimulatorStatus } from '../services/EldSimulator';

interface SimulatorStatus {
  isAdvertising: boolean;
  isConnected: boolean;
  deviceName: string;
  deviceAddress: string;
  serviceUuid: string;
  characteristicUuid: string;
}

export default function EldSimulatorDemo() {
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [status, setStatus] = useState<SimulatorStatus | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  useEffect(() => {
    // Add console log interceptor to capture simulator messages
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('KD032 Simulator')) {
        setLogMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
      }
      originalLog(...args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const handleStartSimulator = () => {
    try {
      startKD032Simulator();
      setIsSimulatorRunning(true);
      Alert.alert('Success', 'KD032 Simulator started! The device should now appear in your scan results.');
    } catch (error) {
      Alert.alert('Error', `Failed to start simulator: ${error}`);
    }
  };

  const handleStopSimulator = () => {
    try {
      stopKD032Simulator();
      setIsSimulatorRunning(false);
      Alert.alert('Success', 'KD032 Simulator stopped!');
    } catch (error) {
      Alert.alert('Error', `Failed to stop simulator: ${error}`);
    }
  };

  const handleCheckStatus = () => {
    try {
      const currentStatus = getKD032SimulatorStatus();
      setStatus(currentStatus);
    } catch (error) {
      Alert.alert('Error', `Failed to get status: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogMessages([]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>KD032 ELD Device Simulator</Text>
        <Text style={styles.subtitle}>Test your app with a simulated KD032 device</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Device Name:</Text> KD032-43149A
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Device Address:</Text> C4:A8:28:43:14:9A
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Service UUID:</Text> 0000ffe0-0000-1000-8000-00805f9b34fb
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Characteristic UUID:</Text> 0000ffe1-0000-1000-8000-00805f9b34fb
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simulator Controls</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.startButton, isSimulatorRunning && styles.disabledButton]}
            onPress={handleStartSimulator}
            disabled={isSimulatorRunning}
          >
            <Text style={styles.buttonText}>Start Simulator</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.stopButton, !isSimulatorRunning && styles.disabledButton]}
            onPress={handleStopSimulator}
            disabled={!isSimulatorRunning}
          >
            <Text style={styles.buttonText}>Stop Simulator</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.statusButton]}
          onPress={handleCheckStatus}
        >
          <Text style={styles.buttonText}>Check Status</Text>
        </TouchableOpacity>
      </View>

      {status && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              <Text style={styles.label}>Advertising:</Text> {status.isAdvertising ? '✅ Yes' : '❌ No'}
            </Text>
            <Text style={styles.statusText}>
              <Text style={styles.label}>Connected:</Text> {status.isConnected ? '✅ Yes' : '❌ No'}
            </Text>
            <Text style={styles.statusText}>
              <Text style={styles.label}>Device Name:</Text> {status.deviceName}
            </Text>
            <Text style={styles.statusText}>
              <Text style={styles.label}>Device Address:</Text> {status.deviceAddress}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Simulator Logs</Text>
          <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.logContainer}>
          {logMessages.length === 0 ? (
            <Text style={styles.noLogsText}>No logs yet. Start the simulator to see activity.</Text>
          ) : (
            logMessages.map((message, index) => (
              <Text key={index} style={styles.logMessage}>
                {message}
              </Text>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Instructions</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>1. Start the simulator above</Text>
          <Text style={styles.instructionText}>2. Go to your app's device scan screen</Text>
          <Text style={styles.instructionText}>3. Start scanning for devices</Text>
          <Text style={styles.instructionText}>4. Look for "KD032-43149A" in the scan results</Text>
          <Text style={styles.instructionText}>5. Try connecting to the simulated device</Text>
          <Text style={styles.instructionText}>6. The device should connect without passcode (like real KD032)</Text>
          <Text style={styles.instructionText}>7. ELD data should start transmitting automatically</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoContainer: {
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  statusButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff9800',
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  noLogsText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  logMessage: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  instructionsContainer: {
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
