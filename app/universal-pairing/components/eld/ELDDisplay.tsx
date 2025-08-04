import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';
import VINDisplay from './VINDisplay';
import CANDataDashboard from './CANDataDashboard';
import GPSLocationView from './GPSLocationView';
import EventDataTimeline from './EventDataTimeline';

interface ELDDisplayProps {
  device?: {
    name?: string;
    protocol?: string;
    vin?: string;
    canData?: {
      // Engine Performance Metrics
      engine_throttle?: number;
      engine_throttle_valve_1_position_1?: number;
      engine_intake_air_mass_flow_rate?: number;
      engine_percent_load_at_current_speed?: number;
      engine_speed?: number;
      engine_runtime?: number;
      engine_running_time?: number;
      time_since_engine_start?: number;
      accelerator_pedal_position_1?: number;
      
      // Vehicle Status
      wheel_based_vehicle_speed?: number;
      total_vehicle_distance?: number;
      acc_out_status?: string;
      malfunction_indicator_lamp?: string;
      
      // Environmental Data
      engine_inlet_air_temperature?: number;
      engine_coolant_temperature?: number;
      intake_manifold_absolute_pressure?: number;
      barometric_pressure?: number;
      
      // Fuel System
      fuel_level?: number;
      fuel_level_1?: number;
      
      // Electrical System
      voltage?: number;
      
      // Legacy fields for backward compatibility
      air_flow?: number;
      engine_load?: number;
      coolant_temp?: number;
      vehicle_distance?: number;
      speed?: number;
      engine_rpm?: number;
    };
    gpsData?: {
      latitude?: number;
      longitude?: number;
      heading?: number;
      timestamp?: string;
    };
    eventData?: {
      event_type?: string;
      trigger?: string;
      id?: number;
    };
  };
  timestamp?: string;
}

const ELDDisplay: React.FC<ELDDisplayProps> = ({ device, timestamp }) => {
  const { colors } = useTheme();

  if (!device || device.protocol !== 'ELD_DEVICE') {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>
          No ELD Device Connected
        </Text>
        <Text style={[styles.protocolText, { color: colors.inactive }]}>
          Protocol: {device?.protocol || 'Unknown'}
        </Text>
      </Animated.View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Animated.View entering={SlideInUp} style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>ELD Data Dashboard</Text>
          <View style={[styles.eldBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.eldBadgeText}>LIVE</Text>
          </View>
        </View>

        <Text style={[styles.deviceName, { color: colors.inactive }]}>
          Device: {device.name || 'Unknown ELD Device'}
        </Text>

        <View style={styles.dataContainer}>
          <VINDisplay vin={device.vin} timestamp={timestamp} />
          <CANDataDashboard canData={device.canData} />
          <GPSLocationView gpsData={device.gpsData} />
          <EventDataTimeline eventData={device.eventData} />
        </View>

        {timestamp && (
          <View style={styles.lastUpdateContainer}>
            <Text style={[styles.lastUpdateLabel, { color: colors.inactive }]}>
              Last Data Update
            </Text>
            <Text style={[styles.lastUpdateText, { color: colors.inactive }]}>
              {new Date(timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  protocolText: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  eldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eldBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deviceName: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  dataContainer: {
    gap: 16,
  },
  lastUpdateContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
  },
  lastUpdateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default ELDDisplay;
