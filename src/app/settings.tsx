import React, { useState, useEffect } from "react"
import { Pressable, ScrollView, StyleSheet, Switch, View, TouchableOpacity } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { ArrowLeft, Bell, Moon, Smartphone, Sun, Clock } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import ElevatedCard from "@/components/EvevatedCard"
import { HistoryFetchSheet } from "@/components/HistoryFetchSheet"
import { Text } from "@/components/Text"
import { useObdData } from "@/contexts/obd-data-context"
import { useAppTheme } from "@/theme/context"

export default function SettingsScreen() {
  const { theme, setThemeContextOverride } = useAppTheme()
  const { colors, isDark } = theme
  const setThemeMode = setThemeContextOverride
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [showHistoryFetchSheet, setShowHistoryFetchSheet] = useState(false)
  const insets = useSafeAreaInsets()
  const { refreshConnectionStatus } = useObdData()

  // Refresh connection status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("📱 Settings: Screen focused - refreshing ELD connection status...")
      refreshConnectionStatus().catch((error) => {
        console.warn("⚠️ Settings: Failed to refresh connection status:", error)
      })
    }, [refreshConnectionStatus]),
  )

  const handleThemeToggle = () => {
    setThemeMode(isDark ? "light" : "dark")
  }

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled)
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>App Settings</Text>
      </View>

      <ElevatedCard style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              {isDark ? (
                <Moon size={20} color={colors.tint} />
              ) : (
                <Sun size={20} color={colors.tint} />
              )}
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Theme</Text>
              <Text style={[styles.settingDescription, { color: colors.textDim }]}>
                Switch between light and dark mode
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeToggle}
            trackColor={{ false: "#767577", true: colors.tint }}
            thumbColor="#f4f3f4"
          />
        </View>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Bell size={20} color={colors.tint} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Enable Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textDim }]}>
                Receive alerts for HOS updates
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: "#767577", true: colors.tint }}
            thumbColor="#f4f3f4"
          />
        </View>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>ELD History</Text>

        <TouchableOpacity style={styles.settingRow} onPress={() => setShowHistoryFetchSheet(true)}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Clock size={20} color={colors.tint} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Fetch History Data</Text>
              <Text style={[styles.settingDescription, { color: colors.textDim }]}>
                Download historical ELD records from device
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Device Information</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Smartphone size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.1</Text>
          </View>
        </View>
      </ElevatedCard>

      <Text style={[styles.footerText, { color: colors.textDim }]}>TTM Konnect © 2025</Text>
      <Text
        style={[{ color: colors.textDim }, { marginTop: 2, textAlign: "center", fontSize: 10 }]}
      >
        Powered by TTM247
      </Text>

      {/* ELD History Fetch Sheet */}
      <HistoryFetchSheet
        visible={showHistoryFetchSheet}
        onDismiss={() => setShowHistoryFetchSheet(false)}
        onComplete={(recordsCount) => {
          console.log(`✅ History fetch completed: ${recordsCount} records`)
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingBottom: 20,
    paddingHorizontal: 0,
    paddingTop: 40,
  },
  infoContent: {
    flex: 1,
  },
  infoIcon: {
    alignItems: "center",
    width: 40,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  settingIconContainer: {
    alignItems: "center",
    width: 40,
  },
  settingInfo: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 24,
    marginTop: 12,
  },
})
