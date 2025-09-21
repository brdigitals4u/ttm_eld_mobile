import { Briefcase, Mail, Phone, Truck, User, Settings, MapPin, Calendar, Clock, Shield, AlertTriangle, Bluetooth } from 'lucide-react-native';
import React from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useAuth } from '@/stores/authStore';
import { useAppTheme } from '@/theme/context';

interface MenuItemProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}

function MenuItem({ title, subtitle, icon, onPress }: MenuItemProps) {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  
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
  const { user, logout, driverProfile, hosStatus, vehicleAssignment, organizationSettings } = useAuth();
  
  const handleLogout = async () => {
    try {
      console.log('🚪 ProfileScreen: Starting logout...');
      await logout();
      console.log('🎯 ProfileScreen: Navigating to login...');
      router.replace('/login');
    } catch (error) {
      console.error('❌ ProfileScreen: Logout failed:', error);
    }
  };

  // Displaying complete user data from login response

  const menuItems = [

    {
      title: 'Settings',
      subtitle: 'Manage  CoDrivers and  Others',
      icon: <Settings size={24} color={colors.tint} />,
      onPress: () => router.navigate('/more'),
    },
  
  ];


  // Debug: Log driver data
  console.log('Driver Profile:', driverProfile);
  console.log('HOS Status:', hosStatus);
  console.log('Vehicle Assignment:', vehicleAssignment);
  console.log('Organization Settings:', organizationSettings);

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
          {driverProfile?.name || `${user?.firstName} ${user?.lastName}` || 'Driver Name'}
        </Text>
        
        <Text style={[styles.role, { color: colors.textDim }]}>
          {driverProfile?.employment_status === 'active' ? 'Active Driver' : driverProfile?.employment_status || 'Professional Driver'}
        </Text>
        
        {driverProfile?.company_driver_id && (
          <Text style={[styles.driverId, { color: colors.textDim }]}>
            ID: {driverProfile.company_driver_id}
          </Text>
        )}
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
              {driverProfile?.email || user?.email || 'email@example.com'}
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
              {driverProfile?.phone || '(555) 123-4567'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <User size={20} color={colors.tint} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textDim }]}>
              Driver License
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {driverProfile?.license_number || driverProfile?.driver_license || 'DL12345678'}
            </Text>
            {driverProfile?.license_state && (
              <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                State: {driverProfile.license_state}
              </Text>
            )}
          </View>
        </View>
        
        {driverProfile?.username && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Username
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.username}
              </Text>
            </View>
          </View>
        )}
        
        {driverProfile?.license_expiry && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                License Expiry
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(driverProfile.license_expiry).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        
        {driverProfile?.current_location && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPin size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Current Location
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.current_location?.address || 'Location unavailable'}
              </Text>
              {driverProfile.current_location?.coordinates && (
                <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                  Lat: {driverProfile.current_location.coordinates.lat}, Lng: {driverProfile.current_location.coordinates.lng}
                </Text>
              )}
            </View>
          </View>
        )}
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
              {organizationSettings?.organization_name || driverProfile?.organization_name || 'Trucking Company'}
            </Text>
            {organizationSettings?.timezone && (
              <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                Timezone: {organizationSettings.timezone}
              </Text>
            )}
          </View>
        </View>
        
        {driverProfile?.home_terminal_name && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPin size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Home Terminal
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.home_terminal_name}
              </Text>
              {driverProfile.home_terminal_address && (
                <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                  {driverProfile.home_terminal_address}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {driverProfile?.hire_date && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Hire Date
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(driverProfile.hire_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </ElevatedCard>

      {/* Vehicle Assignment Section */}
      {vehicleAssignment?.has_vehicle_assigned && vehicleAssignment?.vehicle_info && (
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
                {vehicleAssignment.vehicle_info.vehicle_unit}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Vehicle Details
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vehicleAssignment.vehicle_info.year} {vehicleAssignment.vehicle_info.make} {vehicleAssignment.vehicle_info.model}
              </Text>
              <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                License Plate: {vehicleAssignment.vehicle_info.license_plate}
              </Text>
              {vehicleAssignment.vehicle_info.vin && (
                <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                  VIN: {vehicleAssignment.vehicle_info.vin}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Assigned Date
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(vehicleAssignment.vehicle_info.assigned_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Vehicle Status
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {vehicleAssignment.vehicle_info.status || 'Active'}
              </Text>
              <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                Assignment Status: {vehicleAssignment.assignment_status || 'Assigned'}
              </Text>
            </View>
          </View>
          
          {vehicleAssignment.vehicle_info.current_location && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MapPin size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Vehicle Location
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {vehicleAssignment.vehicle_info.current_location?.address || 'Location unavailable'}
                </Text>
                {vehicleAssignment.vehicle_info.current_location?.coordinates && (
                  <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                    Lat: {vehicleAssignment.vehicle_info.current_location.coordinates.lat}, Lng: {vehicleAssignment.vehicle_info.current_location.coordinates.lng}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {vehicleAssignment.vehicle_info.current_odometer && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Clock size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Current Odometer
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {vehicleAssignment.vehicle_info.current_odometer?.value || 0} {vehicleAssignment.vehicle_info.current_odometer?.unit || 'miles'}
                </Text>
                {vehicleAssignment.vehicle_info.current_odometer?.last_updated && (
                  <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                    Last updated: {new Date(vehicleAssignment.vehicle_info.current_odometer.last_updated).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          )}
        </ElevatedCard>
      )}

      {/* HOS Status Section */}
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
              {(hosStatus?.current_status || driverProfile?.current_status || 'Available').toUpperCase()}
            </Text>
          </View>
          </View>

        {hosStatus?.time_remaining && (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Truck size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Driving Time Remaining
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {Math.floor((hosStatus.time_remaining.driving_time_remaining || 0) / 60)}h {((hosStatus.time_remaining.driving_time_remaining || 0) % 60)}m
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Clock size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Total Driving Time
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {Math.floor((hosStatus.driving_time_remaining || 0) / 60)}h {((hosStatus.driving_time_remaining || 0) % 60)}m
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
                  {Math.floor((hosStatus.time_remaining.on_duty_time_remaining || 0) / 60)}h {((hosStatus.time_remaining.on_duty_time_remaining || 0) % 60)}m
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Calendar size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Cycle Time Remaining
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {Math.floor((hosStatus.time_remaining.cycle_time_remaining || 0) / 60)}h {((hosStatus.time_remaining.cycle_time_remaining || 0) % 60)}m
                </Text>
              </View>
            </View>
          </>
        )}
        
        {hosStatus?.active_violations && hosStatus.active_violations.length > 0 && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <AlertTriangle size={20} color={colors.error} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Active Violations
              </Text>
              <Text style={[styles.infoValue, { color: colors.error }]}>
                {hosStatus.active_violations.length} violation(s)
              </Text>
            </View>
          </View>
        )}
        
        {driverProfile?.violations_count !== undefined && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Shield size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Total Violations
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.violations_count}
              </Text>
            </View>
          </View>
        )}
        
        {/* Current Shift Information */}
        {driverProfile?.current_shift && (
          <>
            <Text style={[styles.sectionSubTitle, { color: colors.text, marginTop: 20 }]}>
              Current Shift
            </Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Clock size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Shift Start
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {driverProfile.current_shift.start_time ? new Date(driverProfile.current_shift.start_time).toLocaleString() : 'N/A'}
                </Text>
              </View>
            </View>
            
            {driverProfile.current_shift.total_on_duty_time && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Briefcase size={20} color={colors.tint} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                    Total On Duty Time
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {Math.floor((driverProfile.current_shift.total_on_duty_time || 0) / 60)}h {((driverProfile.current_shift.total_on_duty_time || 0) % 60)}m
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
        
        {/* Current Cycle Information */}
        {driverProfile?.current_cycle && (
          <>
            <Text style={[styles.sectionSubTitle, { color: colors.text, marginTop: 20 }]}>
              Current Cycle
            </Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Calendar size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  Cycle Type
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {driverProfile.current_cycle.cycle_type || 'Standard'}
                </Text>
              </View>
            </View>
            
            {driverProfile.current_cycle.cycle_start_date && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Calendar size={20} color={colors.tint} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                    Cycle Start Date
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(driverProfile.current_cycle.cycle_start_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ElevatedCard>

      {/* ELD Settings Section */}
      {driverProfile && (
        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ELD Settings
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Shield size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                ELD Exempt
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_exempt ? 'Yes' : 'No'}
              </Text>
              {driverProfile.eld_exempt && driverProfile.eld_exempt_reason && (
                <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                  Reason: {driverProfile.eld_exempt_reason}
                </Text>
              )}
            </View>
          </View>
          
          {driverProfile.eld_device_id && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bluetooth size={20} color={colors.tint} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                  ELD Device ID
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {driverProfile.eld_device_id}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Personal Conveyance
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_pc_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Truck size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Yard Moves
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_ym_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <AlertTriangle size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Adverse Weather Exemption
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_adverse_weather_exemption_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Big Day Exemption
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_big_day_exemption_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Waiting Time Duty Status
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.waiting_time_duty_status_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Day Start Hour
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {driverProfile.eld_day_start_hour}:00
              </Text>
                  </View>
                </View>
          
          <View style={styles.eldSettingsGrid}>
            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Personal Conveyance
              </Text>
              <Text style={[styles.eldSettingValue, { color: driverProfile.eld_pc_enabled ? colors.success : colors.textDim }]}>
                {driverProfile.eld_pc_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            
            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Yard Moves
              </Text>
              <Text style={[styles.eldSettingValue, { color: driverProfile.eld_ym_enabled ? colors.success : colors.textDim }]}>
                {driverProfile.eld_ym_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Adverse Weather
              </Text>
              <Text style={[styles.eldSettingValue, { color: driverProfile.eld_adverse_weather_exemption_enabled ? colors.success : colors.textDim }]}>
                {driverProfile.eld_adverse_weather_exemption_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            
            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                16-Hour Exception
              </Text>
              <Text style={[styles.eldSettingValue, { color: driverProfile.eld_big_day_exemption_enabled ? colors.success : colors.textDim }]}>
                {driverProfile.eld_big_day_exemption_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </ElevatedCard>
      )}

      {/* Compliance Settings Section */}
      {organizationSettings?.compliance_settings && (
        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Compliance Settings
          </Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Shield size={20} color={colors.tint} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textDim }]}>
                Compliance Configuration
              </Text>
              <Text style={[styles.infoSubtext, { color: colors.textDim }]}>
                Organization compliance policies and settings
              </Text>
            </View>
          </View>

          <View style={styles.eldSettingsGrid}>
            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Auto Certify Logs
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.auto_certify_logs ? colors.success : colors.textDim }]}>
                {organizationSettings.compliance_settings.auto_certify_logs ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Driver Acknowledgment Required
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.require_driver_acknowledgment ? colors.warning : colors.textDim }]}>
                {organizationSettings.compliance_settings.require_driver_acknowledgment ? 'Required' : 'Optional'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Violation Notifications
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.violation_notification_enabled ? colors.success : colors.textDim }]}>
                {organizationSettings.compliance_settings.violation_notification_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Manual Log Edits
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.allow_manual_log_edits ? colors.success : colors.textDim }]}>
                {organizationSettings.compliance_settings.allow_manual_log_edits ? 'Allowed' : 'Restricted'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Supervisor Approval Required
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.require_supervisor_approval_for_edits ? colors.warning : colors.textDim }]}>
                {organizationSettings.compliance_settings.require_supervisor_approval_for_edits ? 'Required' : 'Not Required'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Compliance Reporting
              </Text>
              <Text style={[styles.eldSettingValue, { color: organizationSettings.compliance_settings.compliance_reporting_enabled ? colors.success : colors.textDim }]}>
                {organizationSettings.compliance_settings.compliance_reporting_enabled ? `${organizationSettings.compliance_settings.compliance_report_frequency}` : 'Disabled'}
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Data Retention
              </Text>
              <Text style={[styles.eldSettingValue, { color: colors.text }]}>
                {organizationSettings.compliance_settings.data_retention_days} days
              </Text>
            </View>

            <View style={styles.eldSettingItem}>
              <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                Audit Trail Retention
              </Text>
              <Text style={[styles.eldSettingValue, { color: colors.text }]}>
                {organizationSettings.compliance_settings.audit_trail_retention_days} days
              </Text>
            </View>

            {organizationSettings.compliance_settings.violation_escalation_enabled && (
              <View style={styles.eldSettingItem}>
                <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                  Violation Escalation
                </Text>
                <Text style={[styles.eldSettingValue, { color: colors.warning }]}>
                  After {organizationSettings.compliance_settings.violation_escalation_hours} hours
                </Text>
              </View>
            )}

            {organizationSettings.compliance_settings.violation_penalty_enabled && (
              <View style={styles.eldSettingItem}>
                <Text style={[styles.eldSettingLabel, { color: colors.textDim }]}>
                  Violation Penalties
                </Text>
                <Text style={[styles.eldSettingValue, { color: colors.error }]}>
                  After {organizationSettings.compliance_settings.violation_penalty_threshold} violations
                </Text>
              </View>
            )}
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
    marginTop: 45,
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
  driverId: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 12,
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
  infoSubtext: {
    fontSize: 14,
    marginTop: 2,
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
  eldSettingsGrid: {
    marginTop: 16,
  },
  eldSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  eldSettingLabel: {
    fontSize: 14,
    flex: 1,
  },
  eldSettingValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});