import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vehicle-setup" />
      <Stack.Screen name="eld-pairing" />
      <Stack.Screen name="status-update" />
      <Stack.Screen name="inspector-mode" />
      <Stack.Screen name="select-vehicle" />
    </Stack>
  );
}