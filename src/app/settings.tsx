import { ArrowLeft, Bell, Moon, Smartphone, Sun } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import ElevatedCard from '@/components/EvevatedCard';
import { useAppTheme } from '@/theme/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/Text';

export default function SettingsScreen() {
  const { theme, setThemeContextOverride } = useAppTheme();
  const { colors, isDark } = theme;
  const setThemeMode = setThemeContextOverride;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const insets = useSafeAreaInsets();

  const handleThemeToggle = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

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
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Dark Theme
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textDim }]}>
                Switch between light and dark mode
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeToggle}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor="#f4f3f4"
          />
        </View>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>
        
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
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor="#f4f3f4"
          />
        </View>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Device Information
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Smartphone size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              App Version
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              1.0.0
            </Text>
          </View>
        </View>
      </ElevatedCard>

      <Text style={[styles.footerText, { color: colors.textDim }]}>
        TruckLog ELD © 2025
      </Text>
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
    marginTop: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  backButton: {
    padding: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingBottom: 20,
    paddingHorizontal: 0,
    paddingTop: 40,
  },
});