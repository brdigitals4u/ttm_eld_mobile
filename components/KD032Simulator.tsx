import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { startKD032Simulator, stopKD032Simulator, getKD032SimulatorStatus } from '../services/EldSimulator';

interface KD032SimulatorProps {
  onSimulatorStarted?: () => void;
  onSimulatorStopped?: () => void;
}

export default function KD032Simulator({ onSimulatorStarted, onSimulatorStopped }: KD032SimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleStartSimulator = () => {
    try {
      startKD032Simulator();
      setIsRunning(true);
      Alert.alert(
        'KD032 Simulator Started', 
        'KD032-43149A device is now advertising.\n\nStart scanning in your app to see it in the device list.',
        [{ text: 'OK' }]
      );
      onSimulatorStarted?.();
    } catch (error) {
      Alert.alert('Error', `Failed to start simulator: ${error}`);
    }
  };

  const handleStopSimulator = () => {
    try {
      stopKD032Simulator();
      setIsRunning(false);
      Alert.alert('KD032 Simulator Stopped', 'The virtual KD032 device has been stopped.');
      onSimulatorStopped?.();
    } catch (error) {
      Alert.alert('Error', `Failed to stop simulator: ${error}`);
    }
  };

  const handleCheckStatus = () => {
    try {
      const status = getKD032SimulatorStatus();
      Alert.alert(
        'Simulator Status',
        `Advertising: ${status.isAdvertising ? 'Yes' : 'No'}\n` +
        `Connected: ${status.isConnected ? 'Yes' : 'No'}\n` +
        `Device: ${status.deviceName}\n` +
        `Address: ${status.deviceAddress}`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to get status: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>KD032 ELD Simulator</Text>
        <Text style={styles.subtitle}>Test with virtual KD032-43149A device</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, isRunning && styles.disabledButton]}
          onPress={handleStartSimulator}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Start Simulator</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.stopButton, !isRunning && styles.disabledButton]}
          onPress={handleStopSimulator}
          disabled={!isRunning}
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
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Device Details:</Text>
        <Text style={styles.infoText}>• Name: KD032-43149A</Text>
        <Text style={styles.infoText}>• Address: C4:A8:28:43:14:9A</Text>
        <Text style={styles.infoText}>• No passcode required</Text>
        <Text style={styles.infoText}>• Transmits realistic ELD data</Text>
      </View>
      
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Testing Instructions:</Text>
        <Text style={styles.instructionText}>1. Start the simulator above</Text>
        <Text style={styles.instructionText}>2. Go to your app's device scan screen</Text>
        <Text style={styles.instructionText}>3. Start scanning for devices</Text>
        <Text style={styles.instructionText}>4. Look for "KD032-43149A" in results</Text>
        <Text style={styles.instructionText}>5. Connect without passcode</Text>
        <Text style={styles.instructionText}>6. Watch ELD data transmit</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  statusButton: {
    backgroundColor: '#3B82F6',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  instructionsContainer: {
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
}); 