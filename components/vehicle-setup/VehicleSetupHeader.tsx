import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Truck } from 'lucide-react-native';

interface VehicleSetupHeaderProps {
  colors: {
    text: string;
    inactive: string;
    primary: string;
  };
}

export default function VehicleSetupHeader({ colors }: VehicleSetupHeaderProps) {
  return (
    <View style={styles.header}>
      <Truck size={48} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>
        ELD Device Setup
      </Text>
      <Text style={[styles.subtitle, { color: colors.inactive }]}>
        Scan and connect to your Electronic Logging Device
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
}); 