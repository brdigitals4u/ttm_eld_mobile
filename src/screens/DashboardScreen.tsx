import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { useDashboardStats, useRecentActivity, useNotifications } from '@/api/dashboard'
import { useAuth } from '@/contexts/AuthContext'
import { useLogout } from '@/api/auth'
import { useDriverLogout } from '@/api/organization'
import { useAppTheme } from '@/theme/context'
import { useToast } from '@/providers/ToastProvider'
import { format } from 'date-fns'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

export const DashboardScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const { user, logout: authLogout } = useAuth()
  const toast = useToast()
  const logoutMutation = useLogout()
  const driverLogoutMutation = useDriverLogout()
  
  // Mock ELD data - in real app this would come from API
  const [eldData, setEldData] = useState({
    isConnected: true,
    dutyStatus: 'DRIVING', // DRIVING, ON_DUTY, OFF_DUTY, SLEEPER_BERTH
    driveTimeLeft: '05:52',
    stopInTime: '03:52',
    shiftTimeLeft: '09:23',
    cycleTimeLeft: '45:01',
    cycleDays: 6,
    currentLocation: 'Reno, NV 84012',
    vehicle: 'Truck: 174',
    trailer: 'Trailer: 015',
    coDriver: 'Felipe Hernandez'
  })

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  const handleLogout = async () => {
    try {
      // Use driver logout (handles missing API gracefully)
      await driverLogoutMutation.mutateAsync()
      
      // Clear auth state
      authLogout()
      
      // Navigate to login screen
      router.replace('/login')
      
      toast.success('Logged out successfully', 2000)
    } catch (error) {
      console.error('Logout error:', error)
      
      // Even if logout fails, clear auth state and redirect to login
      authLogout()
      router.replace('/login')
      
      toast.success('Logged out successfully', 2000)
    }
  }

  const toggleDutyStatus = () => {
    const statuses = ['DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER_BERTH']
    const currentIndex = statuses.indexOf(eldData.dutyStatus)
    const nextIndex = (currentIndex + 1) % statuses.length
    setEldData(prev => ({ ...prev, dutyStatus: statuses[nextIndex] }))
    toast.info(`Status changed to ${statuses[nextIndex]}`, 2000)
  }

  const getDutyStatusColor = () => {
    switch (eldData.dutyStatus) {
      case 'DRIVING': return '#FF6B35'
      case 'ON_DUTY': return '#28A745'
      case 'OFF_DUTY': return '#6C757D'
      case 'SLEEPER_BERTH': return '#17A2B8'
      default: return '#6C757D'
    }
  }

  const getDutyStatusText = () => {
    switch (eldData.dutyStatus) {
      case 'DRIVING': return 'DRIVING'
      case 'ON_DUTY': return 'ON DUTY'
      case 'OFF_DUTY': return 'OFF DUTY'
      case 'SLEEPER_BERTH': return 'SLEEPER BERTH'
      default: return 'OFF DUTY'
    }
  }

  const renderCircularProgress = (value: string, label: string, progress: number, color: string) => {
    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgress, { borderColor: color }]}>
          <View style={[styles.progressFill, { 
            borderColor: color,
            transform: [{ rotate: `${progress * 3.6}deg` }]
          }]} />
          <View style={styles.circularProgressInner}>
            <Text style={[styles.progressValue, { color }]}>{value}</Text>
            <Text style={[styles.progressLabel, { color: theme.colors.textDim }]}>{label}</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderLogbookGraph = () => {
    // Mock logbook data for the graph
    const logbookData = [
      { time: '00:00', status: 'OFF' },
      { time: '06:00', status: 'ON' },
      { time: '06:30', status: 'D' },
      { time: '10:00', status: 'ON' },
      { time: '10:30', status: 'OFF' },
      { time: '14:00', status: 'ON' },
      { time: '14:30', status: 'D' },
      { time: '18:00', status: 'ON' },
      { time: '18:30', status: 'OFF' }
    ]

    return (
      <View style={styles.logbookGraphContainer}>
        <View style={styles.graphHeader}>
          <Text style={[styles.graphTitle, { color: theme.colors.text }]}>
            Today | {format(new Date(), 'MMM dd (EEE)')}
          </Text>
          <TouchableOpacity style={styles.signButton}>
            <Text style={styles.signButtonText}>Sign</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.graphContainer}>
          <View style={styles.graphYAxis}>
            <Text style={styles.graphYLabel}>OFF</Text>
            <Text style={styles.graphYLabel}>SB</Text>
            <Text style={styles.graphYLabel}>D</Text>
            <Text style={styles.graphYLabel}>ON</Text>
          </View>
          
          <View style={styles.graphContent}>
            <View style={styles.graphBars}>
              {logbookData.map((entry, index) => (
                <View key={index} style={styles.graphBar}>
                  <View style={[
                    styles.graphBarFill,
                    { 
                      backgroundColor: entry.status === 'D' ? '#FF6B35' : 
                                     entry.status === 'ON' ? '#28A745' :
                                     entry.status === 'SB' ? '#17A2B8' : '#6C757D'
                    }
                  ]} />
                </View>
              ))}
            </View>
            
            <View style={styles.graphXAxis}>
              {['M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'N', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'M'].map((label, index) => (
                <Text key={index} style={styles.graphXLabel}>{label}</Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.colors.background }]} preset="scroll">
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.appTitle, { color: theme.colors.text }]}>TTMKonnect ELD</Text>
            <TouchableOpacity style={styles.infoButton}>
              <Text style={[styles.infoIcon, { color: theme.colors.textDim }]}>ℹ</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={[styles.logoutText, { color: theme.colors.textDim }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <TouchableOpacity style={[styles.connectedButton, { backgroundColor: '#28A745' }]}>
            <Text style={styles.connectedIcon}>🔗</Text>
            <Text style={styles.connectedText}>CONNECTED</Text>
          </TouchableOpacity>
        </View>

        {/* Driver Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <View style={styles.driverInfo}>
            <View style={styles.driverLeft}>
              <View style={styles.truckIcon}>
                <Text style={styles.truckIconText}>🚛</Text>
              </View>
              <View>
                <Text style={[styles.driverName, { color: theme.colors.text }]}>{user?.firstName} {user?.lastName}</Text>
                <Text style={[styles.driverDetails, { color: theme.colors.textDim }]}>
                  Co-Driver: {eldData.coDriver}
                </Text>
                <Text style={[styles.vehicleInfo, { color: theme.colors.textDim }]}>
                  {eldData.vehicle} | {eldData.trailer}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Duty Status */}
        <Card style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <View style={styles.dutyStatusContainer}>
            <Text style={[styles.dutyStatusLabel, { color: theme.colors.text }]}>Duty Status</Text>
            <View style={styles.dutyStatusRow}>
              <TouchableOpacity onPress={toggleDutyStatus}>
                <Text style={[styles.dutyStatusValue, { color: getDutyStatusColor() }]}>
                  {getDutyStatusText()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* HOS Timers */}
        <Card style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <View style={styles.hosContainer}>
            <View style={styles.hosHeader}>
              <Text style={styles.usaFlag}>🇺🇸</Text>
              <Text style={[styles.usaText, { color: theme.colors.text }]}>USA 70 hours / 8 days</Text>
            </View>
            
            <View style={styles.timersContainer}>
              {/* Main Circular Timer */}
              <View style={styles.mainTimer}>
                {renderCircularProgress(eldData.stopInTime, 'Stop In', 0.7, '#FF6B35')}
              </View>
              
              {/* Side Timers */}
              <View style={styles.sideTimers}>
                <View style={styles.sideTimer}>
                  <Text style={[styles.sideTimerValue, { color: '#28A745' }]}>{eldData.driveTimeLeft}</Text>
                  <Text style={[styles.sideTimerLabel, { color: theme.colors.textDim }]}>Drive Left</Text>
                  <View style={[styles.sideProgressBar, { backgroundColor: '#E9ECEF' }]}>
                    <View style={[styles.sideProgressFill, { backgroundColor: '#28A745', width: '60%' }]} />
                  </View>
                </View>
                
                <View style={styles.sideTimer}>
                  <Text style={[styles.sideTimerValue, { color: '#28A745' }]}>{eldData.shiftTimeLeft}</Text>
                  <Text style={[styles.sideTimerLabel, { color: theme.colors.textDim }]}>Shift Left</Text>
                  <View style={[styles.sideProgressBar, { backgroundColor: '#E9ECEF' }]}>
                    <View style={[styles.sideProgressFill, { backgroundColor: '#28A745', width: '80%' }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Cycle Left */}
        <Card style={[styles.card, { backgroundColor: theme.colors.background }]}>
          <View style={styles.cycleContainer}>
            <Text style={[styles.cycleLabel, { color: theme.colors.text }]}>Cycle Left</Text>
            <View style={styles.cycleRow}>
              <Text style={[styles.cycleValue, { color: '#28A745' }]}>
                {eldData.cycleTimeLeft}
              </Text>
              <Text style={[styles.cycleDays, { color: theme.colors.textDim }]}>
                ({eldData.cycleDays} Days)
              </Text>
            </View>
            <View style={[styles.cycleProgressBar, { backgroundColor: '#E9ECEF' }]}>
              <View style={[styles.cycleProgressFill, { backgroundColor: '#28A745', width: '85%' }]} />
            </View>
          </View>
        </Card>

        {/* Logbook Graph */}
        <Card style={[styles.card, { backgroundColor: theme.colors.background }]}>
          {renderLogbookGraph()}
        </Card>

        {/* Current Status Footer */}
        <View style={styles.statusFooter}>
          <Text style={[styles.currentStatus, { color: getDutyStatusColor() }]}>
            {getDutyStatusText()}
          </Text>
          <TouchableOpacity style={styles.locationButton}>
            <Text style={styles.locationIcon}>📍</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 16,
  },
  connectionStatus: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  connectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  connectedIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  connectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  truckIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  truckIconText: {
    fontSize: 20,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  driverDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  vehicleInfo: {
    fontSize: 14,
  },
  dutyStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dutyStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dutyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dutyStatusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 16,
  },
  hosContainer: {
    alignItems: 'center',
  },
  hosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  usaFlag: {
    fontSize: 16,
    marginRight: 8,
  },
  usaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  mainTimer: {
    flex: 1,
    alignItems: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circularProgressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sideTimers: {
    flex: 1,
    paddingLeft: 20,
  },
  sideTimer: {
    marginBottom: 16,
  },
  sideTimerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sideTimerLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  sideProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  sideProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  cycleContainer: {
    alignItems: 'center',
  },
  cycleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  cycleValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cycleDays: {
    fontSize: 16,
  },
  cycleProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  cycleProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  logbookGraphContainer: {
    width: '100%',
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  signButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  graphContainer: {
    flexDirection: 'row',
  },
  graphYAxis: {
    width: 30,
    justifyContent: 'space-between',
    height: 120,
    paddingVertical: 8,
  },
  graphYLabel: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
  },
  graphContent: {
    flex: 1,
    marginLeft: 8,
  },
  graphBars: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  graphBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
  },
  graphBarFill: {
    height: '60%',
    borderRadius: 1,
  },
  graphXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  graphXLabel: {
    fontSize: 10,
    color: '#6C757D',
    textAlign: 'center',
    flex: 1,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  currentStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
})