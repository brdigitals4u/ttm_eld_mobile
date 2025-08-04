import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface CANDataDashboardProps {
  canData?: {
    engine_throttle?: number;
    air_flow?: number;
    engine_runtime?: number;
    engine_load?: number;
    coolant_temp?: number;
    vehicle_distance?: number;
    speed?: number;
    fuel_level?: number;
    engine_rpm?: number;
    voltage?: number;
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

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Engine Metrics</Text>
      <View style={styles.metricsContainer}>
        {Object.entries(canData).map(([key, value]) => (
          <View key={key} style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.inactive }]}>
              {key.replace(/_/g, ' ')}
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {value ?? 'N/A'}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  noDataContainer: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricsContainer: {
    marginTop: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CANDataDashboard;

