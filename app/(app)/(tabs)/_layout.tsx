import { Tabs } from 'expo-router';
import { ClipboardList, FileText, Fuel, Home, Settings, Truck, User, Users } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';

export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();

  useEffect(() => {
    const trackTabChange = async () => {
      try {
        const currentPath = `/${segments.join('/')}`;
        await analytics().logEvent('tab_changed', {
          route: currentPath,
          user_id: user?.id || 'unknown'
        });
      } catch (error) {
        crashlytics().recordError(error as Error);
      }
    };

    trackTabChange();
  }, [segments]);

  return (
    Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: any) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color, size }: any) => <Truck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }: any) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarIcon: ({ color, size }: any) => <Fuel color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }: any) => <FileText color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}