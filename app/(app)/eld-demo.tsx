// app/(app)/eld-demo.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import EldSimulatorDemo from '@/components/EldSimulatorDemo';

export default function EldDemoScreen() {
  return (
    <View style={styles.container}>
      <EldSimulatorDemo />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
