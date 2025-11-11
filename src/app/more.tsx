// MoreScreen.tsx
import React from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native"
import { router } from "expo-router"
import { useAppTheme } from "@/theme/context"
import { Icon } from "@/components/Icon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ArrowLeft, User } from "lucide-react-native"
import { Header } from "@/components/Header"
import { colors } from "@/theme/colors"
import { useAuth } from "@/stores/authStore"
import { translate } from "@/i18n/translate"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

/**
 * Modernized More / Settings screen for drivers.
 * - Big driver header with avatar + unit + quick status
 * - Quick Action card (call, msg, inspections, DVIR)
 * - Grouped menu items inside a card with large tappable rows
 * - Subtle shadows, theme-aware colors, accessible touch targets
 *
 * Drivers like: big type, single-tap actions, fast access to DVIR/inspections,
 * ability to call fleet or co-driver, clear vehicle info, and quick status.
 */

export default function MoreScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const insets = useSafeAreaInsets()
  const { user, driverProfile, vehicleAssignment } = useAuth()

  // Menu items grouped
  const primaryItems = [
    {
      title: "DVIR",
      subtitle: "Driver Vehicle Inspection Report",
      icon: "check",
      onPress: () => router.push("/dvir"),
    },
    {
      title: "Inspection",
      subtitle: "Vehicle inspection checklist",
      icon: "check",
      onPress: () => router.push("/inspection"),
    },
    {
      title: "Inspector Mode",
      subtitle: "DOT inspection interface",
      icon: "lock",
      onPress: () => router.push("/inspector-mode"),
    },
  ]

  const secondaryItems = [
    {
      title: "Assignments",
      subtitle: "Vehicle & load assignments",
      icon: "menu",
      onPress: () => router.push("/assignments"),
    },
    {
      title: "Assets",
      subtitle: "Vehicle & trailer management",
      icon: "view",
      onPress: () => router.push("/assets"),
    },
    {
      title: "Carrier",
      subtitle: "Carrier information & contacts",
      icon: "more",
      onPress: () => router.push("/carrier"),
    },
    {
      title: "Co-Driver",
      subtitle: "Manage co-driver information",
      icon: "user",
      onPress: () => router.push("/codriver"),
    },
  ]

  const settingsItems = [
    {
      title: translate("more.settings" as any),
      subtitle: "App preferences and configuration",
      icon: "settings",
      onPress: () => router.push("/settings"),
    },
  ]

  // Get driver data from auth store
  const driverName = driverProfile?.name || `${user?.firstName} ${user?.lastName}` || "Driver"
  const vehicleUnit = vehicleAssignment?.vehicle_info?.vehicle_unit || "No Unit Assigned"
  const company = driverProfile?.organization_name || "TTM Konnect"

  return (
    <View style={{ flex: 1 }}>   <Header
      title={translate("more.title" as any)}
      titleMode="center"
      backgroundColor={colors.background}
      titleStyle={{
        fontSize: 22,
        fontWeight: "800",
        color: colors.text,
        letterSpacing: 0.3,
      }}
      leftIcon="back"
      leftIconColor={colors.tint}
      onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
      containerStyle={{
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.06)",
        shadowColor: colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
      }}
      style={{
        paddingHorizontal: 16,
      }}
      safeAreaEdges={["top"]}
    />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >


        {/* Driver Card */}
        <View style={[styles.driverCard, { backgroundColor: colors.surface, shadowColor: colors.tint }]}>
          <View style={styles.driverLeft}>
            {/* use Image or SVG avatar; falling back to Icon */}
            <View style={[styles.avatar, { backgroundColor: colors.tint + "15", borderColor: colors.tint }]}>
              {/* If you have an avatar url, use <Image /> */}
              <User size={28} color={colors.tint} />
            </View>
          </View>

          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: colors.text }]}>{driverName}</Text>
            <Text style={[styles.driverMeta, { color: colors.textDim }]}>
              {company} • {vehicleUnit}
            </Text>

          </View>

          <View style={styles.driverRight}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={styles.viewProfileButton}>
              <Text style={[styles.viewProfileText, { color: colors.tint }]}>View</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Tools */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Primary Tools</Text>

          {primaryItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.tint + "15" }]}>
                <Icon icon={item.icon as any} color={colors.tint} size={18} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textDim }]}>{item.subtitle}</Text>
              </View>
              <Icon icon="caretRight" color={colors.textDim} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Fleet Management */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Fleet</Text>

          {secondaryItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.tint + "08" }]}>
                <Icon icon={item.icon as any} color={colors.tint} size={18} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textDim }]}>{item.subtitle}</Text>
              </View>
              <Icon icon="caretRight" color={colors.textDim} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{translate("more.settings" as any)}</Text>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {settingsItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.tint + "12" }]}>
                <Icon icon={item.icon as any} color={colors.tint} size={18} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textDim }]}>{item.subtitle}</Text>
              </View>
              <Icon icon="caretRight" color={colors.textDim} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Extra spacing for bottom safe area */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "flex-start",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  driverCard: {
    width: "100%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  driverLeft: {
    marginRight: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: {
    flex: 1,
    justifyContent: "center",
  },
  driverName: {
    fontSize: 16,
    fontWeight: "800",
  },
  driverMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  driverRight: {
    marginLeft: 8,
  },
  viewProfileButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewProfileText: {
    fontWeight: "700",
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    width: "100%",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    // subtle card shadow kept by OS theme
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickAction: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    flexDirection: "row",
    gap: 8,
  },
  quickActionLabel: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 13,
  },

  // menu item styles
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
})
