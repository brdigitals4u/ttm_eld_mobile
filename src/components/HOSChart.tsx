import React, { useMemo } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { useAppTheme } from "@/theme/context";
import { StatusUpdate } from "@/types/status";
import { Calendar, User, Truck } from "lucide-react-native";
import { Text } from "@/components/Text";

interface HOSChartProps {
  logs: StatusUpdate[];
  date: Date;
  driverName: string;
  vehicleNumber: string;
}

const STATUS_TO_Y = { 
  'onDuty': 1, 
  'driving': 2, 
  'sleeperBerth': 3, 
  'sleeping': 3,
  'offDuty': 4,
  'personalConveyance': 4,
  'yardMoves': 1
} as const;

const Y_TO_LABEL = { 
  1: "ON", 
  2: "D", 
  3: "SB", 
  4: "OFF" 
} as const;

const STATUS_COLORS = {
  1: '#f59e0b', // ON DUTY - Orange
  2: '#ef4444', // DRIVING - Red
  3: '#3b82f6', // SLEEPER BERTH - Blue
  4: '#64748b', // OFF DUTY - Gray
} as const;

type ChartPoint = { x: number; y: number; timestamp: number; status: string };

function logsToChartData(logs: StatusUpdate[]): ChartPoint[] {
  if (!logs || logs.length === 0) {
    console.log("📊 HOSChart: No logs provided, using sample data");
    // Return sample data to test chart rendering
    const now = Date.now();
    return [
      { x: 0, y: 4, timestamp: now - 24 * 60 * 60 * 1000, status: 'offDuty' },     // Start at OFF
      { x: 120, y: 2, timestamp: now - 22 * 60 * 60 * 1000, status: 'driving' },  // 2AM - DRIVING
      { x: 480, y: 4, timestamp: now - 16 * 60 * 60 * 1000, status: 'offDuty' },  // 8AM - OFF
      { x: 720, y: 1, timestamp: now - 12 * 60 * 60 * 1000, status: 'onDuty' },   // 12PM - ON
      { x: 780, y: 2, timestamp: now - 11 * 60 * 60 * 1000, status: 'driving' },  // 1PM - DRIVING
      { x: 960, y: 3, timestamp: now - 8 * 60 * 60 * 1000, status: 'sleeperBerth' }, // 4PM - SB
      { x: 1440, y: 3, timestamp: now, status: 'sleeperBerth' }                    // End at SB
    ];
  }
  
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const points: ChartPoint[] = [];
  
  // Ensure we start from beginning of day
  const firstLog = sortedLogs[0];
  const firstTime = new Date(firstLog.timestamp);
  const firstMinutes = firstTime.getHours() * 60 + firstTime.getMinutes();
  
  // Map first status
  let firstYValue: number;
  switch (firstLog.status) {
    case 'onDuty':
    case 'yardMoves':
      firstYValue = 1;
      break;
    case 'driving':
      firstYValue = 2;
      break;
    case 'sleeperBerth':
    case 'sleeping':
      firstYValue = 3;
      break;
    case 'offDuty':
    case 'personalConveyance':
      firstYValue = 4;
      break;
    default:
      firstYValue = 4;
  }
  
  // Add start of day point
  points.push({ 
    x: 0, 
    y: firstYValue, 
    timestamp: firstLog.timestamp - firstMinutes * 60000,
    status: firstLog.status 
  });
  
  // Add all log points
  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    const time = new Date(log.timestamp);
    
    // Validate timestamp
    if (isNaN(time.getTime())) {
      console.warn('Invalid timestamp in log:', log);
      continue;
    }
    
    const minutes = time.getHours() * 60 + time.getMinutes();
    
    // Map status to chart status
    let yValue: number;
    switch (log.status) {
      case 'onDuty':
      case 'yardMoves':
        yValue = 1;
        break;
      case 'driving':
        yValue = 2;
        break;
      case 'sleeperBerth':
      case 'sleeping':
        yValue = 3;
        break;
      case 'offDuty':
      case 'personalConveyance':
        yValue = 4;
        break;
      default:
        yValue = 4;
    }
    
    points.push({ 
      x: minutes, 
      y: yValue, 
      timestamp: log.timestamp,
      status: log.status 
    });
  }
  
  // Ensure we end at end of day
  const lastLog = sortedLogs[sortedLogs.length - 1];
  const lastTime = new Date(lastLog.timestamp);
  const lastMinutes = lastTime.getHours() * 60 + lastTime.getMinutes();
  
  // Map last status
  let lastYValue: number;
  switch (lastLog.status) {
    case 'onDuty':
    case 'yardMoves':
      lastYValue = 1;
      break;
    case 'driving':
      lastYValue = 2;
      break;
    case 'sleeperBerth':
    case 'sleeping':
      lastYValue = 3;
      break;
    case 'offDuty':
    case 'personalConveyance':
      lastYValue = 4;
      break;
    default:
      lastYValue = 4;
  }
  
  // Add end of day point
  points.push({ 
    x: 1440, 
    y: lastYValue, 
    timestamp: lastLog.timestamp + (1440 - lastMinutes) * 60000,
    status: lastLog.status 
  });
  
  return points;
}

