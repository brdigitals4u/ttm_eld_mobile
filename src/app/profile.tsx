import { Briefcase, Mail, Phone, Truck, User, Settings, Clock, MapPin } from 'lucide-react-native';
import React from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useAuth } from '@/contexts';
import { useAppTheme } from '@/theme/context';

interface MenuItemProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function MenuItem({ title, subtitle, icon, onPress }: MenuItemProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;
  
  return (
    <TouchableOpacity onPress={onPress}>
      <ElevatedCard style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemIcon}>
            {icon}
          </View>
          <View style={styles.menuItemText}>
            <Text style={[styles.menuItemTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.menuItemSubtitle, { color: colors.textDim }]}>
              {subtitle}
            </Text>
          </View>
          <Text style={[styles.menuItemArrow, { color: colors.textDim }]}>
            ›
          </Text>
        </View>
      </ElevatedCard>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const { 
    user, 
    driverProfile, 
    hosStatus, 
    vehicleAssignment, 
    organizationSettings, 
    logout 
  } = useAuth();

  console.log('driver profile:', driverProfile);
  
  const handleLogout = async () => {
    try {
      console.log('🚪 Profile.tsx: Starting logout...');
      await logout();
      console.log('🎯 Profile.tsx: Navigating to login...');
      router.replace('/login');
    } catch (error) {
      console.error('❌ Profile.tsx: Logout failed:', error);
    }
  };

  // Format time from minutes to hours and minutes
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const menuItems = [
    {
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      icon: <Settings size={24} color={colors.tint} />,
      onPress: () => router.push('/settings'),
    },
    {
      title: 'Edit Profile',
      subtitle: 'Update personal information',
      icon: <User size={24} color={colors.tint} />,
      onPress: () => router.push('/(tabs)/profile'),
    },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <View style={[
          styles.avatarContainer, 
          { 
            backgroundColor: isDark ? colors.surface : '#F3F4F6',
            borderColor: colors.tint,
          }
        ]}>
          <User size={40} color={colors.tint} />
        </View>
        
        <Text style={[styles.name, { color: colors.text }]}>
          {driverProfile?.name || user?.name || 'Driver Name'}
        </Text>
        
        <Text style={[styles.role, { color: colors.textDim }]}>
          {driverProfile?.employment_status || 'Professional Driver'}
        </Text>
        
        <Text style={[styles.driverId, { color: colors.textDim }]}>
          ID: {driverProfile?.driver_id || 'N/A'}
        </Text>
      </View>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Driver Information
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Mail size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.email || user?.email || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Phone size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Phone
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.phone || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <User size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              License Number
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.license_number || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MapPin size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              License State
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.license_state || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Briefcase size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Company Driver ID
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.company_driver_id || 'N/A'}
            </Text>
          </View>
        </View>
      </ElevatedCard>

      <ElevatedCard style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Organization
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Briefcase size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Company
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {organizationSettings?.organization_name || driverProfile?.organization_name || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MapPin size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Home Terminal
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.home_terminal_name || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Clock size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Timezone
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {organizationSettings?.timezone || driverProfile?.timezone || 'N/A'}
            </Text>
          </View>
        </View>
      </ElevatedCard>

      {/* Vehicle Assignment Section */}
      {vehicleAssignment && (
        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Vehicle Assignment
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Vehicle Unit
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vehicleAssignment?.vehicle_info?.vehicle_unit || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Make & Model
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vehicleAssignment?.vehicle_info?.make} {vehicleAssignment?.vehicle_info?.model}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                License Plate
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vehicleAssignment?.vehicle_info?.license_plate || 'N/A'}
              </Text>
            </View>
          </View>
        </ElevatedCard>
      )}

      {/* HOS Status Section */}
      {hosStatus && (
        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Hours of Service Status
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Current Status
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {hosStatus?.current_status?.replace('_', ' ').toUpperCase() || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Driving Time Remaining
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatTime(hosStatus?.driving_time_remaining || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Briefcase size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                On Duty Time Remaining
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatTime(hosStatus?.on_duty_time_remaining || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Cycle Time Remaining
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatTime(hosStatus?.cycle_time_remaining || 0)}
              </Text>
            </View>
          </View>
        </ElevatedCard>
      )}

 {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            onPress={item.onPress}
          />
        ))}

      <LoadingButton
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
    marginBottom: 4,
  },
  driverId: {
    fontSize: 14,
    opacity: 0.8,
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