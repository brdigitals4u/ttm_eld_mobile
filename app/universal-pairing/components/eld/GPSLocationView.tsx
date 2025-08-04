import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface GPSLocationViewProps {
  gpsData?: {
    latitude?: number;
    longitude?: number;
    heading?: number;
    timestamp?: string;
  };
}

const GPSLocationView: React.FC<GPSLocationViewProps> = ({ gpsData }) => {
  const { colors } = useTheme();

  if (!gpsData) {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>No GPS Data Available</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>GPS Location</Text>
      <View style={styles.locationContainer}>
        <View style={styles.coordinateRow}>
          <Text style={[styles.coordinateLabel, { color: colors.inactive }]}>Latitude:</Text>
          <Text style={[styles.coordinateValue, { color: colors.text }]}>{gpsData.latitude ?? 'N/A'}</Text>
        </View>
        <View style={styles.coordinateRow}>
          <Text style={[styles.coordinateLabel, { color: colors.inactive }]}>Longitude:</Text>
          <Text style={[styles.coordinateValue, { color: colors.text }]}>{gpsData.longitude ?? 'N/A'}</Text>
        </View>
        <View style={styles.coordinateRow}>
          <Text style={[styles.coordinateLabel, { color: colors.inactive }]}>Heading:</Text>
          <Text style={[styles.coordinateValue, { color: colors.text }]}>{gpsData.heading ?? 'N/A'}</Text>
        </View>
      </View>

      {gpsData.timestamp && (
        <View style={styles.timestampContainer}>
          <Text style={[styles.timestampLabel, { color: colors.inactive }]}>Last Updated:</Text>
          <Text style={[styles.timestampText, { color: colors.inactive }]}>
            {new Date(gpsData.timestamp).toLocaleString()}
          </Text>
        </View>
      )}
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
  locationContainer: {
    marginTop: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coordinateLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  coordinateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestampContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  timestampLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default GPSLocationView;

