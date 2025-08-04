import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/context/theme-context';

interface EventDataTimelineProps {
  eventData?: {
    event_type?: string;
    trigger?: string;
    id?: number;
  };
}

const EventDataTimeline: React.FC<EventDataTimelineProps> = ({ eventData }) => {
  const { colors } = useTheme();

  if (!eventData) {
    return (
      <Animated.View entering={FadeIn} style={[styles.container, styles.noDataContainer]}>
        <Text style={[styles.noDataText, { color: colors.inactive }]}>No Event Data Available</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Event Timeline</Text>
      <View style={styles.eventContainer}>
        <View style={styles.eventRow}>
          <Text style={[styles.eventLabel, { color: colors.inactive }]}>Type:</Text>
          <Text style={[styles.eventValue, { color: colors.text }]}>{eventData.event_type ?? 'N/A'}</Text>
        </View>
        <View style={styles.eventRow}>
          <Text style={[styles.eventLabel, { color: colors.inactive }]}>Trigger:</Text>
          <Text style={[styles.eventValue, { color: colors.text }]}>{eventData.trigger ?? 'N/A'}</Text>
        </View>
        <View style={styles.eventRow}>
          <Text style={[styles.eventLabel, { color: colors.inactive }]}>ID:</Text>
          <Text style={[styles.eventValue, { color: colors.text }]}>{eventData.id ?? 'N/A'}</Text>
        </View>
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
  eventContainer: {
    marginTop: 12,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  eventValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventDataTimeline;

