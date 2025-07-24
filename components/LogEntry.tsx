import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/theme-context';
import { StatusUpdate } from '@/types/status';

interface LogEntryProps {
  log: StatusUpdate;
}

export default function LogEntry({ log }: LogEntryProps) {
  const { colors, isDark } = useTheme();
  
  const getStatusColor = () => {
    switch (log.status) {
      case 'driving':
        return colors.driving;
      case 'onDuty':
        return colors.onDuty;
      case 'offDuty':
        return colors.offDuty;
      case 'sleeping':
        return colors.sleeping;
      case 'yardMoves':
        return colors.warning;
      default:
        return colors.primary;
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
        backgroundColor: isDark ? colors.card : '#fff',
        borderLeftColor: getStatusColor(),
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
      
      <Text style={[styles.date, { color: colors.inactive }]}>
        {formatDate(log.timestamp)}
      </Text>
      
      <Text style={[styles.reason, { color: colors.text }]}>
        {log.reason}
      </Text>
      
      {log.location && (
        <Text style={[styles.location, { color: colors.inactive }]}>
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