import { Bell, Moon, Smartphone, Sun } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Card from '@/components/Card';
import { useTheme } from '@/context/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { colors, isDark, mode, setThemeMode } = useTheme();
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
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Settings
      </Text>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              {isDark ? (
                <Moon size={20} color={colors.primary} />
              ) : (
                <Sun size={20} color={colors.primary} />
              )}
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Dark Theme
              </Text>
              <Text style={[styles.settingDescription, { color: colors.inactive }]}>
                Switch between light and dark mode
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeToggle}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconContainer}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Enable Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: colors.inactive }]}>
                Receive alerts for HOS updates
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Device Information
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Smartphone size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              App Version
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              1.0.0
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.footerText, { color: colors.inactive }]}>
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
});