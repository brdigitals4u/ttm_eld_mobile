import React from 'react'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { Icon } from '@/components/Icon'
export default function TabLayout() {
  const { theme } = useAppTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.tintInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.separator,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 32 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="menu" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarLabel: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="view" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarLabel: 'Fuel',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="bell" color={color} size={size} />
          ),
        }}
      />

  

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="user" color={color} size={size} />
          ),
        }}
      />
      
    </Tabs>
  )
}