import { Tabs } from 'expo-router';
import { ClipboardList, FileText, Home, Settings, Truck, User, Users, Bluetooth,} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { useNavigationAnalytics } from '@/src/hooks/useNavigationAnalytics';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();
  const { trackTabPress } = useAnalytics();
  const currentTab = useRef<string>('');
  
  // Use navigation analytics for automatic tracking
  const { currentPath } = useNavigationAnalytics();

  // Track tab-specific analytics
  useEffect(() => {
    const tabSegment = segments[segments.length - 1];
    if (tabSegment && tabSegment !== currentTab.current) {
      if (currentTab.current) {
        // Track tab press (not initial load)
        trackTabPress(tabSegment, currentTab.current, {
          tab_title: getTabTitle(tabSegment),
          from_tab_title: getTabTitle(currentTab.current),
        });

        
      }
      currentTab.current = tabSegment;
    }
  }, [segments, trackTabPress]);

  const getTabTitle = (tabName: string): string => {
    const tabTitles: Record<string, string> = {
      'index': 'Dashboard',
      'status': 'Status',
      'logs': 'Logs',
      'more': 'More',
      'profile': 'Profile'
    };
    return tabTitles[tabName];
  };

  return (
    <>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
      <Tabs
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
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }: any) => <FileText color={color} size={size} />,
        }}
      />
       <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: any) => <Settings color={color} size={size} />,
        }}
      />
      </Tabs>
    </>
  );
}