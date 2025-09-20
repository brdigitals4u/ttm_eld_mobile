import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAppTheme } from '@/theme/context'
import { Icon } from '@/components/Icon'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MoreScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      icon: 'settings',
      onPress: () => router.push('/settings'),
    },
    {
      title: 'DVIR',
      subtitle: 'Driver Vehicle Inspection Report',
      icon: 'check',
      onPress: () => router.push('/dvir'),
    },
    {
      title: 'Assets',
      subtitle: 'Vehicle and trailer management',
      icon: 'view',
      onPress: () => router.push('/assets'),
    },
    {
      title: 'Assignments',
      subtitle: 'Vehicle and load assignments',
      icon: 'menu',
      onPress: () => router.push('/assignments'),
    },
    {
      title: 'Carrier',
      subtitle: 'Carrier information and details',
      icon: 'more',
      onPress: () => router.push('/carrier'),
    },
    {
      title: 'Co-Driver',
      subtitle: 'Manage co-driver information',
      icon: 'user',
      onPress: () => router.push('/codriver'),
    },
    {
      title: 'Inspection',
      subtitle: 'Vehicle inspection checklist',
      icon: 'check',
      onPress: () => router.push('/inspection'),
    },
    {
      title: 'Inspector Mode',
      subtitle: 'DOT inspection interface',
      icon: 'lock',
      onPress: () => router.push('/inspector-mode'),
    },
  ]

  return (
    <ScrollView 
    style={[styles.container, { backgroundColor: colors.background }]}
    contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20 }]}
  >
    <Text style={[styles.title, { color: colors.text }]}>
      Settings
    </Text>
      <View style={styles.content}>


        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.separator,
                }
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuIcon}>
                <Icon icon={item.icon} color={colors.tint} size={24} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.textDim }]}>
                  {item.subtitle}
                </Text>
              </View>
              <View style={styles.menuArrow}>
                <Icon icon="caretRight" color={colors.textDim} size={16} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  menuContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  menuArrow: {
    marginLeft: 8,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
})