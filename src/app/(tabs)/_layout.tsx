import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui'
import { Pressable, StyleSheet, Platform } from 'react-native'
import { Icon } from '@/components/Icon'
import { COLORS } from '@/constants/colors'
import { Text } from '@/components/Text'

function CustomTabButton({ isFocused, icon, label, ...props }: any) {
  return (
    <Pressable
      {...props}
      style={[
        styles.tabItem,
        isFocused && styles.tabActive,
      ]}
    >
      <Icon icon={icon} size={22} color={!isFocused ? COLORS.white : COLORS.primary} />
      <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
    </Pressable>
  )
}

export default function Layout() {
  return (
    <Tabs>
      <TabSlot /> {/* Renders the selected screen */}
      <TabList style={styles.tabBarContainer}>
        <TabTrigger name="dashboard" href="/dashboard" asChild>
          <CustomTabButton icon="menu" label="Home" />
        </TabTrigger>
        <TabTrigger name="logs" href="/logs" asChild>
          <CustomTabButton icon="view" label="Logs" />
        </TabTrigger>
        <TabTrigger name="fuel" href="/fuel" asChild>
          <CustomTabButton icon="bell" label="Fuel" />
        </TabTrigger>
        <TabTrigger name="support" href="/support" asChild>
          <CustomTabButton icon="bell" label="Support" />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <CustomTabButton icon="user" label="Profile" />
        </TabTrigger>
      </TabList>
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    marginBottom: Platform.OS === 'ios' ? 24 : 36,
    elevation: 8,                   // Android shadow
    shadowColor: "#000",            // iOS shadow
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 24,
    marginHorizontal: 4,
    backgroundColor: "transparent",
    // more style as needed
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  label: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
  },
  labelActive: {
    color: "#222",
    fontWeight: "500",
  },
})
