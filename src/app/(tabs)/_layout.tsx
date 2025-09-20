import React from 'react'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useAppTheme } from '@/theme/context'

// Import icons (you can use any icon library)
// For now, we'll use text-based tabs
export default function TabLayout() {
  const { theme } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.tintInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.separator,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 32 : 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          headerTitle: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerTitle: 'Profile',
        }}
      />
    </Tabs>
  )
}
