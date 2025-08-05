import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from 'react-native';
import Button from '@/components/Button';
import { useTheme } from '@/context/theme-context';
import OBDToolsSDK, { OBDTool, DiagnosticData } from './sdk/OBDToolsSDK';

export default function OBDTools() {
  const { colors } = useTheme();
  const [tools, setTools] = useState<OBDTool[]>([]);
  const [connectedTool, setConnectedTool] = useState<OBDTool | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [data, setData] = useState<DiagnosticData | null>(null);

  const requestPermissions = useCallback(async () => {
    const granted = await OBDToolsSDK.requestPermissions();
    if (granted) {
      console.log('Permissions granted.');
    }
  }, []);

  const scanTools = useCallback(async () => {
    setIsScanning(true);
    const foundTools = await OBDToolsSDK.scanTools();
    setTools(foundTools);
    setIsScanning(false);
  }, []);

  const connectToTool = useCallback(async (tool: OBDTool) => {
    setIsConnecting(true);
    const success = await OBDToolsSDK.connectToTool(tool);
    setIsConnecting(false);
    if (success) {
      setConnectedTool(tool);
      // Start data stream
      const cleanup = OBDToolsSDK.startDataStream(setData);
      return () => cleanup();
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (connectedTool) {
      await OBDToolsSDK.disconnect();
      setConnectedTool(null);
      setData(null);
    }
  }, [connectedTool]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>

        <Button title="Scan for Tools" onPress={scanTools} loading={isScanning} />

        {tools.map((tool) => (
          <View key={tool.id} style={styles.toolRow}>
            <Text style={{ color: colors.text }}>{tool.name}</Text>
            <Button
              title="Connect"
              onPress={() => connectToTool(tool)}
              loading={isConnecting && connectedTool?.id === tool.id}
            />
          </View>
        ))}

        {connectedTool && data && (
          <View style={styles.dataContainer}>
            <Text style={[styles.dataTitle, { color: colors.text }]}>Connected to {connectedTool.name}</Text>
            <Text style={{ color: colors.text }}>RPM: {data.liveData.rpm}</Text>
            <Text style={{ color: colors.text }}>Speed: {data.liveData.speed} km/h</Text>
            <Text style={{ color: colors.text }}>Engine Temperature: {data.liveData.engineTemp} °C</Text>
            <Text style={{ color: colors.text }}>Fuel Level: {data.liveData.fuelLevel}%</Text>
            <Text style={{ color: colors.text }}>O2 Sensor: {data.liveData.o2Sensor} V</Text>
            <Text style={{ color: colors.text }}>MAF: {data.liveData.maf} g/s</Text>
            <Button title="Disconnect" onPress={disconnect} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  dataContainer: {
    marginTop: 20,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
