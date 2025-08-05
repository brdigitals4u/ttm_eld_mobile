import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/theme-context';
import Card from '@/components/Card';

interface DataPoint {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'OK' | 'WARNING' | 'ERROR';
}

interface DataDisplayCardProps {
  title: string;
  data: DataPoint[];
  timestamp?: Date;
}

export default function DataDisplayCard({ title, data, timestamp }: DataDisplayCardProps) {
  const { colors, isDark } = useTheme();

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'OK':
        return '#10B981'; // Green
      case 'WARNING':
        return '#F59E0B'; // Yellow
      case 'ERROR':
        return '#EF4444'; // Red
      default:
        return colors.text;
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {timestamp && (
          <Text style={[styles.timestamp, { color: colors.inactive }]}>
            {timestamp.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <View style={styles.dataGrid}>
        {data.map((item, index) => (
          <View key={index} style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.inactive }]}>
              {item.label}
            </Text>
            <View style={styles.dataValueContainer}>
              <Text style={[
                styles.dataValue,
                { color: getStatusColor(item.status) }
              ]}>
                {item.value}
              </Text>
              {item.unit && (
                <Text style={[styles.dataUnit, { color: colors.inactive }]}>
                  {item.unit}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dataItem: {
    minWidth: '45%',
  },
  dataLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dataValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dataValue: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 4,
  },
  dataUnit: {
    fontSize: 12,
  },
});
