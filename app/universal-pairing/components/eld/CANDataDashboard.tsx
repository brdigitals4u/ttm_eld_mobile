import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface CANDataDashboardProps {
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
}

const CANDataDashboard: React.FC<CANDataDashboardProps> = ({ canData }) => {
  const { colors } = useTheme();

  if (!canData) {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>No CAN Data Available</Text>
      </Animated.View>
    );
  }

  // Helper function to format parameter names
  const formatParameterName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace('Engine ', '')
      .replace('Vehicle ', '');
  };

  // Helper function to get unit for parameter
  const getUnit = (key: string): string => {
    const units: { [key: string]: string } = {
      engine_throttle_valve_1_position_1: '%',
      engine_intake_air_mass_flow_rate: 'kg/h',
      engine_percent_load_at_current_speed: '%',
      engine_speed: 'rpm',
      engine_runtime: 's',
      engine_running_time: 's',
      time_since_engine_start: 's',
      accelerator_pedal_position_1: '%',
      wheel_based_vehicle_speed: 'km/h',
      total_vehicle_distance: 'km',
      engine_inlet_air_temperature: '°C',
      engine_coolant_temperature: '°C',
      intake_manifold_absolute_pressure: 'kPa',
      barometric_pressure: 'kPa',
      fuel_level: '%',
      fuel_level_1: '%',
      voltage: 'mV',
      // Legacy units
      engine_throttle: '%',
      air_flow: 'kg/h',
      engine_load: '%',
      coolant_temp: '°C',
      vehicle_distance: 'km',
      speed: 'km/h',
      engine_rpm: 'rpm',
    };
    return units[key] || '-';
  };

  // Helper function to format value
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Format numbers with appropriate decimal places
      if (value >= 1000) return value.toFixed(3);
      if (value >= 100) return value.toFixed(1);
      return value.toString();
    }
    return value.toString();
  };

  // Group parameters by category
  const engineMetrics = {
    engine_throttle_valve_1_position_1: canData.engine_throttle_valve_1_position_1,
    engine_intake_air_mass_flow_rate: canData.engine_intake_air_mass_flow_rate,
    engine_percent_load_at_current_speed: canData.engine_percent_load_at_current_speed,
    engine_speed: canData.engine_speed,
    engine_runtime: canData.engine_runtime,
    engine_running_time: canData.engine_running_time,
    time_since_engine_start: canData.time_since_engine_start,
    accelerator_pedal_position_1: canData.accelerator_pedal_position_1,
  };

  const vehicleStatus = {
    wheel_based_vehicle_speed: canData.wheel_based_vehicle_speed,
    total_vehicle_distance: canData.total_vehicle_distance,
    acc_out_status: canData.acc_out_status,
    malfunction_indicator_lamp: canData.malfunction_indicator_lamp,
  };

  const environmentalData = {
    engine_inlet_air_temperature: canData.engine_inlet_air_temperature,
    engine_coolant_temperature: canData.engine_coolant_temperature,
    intake_manifold_absolute_pressure: canData.intake_manifold_absolute_pressure,
    barometric_pressure: canData.barometric_pressure,
  };

  const fuelSystem = {
    fuel_level: canData.fuel_level,
    fuel_level_1: canData.fuel_level_1,
  };

  const electricalSystem = {
    voltage: canData.voltage,
  };

  const renderParameterSection = (title: string, parameters: any, icon: string) => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.parametersContainer}>
        {Object.entries(parameters).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          return (
            <View key={key} style={styles.parameterRow}>
              <View style={styles.parameterInfo}>
                <Text style={[styles.parameterName, { color: colors.text }]}>
                  {formatParameterName(key)}
                </Text>
                <Text style={[styles.parameterValue, { color: colors.primary }]}>
                  {formatValue(value)}
                </Text>
              </View>
              <Text style={[styles.parameterUnit, { color: colors.inactive }]}>
                {getUnit(key)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn} style={styles.container}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Engine & Vehicle Data</Text>
        
        {renderParameterSection('Engine Performance', engineMetrics, '🏭')}
        {renderParameterSection('Vehicle Status', vehicleStatus, '🚗')}
        {renderParameterSection('Environmental', environmentalData, '🌡️')}
        {renderParameterSection('Fuel System', fuelSystem, '⛽')}
        {renderParameterSection('Electrical', electricalSystem, '⚡')}
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
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  parametersContainer: {
    gap: 8,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  parameterInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parameterName: {
    fontSize: 14,
    flex: 2,
  },
  parameterValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  parameterUnit: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
    textAlign: 'right',
  },
});

export default CANDataDashboard;

