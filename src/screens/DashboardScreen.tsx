import { router } from 'expo-router';
import { AlertTriangle, Bluetooth, Clock, FileText, Lock, Shield, RefreshCw, Link } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, SafeAreaView } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/stores/authStore';
import { useStatus } from '@/contexts';
import { useAppTheme } from '@/theme/context';

export const DashboardScreen = () => {
  const { theme, themeContext } = useAppTheme();
  const isDark = themeContext === 'dark';
  const colors = theme.colors;
  const { user, driverProfile, vehicleAssignment } = useAuth();
  const { currentStatus, hoursOfService, formatDuration, certification } = useStatus();
  const [showUncertifiedModal, setShowUncertifiedModal] = useState(false);
  
  // Mock dashboard data until we have proper API integration
  const dashboardData = {
    driver: { name: driverProfile?.name || user?.name || 'Driver' },
    connectionStatus: 'connected',
    cycle: { type: 'USA', hours: 70, days: 8 },
    timers: {
      stopIn: 232,
      driveLeft: 352,
      shiftLeft: 563,
      cycleLeft: 2701,
      cycleDays: 6
    },
    uncertifiedLogs: 0,
    currentStatus: currentStatus
  };

  // Show uncertified logs modal when data loads
  React.useEffect(() => {
    if (dashboardData && dashboardData.uncertifiedLogs > 0) {
      setShowUncertifiedModal(true);
    }
  }, [dashboardData.uncertifiedLogs]);

  const getStatusLabel = () => {
    const status = dashboardData?.currentStatus || currentStatus;
    switch (status) {
      case 'driving':
        return 'DRIVING';
      case 'onDuty':
        return 'ON DUTY';
      case 'offDuty':
        return 'OFF DUTY';
      case 'sleeperBerth':
        return 'SLEEPER BERTH';
      case 'personalConveyance':
        return 'PERSONAL CONVEYANCE';
      case 'yardMoves':
        return 'YARD MOVES';
      default:
        return status?.toUpperCase() || 'OFF DUTY';
    }
  };

  const getStatusColor = () => {
    const status = dashboardData?.currentStatus || currentStatus;
    switch (status) {
      case 'driving':
        return '#FF9500';
      case 'onDuty':
        return '#F59E0B';
      case 'offDuty':
        return '#3B82F6';
      case 'sleeperBerth':
        return '#6366F1';
      case 'personalConveyance':
        return '#9333EA';
      case 'yardMoves':
        return '#F59E0B';
      default:
        return colors.tint;
    }
  };


  const handleCertifyLogs = async () => {
    try {
      // Navigate to logs screen for certification
      router.push('/(tabs)/logs');
      setShowUncertifiedModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to navigate to logs. Please try again.');
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatCycleTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (remaining: number, total: number): number => {
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  };

  return (
    
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/assignments')}>
            <Link size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.driverName, { color: colors.text }]}>
            {dashboardData?.driver.name || user?.name || 'Dan Smith'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Connection Status */}
      <View style={[styles.connectionStatus, { 
        backgroundColor: dashboardData?.connectionStatus === 'connected' ? colors.successBackground : colors.warningBackground 
      }]}>
        <Link size={16} color={dashboardData?.connectionStatus === 'connected' ? colors.success : colors.warning} />
        <Text style={[styles.connectionText, { 
          color: dashboardData?.connectionStatus === 'connected' ? colors.success : colors.warning 
        }]}>
          {dashboardData?.connectionStatus === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
        </Text>
      </View>

      {/* Cycle Info */}
      <View style={styles.cycleInfo}>
        <Text style={[styles.cycleText, { color: colors.textDim }]}>
          🇺🇸 {dashboardData?.cycle.type || 'USA'} {dashboardData?.cycle.hours || 70} hours / {dashboardData?.cycle.days || 8} days
        </Text>
      </View>

      {/* Main Timer Circle */}
      <View style={styles.mainTimerContainer}>
        <View style={[styles.timerCircle, { borderColor: colors.success }]}>
          <Text style={[styles.mainTime, { color: colors.text }]}>
            {formatTime(dashboardData?.timers.stopIn || 232)}
          </Text>
          <Text style={[styles.mainTimeLabel, { color: colors.textDim }]}>
            Stop In
          </Text>
        </View>
      </View>

      {/* Time Bars */}
      <View style={styles.timeBarsContainer}>
        <View style={styles.timeBarRow}>
          <View style={styles.timeBarItem}>
            <Text style={[styles.timeBarTime, { color: colors.text }]}>
              {formatTime(dashboardData?.timers.driveLeft || 352)}
            </Text>
            <Text style={[styles.timeBarLabel, { color: colors.textDim }]}>
              Drive Left
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { 
                backgroundColor: colors.success,
                width: `${getProgressPercentage(dashboardData?.timers.driveLeft || 352, 660)}%`
              }]} />
            </View>
          </View>
          
          <View style={styles.timeBarItem}>
            <Text style={[styles.timeBarTime, { color: colors.text }]}>
              {formatTime(dashboardData?.timers.shiftLeft || 563)}
            </Text>
            <Text style={[styles.timeBarLabel, { color: colors.textDim }]}>
              Shift Left
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { 
                backgroundColor: colors.success,
                width: `${getProgressPercentage(dashboardData?.timers.shiftLeft || 563, 840)}%`
              }]} />
            </View>
          </View>
        </View>
        
        <View style={styles.cycleTimeContainer}>
          <Text style={[styles.cycleLabel, { color: colors.textDim }]}>
            Cycle Left
          </Text>
          <Text style={[styles.cycleTime, { color: colors.text }]}>
            {formatCycleTime(dashboardData?.timers.cycleLeft || 2701)} ({dashboardData?.timers.cycleDays || 6} Days)
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { 
              backgroundColor: colors.success,
              width: `${getProgressPercentage(dashboardData?.timers.cycleLeft || 2701, 4200)}%`
            }]} />
          </View>
        </View>
      </View>

      {/* Current Status and Action Button */}
      <View style={styles.statusActionContainer}>
        <View style={styles.currentStatusContainer}>
          <Text style={[styles.currentStatusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/status')}
        >
          <RefreshCw size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Uncertified Logs Modal */}
      <Modal
        visible={showUncertifiedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUncertifiedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              You have {dashboardData?.uncertifiedLogs || 22} uncertified logs!
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.success }]}
                onPress={handleCertifyLogs}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  REVIEW AND CERTIFY
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'transparent' }]}
                onPress={() => setShowUncertifiedModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.tint }]}>
                  SKIP
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      <View style={styles.vehicleInfo}>
        <Text style={[styles.vehicleInfoTitle, { color: colors.textDim }]}>
          Vehicle Information
        </Text>
        <Text style={[styles.vehicleInfoValue, { color: colors.text }]}>
          {vehicleAssignment?.vehicle_info?.vehicle_unit || 'No vehicle assigned'}
        </Text>
      </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 30,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 10,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 6,
  },
  cycleInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cycleText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  mainTimerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainTime: {
    fontSize: 48,
    fontWeight: '700' as const,
  },
  mainTimeLabel: {
    fontSize: 18,
    fontWeight: '500' as const,
    marginTop: 4,
  },
  timeBarsContainer: {
    marginBottom: 24,
  },
  timeBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeBarItem: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeBarTime: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeBarLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  cycleTimeContainer: {
    marginTop: 8,
  },
  cycleLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  cycleTime: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  currentStatusContainer: {
    flex: 1,
  },
  currentStatusText: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  vehicleInfo: {
    marginTop: 8,
    marginBottom: 40,
  },
  vehicleInfoTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  vehicleInfoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  webNoticeCard: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  webNoticeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  demoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  demoCard: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  demoCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  demoCardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
});
