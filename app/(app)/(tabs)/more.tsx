import { router } from 'expo-router';
import { Building, CheckSquare, FileText, Settings, Truck, Users } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from '@/components/Card';
import { useTheme } from '@/context/theme-context';

interface MenuItemProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function MenuItem({ title, subtitle, icon, onPress }: MenuItemProps) {
  const { colors, isDark } = useTheme();
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemIcon}>
            {icon}
          </View>
          <View style={styles.menuItemText}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.inactive }]}>
              {subtitle}
            </Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.inactive }]}>
            ›
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { colors } = useTheme();

  const menuItems = [
    {
      title: 'Co-Drivers',
      subtitle: 'Manage co-drivers and team members',
      icon: <Users size={24} color={colors.primary} />,
      onPress: () => router.push('/codriver'),
    },
    {
      title: 'Pre-Trip Inspection',
      subtitle: 'Perform vehicle safety inspection',
      icon: <CheckSquare size={24} color={colors.primary} />,
      onPress: () => router.push('/inspection'),
    },
    {
      title: 'DOT Inspection Mode',
      subtitle: 'Inspector access to logs and documents',
      icon: <FileText size={24} color={colors.primary} />,
      onPress: () => router.push('/inspector-mode'),
    },
    {
      title: 'My Assets',
      subtitle: 'Manage trucks, trailers, and documents',
      icon: <Truck size={24} color={colors.primary} />,
      onPress: () => router.push('/assets'),
    },
    {
      title: 'Carrier Info',
      subtitle: 'Company and carrier information',
      icon: <Building size={24} color={colors.primary} />,
      onPress: () => router.push('/carrier'),
    },
    {
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      icon: <Settings size={24} color={colors.primary} />,
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        More Features
      </Text>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={item.onPress}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 24,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    marginBottom: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  menuItemArrow: {
    fontSize: 20,
    fontWeight: '300' as const,
  },
});