import { Briefcase, Mail, Phone, Truck, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user, vehicleInfo, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <View style={[
          styles.avatarContainer, 
          { 
            backgroundColor: isDark ? colors.card : '#F3F4F6',
            borderColor: colors.primary,
          }
        ]}>
          <User size={40} color={colors.primary} />
        </View>
        
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.name || 'Driver Name'}
        </Text>
        
        <Text style={[styles.role, { color: colors.inactive }]}>
          Professional Driver
        </Text>
      </View>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Driver Information
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Mail size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.email || 'email@example.com'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Phone size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              Phone
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              (555) 123-4567
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <User size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              License Number
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.licenseNumber || 'DL12345678'}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Organization
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Briefcase size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              Company
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.organizationName || 'Trucking Company'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Truck size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>
              Vehicle Number
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {vehicleInfo?.vehicleNumber || 'Not assigned'}
            </Text>
          </View>
        </View>
      </Card>

      <Button
        title="Log Out"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
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
  logoutButton: {
    marginTop: 20,
  },
});