export default function HOSChart({
  logs,
  date,
  driverName,
  vehicleNumber,
}: HOSChartProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;
  
  const chartData = useMemo(() => {
    try {
      const data = logsToChartData(logs);
      console.log("📊 HOSChart: Generated chart data:", data);
      console.log("📊 HOSChart: Input logs:", logs);
      console.log("📊 HOSChart: Chart data length:", data.length);
      return data;
    } catch (error) {
      console.error("❌ HOSChart: Error generating chart data:", error);
      return [];
    }
  }, [logs]);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Always show the chart, even with sample data
  console.log("📊 HOSChart: Rendering chart with logs:", logs?.length || 0);

  const screenWidth = Dimensions.get('window').width - 64; // Account for margins
  const chartWidth = screenWidth;
  const chartHeight = 160;
  const padding = 40;

  const renderStepLineChart = () => {
    if (chartData.length === 0) {
      console.log("📊 HOSChart: No chart data available");
      return null;
    }

    console.log("📊 HOSChart: Rendering chart with", chartData.length, "data points");
    const stepPoints = [];
    const segments = [];
    const verticalLines = [];
    
    // Create step line points
    for (let i = 0; i < chartData.length; i++) {
      const point = chartData[i];
      const x = (point.x / 1440) * (chartWidth - padding * 2) + padding;
      const y = ((4 - point.y) / 3.5) * (chartHeight - padding * 2) + padding;
      
      stepPoints.push({ x, y, status: point.status, timestamp: point.timestamp });
    }

    // Create connected step-line segments
    for (let i = 0; i < stepPoints.length - 1; i++) {
      const current = stepPoints[i];
      const next = stepPoints[i + 1];
      
      console.log(`📊 HOSChart: Creating segment ${i}:`, {
        current: { x: current.x, y: current.y },
        next: { x: next.x, y: next.y },
        width: next.x - current.x,
        color: STATUS_COLORS[chartData[i].y as keyof typeof STATUS_COLORS]
      });
      
      // Horizontal segment
      segments.push(
        <View
          key={`horizontal-${i}`}
          style={[
            styles.stepSegment,
            {
              left: current.x,
              width: next.x - current.x,
              top: current.y - 1.5,
              backgroundColor: STATUS_COLORS[chartData[i].y as keyof typeof STATUS_COLORS],
            }
          ]}
        />
      );
      
      // Vertical line at status change
      if (current.y !== next.y) {
        console.log(`📊 HOSChart: Creating vertical line ${i}:`, {
          left: next.x - 1.5,
          top: Math.min(current.y, next.y) - 1.5,
          height: Math.abs(current.y - next.y) + 3
        });
        
        verticalLines.push(
          <View
            key={`vertical-${i}`}
            style={[
              styles.stepSegment,
              {
                left: next.x - 1.5,
                width: 3,
                top: Math.min(current.y, next.y) - 1.5,
                height: Math.abs(current.y - next.y) + 3,
                backgroundColor: STATUS_COLORS[next.y as keyof typeof STATUS_COLORS],
              }
            ]}
          />
        );
      }
    }
    
    console.log("📊 HOSChart: Created", segments.length, "horizontal segments and", verticalLines.length, "vertical lines");

    // Add hour markers (every 2 hours like reference image)
    const hourMarkers = [];
    const hourLabels = [];
    const hourValues = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
    
    for (const hour of hourValues) {
      const x = (hour * 60 / 1440) * (chartWidth - padding * 2) + padding;
      
      // Only show major hour markers
      if (hour % 2 === 0) {
        hourMarkers.push(
          <View
            key={`marker-${hour}`}
            style={[
              styles.hourMarker,
              { left: x }
            ]}
          />
        );
      }
      
      // Add hour labels
      let label = '';
      if (hour === 0) label = 'M';
      else if (hour === 12) label = 'N';
      else if (hour === 24) label = 'M';
      else if (hour < 12) label = hour.toString();
      else if (hour > 12) label = (hour - 12).toString();
      
      hourLabels.push(
        <Text
          key={`label-${hour}`}
          style={[
            styles.hourLabel,
            { 
              left: x - 8,
              color: colors.textDim
            }
          ]}
        >
          {label}
        </Text>
      );
    }

    // Add status level markers and labels
    const statusMarkers = [];
    const statusLabels = [];
    for (let level = 1; level <= 4; level++) {
      const y = ((4 - level) / 3.5) * (chartHeight - padding * 2) + padding;
      statusMarkers.push(
        <View
          key={`status-marker-${level}`}
          style={[
            styles.statusMarker,
            { top: y }
          ]}
        />
      );
      
      statusLabels.push(
        <Text
          key={`status-label-${level}`}
          style={[
            styles.statusLabel,
            { 
              top: y - 8,
              color: colors.textDim
            }
          ]}
        >
          {Y_TO_LABEL[level as keyof typeof Y_TO_LABEL]}
        </Text>
      );
    }

    return (
      <View style={[styles.chart, { width: chartWidth, height: chartHeight }]}>
        {/* Background grid */}
        {hourMarkers}
        {statusMarkers}
        
        {/* Chart content */}
        {segments}
        {verticalLines}
        
        {/* Debug indicator */}
        {segments.length === 0 && (
          <View style={[styles.debugIndicator, { backgroundColor: '#ff0000' }]} />
        )}
        
        {/* Labels */}
        {hourLabels}
        {statusLabels}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={20} color={colors.text} />
          <Text style={[styles.headerText, { color: colors.text }]}>
            {formattedDate}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.driverInfo}>
            <User size={16} color={colors.textDim} />
            <Text style={[styles.driverText, { color: colors.textDim }]}>
              {driverName}
            </Text>
          </View>
          <View style={styles.vehicleInfo}>
            <Truck size={16} color={colors.textDim} />
            <Text style={[styles.vehicleText, { color: colors.textDim }]}>
              {vehicleNumber}
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {renderStepLineChart()}
      </View>

      {/* Status Legend */}
      <View style={styles.legendContainer}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>Status Legend</Text>
        <View style={styles.legendGrid}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS[1] }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>ON DUTY</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS[2] }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>DRIVING</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS[3] }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>SLEEPER BERTH</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS[4] }]} />
            <Text style={[styles.legendText, { color: colors.text }]}>OFF DUTY</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverText: {
    fontSize: 12,
    marginLeft: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 12,
    marginLeft: 4,
  },
  chartContainer: {
    height: 200,
    marginBottom: 16,
  },
  chart: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  stepSegment: {
    position: 'absolute',
    borderRadius: 1,
    minHeight: 3,
    minWidth: 3,
  },
  hourMarker: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#f3f4f6',
    top: 0,
  },
  hourLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    width: 16,
  },
  statusMarker: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  statusLabel: {
    position: 'absolute',
    left: -35,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    width: 30,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  debugIndicator: {
    position: 'absolute',
    top: 50,
    left: 50,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  legendContainer: {
    marginTop: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    minWidth: '48%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});