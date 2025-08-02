import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  SlideInUp,
  ZoomIn
} from 'react-native-reanimated';
import { useVehicleSetup, SetupStep } from '@/context/vehicle-setup-context';
import { 
  Activity, 
  Database, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Truck,
  ArrowRight,
  BarChart3
} from 'lucide-react-native';
import { router } from 'expo-router';
import TTMBLEManager from '@/src/utils/TTMBLEManager';
import { ELDDeviceService } from '@/src/services/ELDDeviceService';

const colors = {
  background: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  inactive: '#6B7280',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  successLight: '#ECFDF5',
  warningLight: '#FFFBEB',
};

interface ELDDataSummary {
  totalRecords: number;
  lastReceived: Date | null;
  dataTypes: string[];
  averageInterval: number;
  status: 'active' | 'idle' | 'error';
}

export default function DataCollectionStep() {
  const { 
    selectedDevice,
    addLog,
    resetState,
    setStep,
    setError
  } = useVehicleSetup();
  
  const [eldData, setEldData] = useState<any[]>([]);
  const [dataSummary, setDataSummary] = useState<ELDDataSummary>({
    totalRecords: 0,
    lastReceived: null,
    dataTypes: [],
    averageInterval: 0,
    status: 'idle'
  });
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionDuration, setCollectionDuration] = useState(0);
  const [noDataTimeout, setNoDataTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const pulseAnimation = useSharedValue(1);
  const dataCountAnimation = useSharedValue(0);
  const statusAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Start data collection
    initializeDataCollection();
    
    // Start pulse animation
    pulseAnimation.value = withRepeat(
      withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    // Track collection duration
    const durationInterval = setInterval(() => {
      setCollectionDuration(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(durationInterval);
      if (noDataTimeout) {
        clearTimeout(noDataTimeout);
      }
    };
  }, []);
  
  const initializeDataCollection = async () => {
    setIsCollecting(true);
    addLog('Starting ELD data collection');
    
    try {
      // Start ELD data reporting
      await TTMBLEManager.startReportEldData();
      
      // Set up data listener
      const dataSubscription = TTMBLEManager.onNotifyReceived((data: any) => {
        handleNewELDData(data);
      });
      
      // Set timeout for no data received
      const timeout = setTimeout(() => {
        handleNoDataReceived();
      }, 30000); // 30 seconds timeout
      
      setNoDataTimeout(timeout);
      
      // Update status
      setDataSummary(prev => ({ ...prev, status: 'active' }));
      statusAnimation.value = withSpring(1);
      
    } catch (error) {
      console.error('Failed to start data collection:', error);
      addLog(`Data collection failed: ${error}`);
      handleDataCollectionError(error);
    }
  };
  
  const handleNewELDData = (data: any) => {
    // Clear no-data timeout
    if (noDataTimeout) {
      clearTimeout(noDataTimeout);
      setNoDataTimeout(null);
    }
    
    const timestamp = new Date();
    const newDataPoint = {
      ...data,
      timestamp,
      id: Date.now() + Math.random()
    };
    
    setEldData(prev => {
      const updated = [...prev, newDataPoint];
      
      // Update summary
      const dataTypes = [...new Set(updated.map(d => d.dataType || 'Unknown'))];
      const intervals = updated.slice(1).map((d, i) => 
        d.timestamp.getTime() - updated[i].timestamp.getTime()
      ).filter(interval => interval > 0);
      
      const averageInterval = intervals.length > 0 
        ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / 1000
        : 0;
      
      setDataSummary({
        totalRecords: updated.length,
        lastReceived: timestamp,
        dataTypes,
        averageInterval,
        status: 'active'
      });
      
      // Animate data count
      dataCountAnimation.value = withSpring(updated.length);
      
      return updated.slice(-50); // Keep last 50 records
    });
    
    // Log successful data collection
    addLog(`ELD data received: ${data.dataType || 'Unknown type'}`);
    
    // Send data to Supabase
    if (selectedDevice) {
      ELDDeviceService.logELDData(selectedDevice.id, newDataPoint);
    }
    
    // Reset no-data timeout
    const timeout = setTimeout(() => {
      handleNoDataReceived();
    }, 60000); // 1 minute timeout for subsequent data
    
    setNoDataTimeout(timeout);
  };
  
  const handleNoDataReceived = () => {
    addLog('No ELD data received - device may not be sending data');
    setDataSummary(prev => ({ ...prev, status: 'error' }));
    
    // Send error to Supabase
    if (selectedDevice) {
      ELDDeviceService.logConnectionFailure(selectedDevice, {
        message: 'Device not sending data',
        status: 'NO_DATA'
      });
    }
    
    // Show error step
    setError({
      type: 'no_data',
      message: 'Device is not sending data',
      details: 'The ELD device is connected but not transmitting any data. This could indicate a device configuration issue or hardware problem.',
      code: 'NO_DATA_RECEIVED'
    });
    
    setStep(SetupStep.ERROR);
  };
  
  const handleDataCollectionError = (error: any) => {
    setIsCollecting(false);
    setDataSummary(prev => ({ ...prev, status: 'error' }));
    
    setError({
      type: 'no_data',
      message: 'Failed to start data collection',
      details: error.message || 'Unknown error occurred while trying to collect ELD data',
      code: error.code || 'DATA_COLLECTION_ERROR'
    });
    
    setStep(SetupStep.ERROR);
  };
  
  const handleGoToDashboard = () => {
    addLog('Data collection completed - navigating to dashboard');
    resetState();
    router.replace('/(app)/(tabs)');
  };
  
  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnimation.value }],
    };
  });
  
  const animatedDataCountStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dataCountAnimation.value > 0 ? 1 : 0 }],
    };
  });
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = () => {
    switch (dataSummary.status) {
      case 'active': return colors.success;
      case 'error': return colors.error;
      default: return colors.warning;
    }
  };
  
  const renderDataRecord = (record: any, index: number) => (
    <Animated.View 
      key={record.id}
      entering={SlideInUp.delay(index * 50)}
      style={styles.dataRecord}
    >
      <View style={styles.dataHeader}>
        <Text style={styles.dataType}>
          {record.dataType || 'Unknown'}
        </Text>
        <Text style={styles.dataTime}>
          {record.timestamp.toLocaleTimeString()}
        </Text>
      </View>
      
      {record.rawData && (
        <Text style={styles.dataContent} numberOfLines={2}>
          {record.rawData}
        </Text>
      )}
      
      {record.ack && (
        <Text style={styles.dataAck}>✓ Acknowledged</Text>
      )}
    </Animated.View>
  );
  
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconContainer, animatedPulseStyle]}>
          <Database size={48} color={getStatusColor()} />
        </Animated.View>
        
        <Text style={styles.title}>ELD Data Collection</Text>
        
        <Text style={styles.subtitle}>
          {isCollecting 
            ? 'Actively collecting data from your ELD device'
            : 'Monitoring ELD data transmission'
          }
        </Text>
      </View>
      
      {selectedDevice && (
        <Animated.View entering={ZoomIn.delay(300)} style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Truck size={20} color={colors.primary} />
            <Text style={styles.deviceLabel}>Connected Device</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          </View>
          <Text style={styles.deviceName}>
            {selectedDevice.name || 'Unknown Device'}
          </Text>
        </Animated.View>
      )}
      
      <Animated.View entering={FadeIn.delay(500)} style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <BarChart3 size={24} color={colors.primary} />
            <Animated.Text style={[styles.statValue, animatedDataCountStyle]}>
              {dataSummary.totalRecords}
            </Animated.Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
          
          <View style={styles.statItem}>
            <Clock size={24} color={colors.primary} />
            <Text style={styles.statValue}>
              {formatDuration(collectionDuration)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Activity size={24} color={getStatusColor()} />
            <Text style={[styles.statValue, { color: getStatusColor() }]}>
              {dataSummary.status.toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
        
        {dataSummary.dataTypes.length > 0 && (
          <View style={styles.dataTypesContainer}>
            <Text style={styles.dataTypesTitle}>Data Types Received:</Text>
            <View style={styles.dataTypesList}>
              {dataSummary.dataTypes.map((type, index) => (
                <View key={index} style={styles.dataTypeChip}>
                  <Text style={styles.dataTypeText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.View>
      
      {eldData.length > 0 && (
        <Animated.View entering={FadeIn.delay(700)} style={styles.dataSection}>
          <Text style={styles.dataSectionTitle}>
            Recent ELD Data ({eldData.length})
          </Text>
          
          <ScrollView style={styles.dataList} showsVerticalScrollIndicator={false}>
            {eldData.slice(-10).reverse().map(renderDataRecord)}
          </ScrollView>
        </Animated.View>
      )}
      
      <Animated.View entering={SlideInUp.delay(1000)} style={styles.actions}>
        {dataSummary.totalRecords > 0 && (
          <Pressable 
            style={[styles.button, styles.successButton]}
            onPress={handleGoToDashboard}
          >
            <CheckCircle size={20} color={colors.background} />
            <Text style={styles.successButtonText}>
              Data Collection Active - Continue to Dashboard
            </Text>
            <ArrowRight size={20} color={colors.background} />
          </Pressable>
        )}
        
        {eldData.length === 0 && collectionDuration > 15 && (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={styles.waitingText}>
              Waiting for ELD data... ({formatDuration(collectionDuration)})
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 22,
  },
  deviceCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inactive,
    marginLeft: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inactive,
    textAlign: 'center',
  },
  dataTypesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  dataTypesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dataTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dataTypeChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dataTypeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  dataSection: {
    flex: 1,
    marginBottom: 20,
  },
  dataSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dataList: {
    flex: 1,
  },
  dataRecord: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dataType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  dataTime: {
    fontSize: 12,
    color: colors.inactive,
  },
  dataContent: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.card,
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
  },
  dataAck: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  actions: {
    paddingTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  successButton: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    flex: 1,
    textAlign: 'center',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  waitingText: {
    fontSize: 14,
    color: colors.warning,
    marginLeft: 8,
    fontWeight: '500',
  },
});
