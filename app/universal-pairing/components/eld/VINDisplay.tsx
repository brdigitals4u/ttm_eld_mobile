import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface VINDisplayProps {
  vin?: string;
  timestamp?: string;
}

const VINDisplay: React.FC<VINDisplayProps> = ({ vin, timestamp }) => {
  const { colors } = useTheme();

  if (!vin) {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>
          No VIN Data Available
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Vehicle Identification</Text>
        <View style={[styles.badge, { backgroundColor: colors.success }]}>
          <Text style={styles.badgeText}>VIN</Text>
        </View>
      </View>
      
      <View style={[styles.vinContainer, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.vinLabel, { color: colors.inactive }]}>
          Vehicle Identification Number
        </Text>
        <Text style={[styles.vinText, { color: colors.text }]} selectable>
          {vin}
        </Text>
      </View>

      {timestamp && (
        <View style={styles.timestampContainer}>
          <Text style={[styles.timestampLabel, { color: colors.inactive }]}>
            Last Updated
          </Text>
          <Text style={[styles.timestampText, { color: colors.inactive }]}>
            {new Date(timestamp).toLocaleString()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  noDataContainer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vinContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vinLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vinText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
    letterSpacing: 1,
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

export default VINDisplay;
