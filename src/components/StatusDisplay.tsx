import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCurrentStatus, useHoursOfService, useStatusActions } from '@/stores/statusStore';
import { colors } from '@/theme/colors';

/**
 * Example component showing how to use Zustand store directly for real-time synchronization
 * This component will automatically update when status changes anywhere in the app
 */
export const StatusDisplay: React.FC = () => {
  // Direct access to Zustand store state - automatically re-renders on changes
  const currentStatus = useCurrentStatus();
  const hoursOfService = useHoursOfService();
  const { formatDuration } = useStatusActions();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Current Status: {currentStatus.toUpperCase()}
      </Text>
      
      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>
          Driving Time Remaining:
        </Text>
        <Text style={[
          styles.value, 
          { 
            color: hoursOfService.driveTimeRemaining < 60 ? colors.error : colors.text 
          }
        ]}>
          {formatDuration(hoursOfService.driveTimeRemaining)}
        </Text>
      </View>

      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>
          Shift Time Remaining:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatDuration(hoursOfService.shiftTimeRemaining)}
        </Text>
      </View>

      <View style={styles.hosContainer}>
        <Text style={[styles.label, { color: colors.textDim }]}>
          Cycle Time Remaining:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatDuration(hoursOfService.cycleTimeRemaining)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  hosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StatusDisplay;
