import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Dimensions, Animated, TouchableOpacity } from 'react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { useAppTheme } from '@/theme/context'
import { RealmService } from '@/database/realm'
import { Icon } from '@/components/Icon'

const { width } = Dimensions.get('window')

// Enhanced Progress Bar Component
const ProgressBar = ({ percentage, color = '#10B981', backgroundColor = '#6B7280', height = 4 }: any) => {
  return (
    <View style={[styles.progressContainer, { height, backgroundColor }]}>
      <View style={[styles.progressBar, { 
        width: `${Math.min(percentage, 100)}%`, 
        backgroundColor: color,
        height 
      }]} />
    </View>
  )
}

// Circular Progress Component matching the image
const CircularProgress = ({ percentage, time, label, size = 120, strokeWidth = 8 }: any) => {
  const rotation = (percentage / 100) * 360

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background circle */}
      <View style={[styles.circularBackground, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: '#6B7280',
      }]} />
      
      {/* Progress arc */}
      <View style={[styles.circularProgress, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: 'transparent',
        borderTopColor: '#10B981',
        borderRightColor: percentage > 25 ? '#10B981' : 'transparent',
        borderBottomColor: percentage > 50 ? '#10B981' : 'transparent',
        borderLeftColor: percentage > 75 ? '#10B981' : 'transparent',
        transform: [{ rotate: `${rotation}deg` }],
      }]} />
      
      <View style={styles.circularContent}>
        <Text style={styles.circularTime}>{time}</Text>
        <Text style={styles.circularLabel}>{label}</Text>
      </View>
    </View>
  )
}

