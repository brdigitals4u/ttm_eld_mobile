import { Stack } from 'expo-router';
import React from 'react';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';

export default function AppLayout() {
  // Initialize navigation analytics
  useNavigationAnalytics();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vehicle-setup" />
      <Stack.Screen name="eld-pairing" />
      <Stack.Screen name="status-update" />
      <Stack.Screen name="inspector-mode" />
      <Stack.Screen name="select-vehicle" />
      <Stack.Screen name="select-demo-vehicle" />
    </Stack>
  );
}