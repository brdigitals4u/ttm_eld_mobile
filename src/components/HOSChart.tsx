import React from 'react';
import { StyleSheet, Text, View, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAppTheme } from '@/theme/context';
import { StatusUpdate } from '@/types/status';
import { Calendar, User, Truck } from 'lucide-react-native';

interface HOSChartProps {
  logs: StatusUpdate[];
  date: Date;
  driverName: string;
  vehicleNumber: string;
}

// Define the duty statuses with their colors and y-values for the Y-axis (FMCSA compliant)
const statusConfig = {
  'offDuty': {
    y: 4,
    color: '#64748b',
    bgColor: '#f1f5f9',
    icon: '🏠',
    description: 'Off Duty',
    label: 'OFF DUTY',
  },
  'sleeping': {
    y: 3,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: '🛏️',
    description: 'Sleeper Berth',
    label: 'SLEEPER BERTH',
  },
  'driving': {
    y: 2,
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: '🚛',
    description: 'Driving',
    label: 'DRIVING',
  },
  'onDuty': {
    y: 1,
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: '⚡',
    description: 'On Duty (Not Driving)',
    label: 'ON DUTY',
  },
} as any;

export default function HOSChart({ logs, date, driverName, vehicleNumber }: HOSChartProps) {
  const { theme, themeContext } = useAppTheme();
  const isDark = themeContext === 'dark';
  const colors = theme.colors;
  const screenWidth = Dimensions.get('window').width;

  // Calculate total hours for each duty status
  const calculateTotalHours = () => {
    const totals = {} as any;
    Object.keys(statusConfig).forEach((status) => {
      totals[statusConfig[status].label] = 0;
    });

    // Group logs by status and calculate durations
    for (let i = 0; i < logs.length; i++) {
      const currentLog = logs[i];
      const nextLog = logs[i + 1];
      
      const startTime = new Date(currentLog.timestamp);
      const endTime = nextLog ? new Date(nextLog.timestamp) : new Date();
      
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const statusLabel = statusConfig[currentLog.status]?.label || 'UNKNOWN';
      
      if (totals[statusLabel] !== undefined) {
        totals[statusLabel] += hours;
      }
    }

    return totals;
  };

  const totalHours = calculateTotalHours();

  // Prepare chart data for stepped line chart
  const prepareChartData = () => {
    if (logs.length === 0) {
      return {
        labels: ['00:00', '06:00', '12:00', '18:00', '24:00'],
        datasets: [{
          data: [4, 4, 4, 4, 4], // Default to OFF DUTY
          color: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          strokeWidth: 3,
        }],
      };
    }

    // Create 24-hour timeline with status changes
    const timePoints: { time: string; value: number; status: string }[] = [];
    
    // Add data points for each log entry
    logs.forEach((log, index) => {
      const logTime = new Date(log.timestamp);
      const timeStr = logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const statusY = statusConfig[log.status]?.y || 4;
      
      timePoints.push({
        time: timeStr,
        value: statusY,
        status: log.status,
      });
    });

    // Sort by time and ensure we have start and end points
    timePoints.sort((a, b) => a.time.localeCompare(b.time));
    
    // Add start of day if not present
    if (timePoints.length === 0 || timePoints[0].time !== '00:00') {
      timePoints.unshift({ time: '00:00', value: 4, status: 'offDuty' });
    }
    
    // Add end of day
    if (timePoints[timePoints.length - 1].time !== '24:00') {
      const lastStatus = timePoints[timePoints.length - 1];
      timePoints.push({ time: '24:00', value: lastStatus.value, status: lastStatus.status });
    }

    return {
      labels: timePoints.map(point => point.time),
      datasets: [{
        data: timePoints.map(point => point.value),
        color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const chartData = prepareChartData();

  const chartConfig = {
    backgroundGradientFrom: isDark ? colors.cardBackground : '#ffffff',
    backgroundGradientTo: isDark ? colors.cardBackground : '#ffffff',
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.tint,
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: isDark ? colors.border : '#e5e7eb',
      strokeWidth: 1,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View>
          <Text style={styles.headerTitle}>HOS Log Chart</Text>
          <View style={styles.headerInfo}>
            <View style={styles.infoItem}>
              <Calendar size={12} color="#fff" />
              <Text style={styles.infoText}>{date.toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoItem}>
              <User size={12} color="#fff" />
              <Text style={styles.infoText}>{driverName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Truck size={12} color="#fff" />
              <Text style={styles.infoText}>#{vehicleNumber}</Text>
            </View>
          </View>
        </View>
        <View style={styles.driveTimeContainer}>
          <Text style={styles.driveTimeLabel}>Drive Time</Text>
          <Text style={styles.driveTimeValue}>
            {(totalHours['DRIVING'] || 0).toFixed(1)}h
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={250}
          chartConfig={chartConfig}
          bezier={false}
          withDots={true}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          style={styles.chart}
          segments={4} // 4 segments for our 4 duty statuses
          formatYLabel={(value: string) => {
            const numValue = parseInt(value);
            switch (numValue) {
              case 1: return 'ON DUTY';
              case 2: return 'DRIVING';
              case 3: return 'SLEEPER';
              case 4: return 'OFF DUTY';
              default: return '';
            }
          }}
        />
      </View>

      {/* Status Legend */}
      <View style={styles.legendContainer}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>Status Summary</Text>
        <View style={styles.legendGrid}>
          {Object.entries(statusConfig).map(([key, config]: any) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: config.color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.legendLabel, { color: colors.text }]}>
                  {config.label}
                </Text>
                <Text style={[styles.legendHours, { color: colors.textDim }]}>
                  {(totalHours[config.label] || 0).toFixed(1)}h
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  driveTimeContainer: {
    alignItems: 'flex-end',
  },
  driveTimeLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  driveTimeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  chartContainer: {
    padding: 16,
    paddingTop: 8,
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    padding: 16,
    paddingTop: 0,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendHours: {
    fontSize: 11,
    marginTop: 2,
  },
});