export const DashboardScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Get data from Realm
  const driverProfile = RealmService.getDriverProfile() as any
  const hosStatus = RealmService.getHOSStatus() as any
  const vehicleAssignment = RealmService.getVehicleAssignment() as any

  const currentUser = driverProfile || {}
  const currentHOS = hosStatus || {}
  const currentVehicle = vehicleAssignment?.vehicle_info || {}

  // Real-time calculations
  const driveTimeRemaining = currentHOS.driving_time_remaining || 352 // Default to 05:52
  const onDutyTimeRemaining = currentHOS.on_duty_time_remaining || 563 // Default to 09:23
  const cycleTimeRemaining = currentHOS.cycle_time_remaining || 2701 // Default to 45:01

  // Calculate percentages for progress bars
  const driveProgress = Math.max(0, Math.min(100, ((660 - driveTimeRemaining) / 660) * 100))
  const shiftProgress = Math.max(0, Math.min(100, ((840 - onDutyTimeRemaining) / 840) * 100))
  const cycleProgress = Math.max(0, Math.min(100, ((4200 - cycleTimeRemaining) / 4200) * 100))

  // Format time display
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Screen 
      preset="scroll"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.screenContent}>
        {/* Compact Header - Exact Match */}
        <View style={styles.compactHeader}>
          <View style={styles.headerRow}>
            <Text style={styles.appTitle}>TruckX ELD One</Text>
            <TouchableOpacity style={styles.infoIcon}>
              <View style={styles.infoCircle}>
                <Text style={styles.infoText}>!</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Connected Banner - Exact Match */}
          <View style={styles.connectedBanner}>
            <View style={styles.connectionIcon} />
            <Text style={styles.connectedText}>CONNECTED</Text>
          </View>

          {/* Driver Info - Exact Match */}
          <Text style={styles.driverName}>
            {currentUser.firstName || 'Dan'} {currentUser.lastName || 'Smith'}
          </Text>
          <Text style={styles.coDriverText}>Co-Driver: Felipe Hernandez</Text>
          <Text style={styles.vehicleText}>
            Truck: {currentVehicle.vehicle_unit || '174'}  |  Trailer: {currentVehicle.trailer_unit || '015'}
          </Text>
        </View>

        {/* Status Section - Exact Match */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Duty Status</Text>
            <TouchableOpacity style={styles.changeButton}>
              <Icon icon="check" color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
          <View style={styles.drivingStatusContainer}>
            <Text style={styles.drivingText}>
              {currentHOS.current_status || 'DRIVING'}
            </Text>
          </View>
        </View>

        {/* USA Flag - Exact Match */}
        <View style={styles.flagSection}>
          <Text style={styles.flagEmoji}>🇺🇸</Text>
          <Text style={styles.usaText}>USA</Text>
        </View>

        {/* Main Timer Layout - Exact Match */}
        <View style={styles.mainTimerSection}>
          <View style={styles.timerRow}>
            {/* Left Timer */}
            <View style={styles.sideTimer}>
              <Text style={styles.timerValue}>{formatTime(driveTimeRemaining)}</Text>
              <Text style={styles.timerLabel}>Drive Left</Text>
              <View style={styles.progressBarContainer}>
                <ProgressBar percentage={driveProgress} />
              </View>
            </View>

            {/* Center Circular Timer */}
            <View style={styles.centerTimerContainer}>
              <CircularProgress 
                percentage={driveProgress} 
                time={formatTime(driveTimeRemaining)} 
                label="Stop In" 
                size={120}
                strokeWidth={8}
              />
            </View>

            {/* Right Timer */}
            <View style={styles.sideTimer}>
              <Text style={styles.timerValue}>{formatTime(onDutyTimeRemaining)}</Text>
              <Text style={styles.timerLabel}>Shift Left</Text>
              <View style={styles.progressBarContainer}>
                <ProgressBar percentage={shiftProgress} />
              </View>
            </View>
          </View>

          {/* Cycle Timer - Below */}
          <View style={styles.cycleSection}>
            <Text style={styles.cycleLabel}>Cycle Left</Text>
            <Text style={styles.cycleValue}>
              {formatTime(cycleTimeRemaining)} <Text style={styles.cycleDays}>({Math.ceil(cycleTimeRemaining / 1440)} Days)</Text>
            </Text>
            <View style={styles.cycleProgressContainer}>
              <ProgressBar percentage={cycleProgress} height={6} />
            </View>
          </View>
        </View>

        {/* Timeline Section - Exact Match */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>
              Today | {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({currentTime.toLocaleDateString('en-US', { weekday: 'short' })})
            </Text>
            <TouchableOpacity style={styles.signButton}>
              <Text style={styles.signButtonText}>Sign</Text>
            </TouchableOpacity>
          </View>

          {/* Hour Markers */}
          <View style={styles.hourMarkers}>
            {['M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'N', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'M'].map((hour, index) => (
              <Text key={index} style={styles.hourMarker}>{hour}</Text>
            ))}
          </View>

          {/* Timeline Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.yAxisLabels}>
              <Text style={styles.yLabel}>OFF</Text>
              <Text style={styles.yLabel}>SB</Text>
              <Text style={styles.yLabel}>D</Text>
              <Text style={styles.yLabel}>ON</Text>
            </View>
            
            <View style={styles.chartArea}>
              <View style={styles.timelineBars}>
                <View style={[styles.timelineBar, styles.dBar, { flex: 2 }]} />
                <View style={[styles.timelineBar, styles.offBar, { flex: 1 }]} />
                <View style={[styles.timelineBar, styles.dBar, { flex: 3 }]} />
                <View style={[styles.timelineBar, styles.offBar, { flex: 1 }]} />
              </View>
            </View>

            <View style={styles.timeStamps}>
              <Text style={styles.timeStamp}>10:04</Text>
              <Text style={styles.timeStamp}>00:00</Text>
              <Text style={styles.timeStamp}>07:48</Text>
              <Text style={styles.timeStamp}>00:00</Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  content: {
    paddingBottom: 100,
  },
  screenContent: {
    flex: 1,
  },

  // Compact Header - Exact Match
  compactHeader: {
    backgroundColor: '#1F2937',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoIcon: {
    width: 24,
    height: 24,
  },
  infoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  connectionIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  connectedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  coDriverText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#D1D5DB',
    marginBottom: 4,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#D1D5DB',
  },

  // Status Section - Exact Match
  statusSection: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  changeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drivingStatusContainer: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  drivingText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 2,
  },

  // Flag Section - Exact Match
  flagSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    gap: 8,
  },
  flagEmoji: {
    fontSize: 20,
  },
  usaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Main Timer Section - Exact Match
  mainTimerSection: {
    backgroundColor: '#374151',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sideTimer: {
    flex: 1,
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '80%',
  },

  // Progress Bar Components
  progressContainer: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    borderRadius: 2,
  },

  // Center Circular Timer - Exact Match
  centerTimerContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  circularBackground: {
    position: 'absolute',
  },
  circularProgress: {
    position: 'absolute',
  },
  circularContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  circularTime: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  circularLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1D5DB',
    marginTop: 2,
  },

  // Cycle Section - Exact Match
  cycleSection: {
    alignItems: 'center',
  },
  cycleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 4,
  },
  cycleValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cycleDays: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  cycleProgressContainer: {
    width: '100%',
  },

  // Timeline Section - Exact Match
  timelineSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  signButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Timeline Chart - Exact Match
  hourMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  hourMarker: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'stretch',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    paddingRight: 8,
    width: 24,
  },
  yLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  timelineBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  timelineBar: {
    height: 16,
  },
  dBar: {
    backgroundColor: '#3B82F6',
  },
  offBar: {
    backgroundColor: '#E5E7EB',
  },
  timeStamps: {
    justifyContent: 'space-between',
    paddingLeft: 8,
    width: 32,
  },
  timeStamp: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'right',
  },
})