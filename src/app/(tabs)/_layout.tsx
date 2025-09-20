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
          tabBarLabel: 'Home',
          headerTitle: 'Dashboard',
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
          headerTitle: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="view" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="hos"
        options={{
          title: 'HOS',
          tabBarLabel: 'HOS',
          headerTitle: 'Hours of Service',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="check" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarLabel: 'Fuel',
          headerTitle: 'Fuel Receipts',
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
          headerTitle: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon icon="user" color={color} size={size} />
          ),
        }}
      />
      
    </Tabs>
  )
}
