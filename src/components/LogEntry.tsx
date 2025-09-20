import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { StatusUpdate } from '@/types/status';

interface LogEntryProps {
  log: StatusUpdate;
  logs?: StatusUpdate[]; // Optional logs prop for future chart integration
}

function LogEntry({ log }: LogEntryProps) {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme
  
  const getStatusColor = () => {
    switch (log.status) {
      case 'driving':
        return '#FF9500'; // Orange for driving
      case 'onDuty':
        return '#F59E0B'; // Amber for on duty
      case 'offDuty':
        return '#3B82F6'; // Blue for off duty
      case 'sleeping':
        return '#6366F1'; // Indigo for sleeping
      case 'yardMoves':
        return colors.warning || '#F59E0B'; // Warning color
      default:
        return colors.tint; // Use tint as primary
    }
  };
  
  const getStatusLabel = () => {
    switch (log.status) {
      case 'driving':
        return 'Driving';
      case 'onDuty':
        return 'On Duty';
      case 'offDuty':
        return 'Off Duty';
      case 'sleeping':
        return 'Sleeping';
      case 'yardMoves':
        return 'Yard Moves';
      default:
        return log.status;
    }
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.surface : '#fff',
        borderLeftColor: getStatusColor(),
        shadowColor: isDark ? '#FFFFFF' : '#000000',
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>
        <Text style={[styles.time, { color: colors.text }]}>
          {formatTime(log.timestamp)}
        </Text>
      </View>
      
      <Text style={[styles.date, { color: colors.textDim }]}>
        {formatDate(log.timestamp)}
      </Text>
      
      <Text style={[styles.reason, { color: colors.text }]}>
        {log.reason}
      </Text>
      
      {log.location && (
        <Text style={[styles.location, { color: colors.textDim }]}>
          {log.location.address || `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  time: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  date: {
    fontSize: 12,
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default LogEntry;
