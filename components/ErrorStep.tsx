import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  ZoomIn,
  SlideInUp,
  ShakeX
} from 'react-native-reanimated';
import { useVehicleSetup, SetupStep, ErrorInfo } from '@/context/vehicle-setup-context';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Send, 
  ChevronDown, 
  ChevronUp,
  Bluetooth,
  Wifi,
  Settings
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
  errorLight: '#FEF2F2',
  errorDark: '#DC2626',
};

const getErrorIcon = (errorType: string) => {
  switch (errorType) {
    case 'connection_failed':
      return Bluetooth;
    case 'no_data':
      return Wifi;
    case 'permission_denied':
    case 'sdk_error':
    default:
      return Settings;
  }
};

const getErrorSolution = (errorType: string) => {
  switch (errorType) {
    case 'connection_failed':
      return [
        'Ensure your ELD device is powered on',
        'Check if the device is in pairing mode',
        'Verify you are within 30 feet of the device',
        'Try restarting the ELD device'
      ];
    case 'no_data':
      return [
        'Check device connection stability',
        'Ensure ELD device is properly configured',
        'Verify device firmware is up to date',
        'Contact device manufacturer support'
      ];
    case 'permission_denied':
      return [
        'Enable Bluetooth permissions in Settings',
        'Allow Location access for the app',
        'Restart the app and try again'
      ];
    case 'sdk_error':
    default:
      return [
        'Restart the application',
        'Check your internet connection',
        'Try clearing app cache',
        'Contact technical support if issue persists'
      ];
  }
};

export default function ErrorStep() {
  const { 
    error, 
    selectedDevice,
    setStep,
    setError,
    addLog,
    resetState,
    logs
  } = useVehicleSetup();
  
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSendingLogs, setIsSendingLogs] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [logsSent, setLogsSent] = useState(false);
  
  const errorScale = useSharedValue(0);
  const shakeAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Error animation sequence
    errorScale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });
    
    shakeAnimation.value = withDelay(
      300,
      withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      )
    );
    
    fadeAnimation.value = withDelay(
      600,
      withTiming(1, { duration: 800 })
    );
    
    // Log error occurrence
    if (error) {
      addLog(`Error occurred: ${error.type} - ${error.message}`);
    }
    
    // Auto-send logs to server after 5 seconds
    const timer = setTimeout(() => {
      if (!logsSent) {
        handleSendLogs();
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [error]);
  
  const animatedErrorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: errorScale.value },
        { translateX: shakeAnimation.value }
      ],
    };
  });
  
  const animatedFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnimation.value,
    };
  });
  
  const handleRetry = async () => {
    setIsRetrying(true);
    addLog('User initiated retry');
    
    try {
      // Stop any ongoing scanning
      await TTMBLEManager.stopScan();
      
      // Reset error state
      setError(null);
      
      // Go back to device selection or scanning
      if (selectedDevice) {
        setStep(SetupStep.CONNECTING);
      } else {
        setStep(SetupStep.SCAN_DEVICES);
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      addLog(`Retry failed: ${retryError}`);
    } finally {
      setIsRetrying(false);
    }
  };
  
  const handleSendLogs = async () => {
    setIsSendingLogs(true);
    addLog('Sending error logs to server');
    
    try {
      // Send logs to Supabase
      if (error && selectedDevice) {
        await ELDDeviceService.logConnectionFailure(selectedDevice, {
          message: error.message,
          status: error.code
        });
      }
      
      // Send all logs
      await ELDDeviceService.sendDiagnosticLogs({
        errorType: error?.type || 'unknown',
        errorMessage: error?.message || 'Unknown error',
        deviceInfo: selectedDevice,
        logs: logs
      });
      
      setLogsSent(true);
      addLog('Error logs sent successfully');
      
      // Navigate to dashboard after successful log sending
      setTimeout(() => {
        handleGoToDashboard();
      }, 2000);
      
    } catch (logError) {
      console.error('Failed to send logs:', logError);
      addLog(`Failed to send logs: ${logError}`);
    } finally {
      setIsSendingLogs(false);
    }
  };
  
  const handleGoToDashboard = () => {
    addLog('Navigating to dashboard');
    resetState();
    // Stop SDK scanning
    TTMBLEManager.stopScan().catch(console.error);
    router.replace('/(app)/(tabs)');
  };
  
  const ErrorIcon = error ? getErrorIcon(error.type) : AlertTriangle;
  const solutions = error ? getErrorSolution(error.type) : [];
  
  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.errorContainer, animatedErrorStyle]}>
          <View style={styles.errorBackground}>
            <ErrorIcon size={64} color={colors.error} />
          </View>
        </Animated.View>
        
        <Animated.Text 
          entering={SlideInUp.delay(500)} 
          style={styles.title}
        >
          Connection Failed
        </Animated.Text>
        
        <Animated.Text 
          entering={SlideInUp.delay(700)}
          style={styles.subtitle}
        >
          {error?.message || 'An unexpected error occurred during device connection'}
        </Animated.Text>
      </View>
      
      {selectedDevice && (
        <Animated.View 
          entering={FadeIn.delay(900)} 
          style={styles.deviceCard}
        >
          <Text style={styles.deviceLabel}>Failed Device</Text>
          <Text style={styles.deviceName}>
            {selectedDevice.name || 'Unknown Device'}
          </Text>
          <Text style={styles.deviceId}>
            ID: {selectedDevice.id?.substring(selectedDevice.id.length - 8) || 'N/A'}
          </Text>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.content, animatedFadeStyle]}>
        <View style={styles.solutionsContainer}>
          <Text style={styles.solutionsTitle}>Troubleshooting Steps</Text>
          
          {solutions.map((solution, index) => (
            <View key={index} style={styles.solutionItem}>
              <View style={styles.solutionNumber}>
                <Text style={styles.solutionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.solutionText}>{solution}</Text>
            </View>
          ))}
        </View>
        
        {error?.details && (
          <View style={styles.detailsContainer}>
            <Pressable 
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>Technical Details</Text>
              {showDetails ? (
                <ChevronUp size={20} color={colors.inactive} />
              ) : (
                <ChevronDown size={20} color={colors.inactive} />
              )}
            </Pressable>
            
            {showDetails && (
              <Animated.View entering={SlideInUp} style={styles.detailsContent}>
                <Text style={styles.detailsText}>{error.details}</Text>
                {error.code && (
                  <Text style={styles.errorCode}>Error Code: {error.code}</Text>
                )}
              </Animated.View>
            )}
          </View>
        )}
      </Animated.View>
      
      <Animated.View 
        entering={SlideInUp.delay(1200)} 
        style={styles.actions}
      >
        <Pressable 
          style={[styles.button, styles.primaryButton]}
          onPress={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <RefreshCw size={20} color={colors.background} />
          )}
          <Text style={styles.primaryButtonText}>
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSendLogs}
          disabled={isSendingLogs || logsSent}
        >
          {isSendingLogs ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Send size={20} color={logsSent ? colors.success : colors.primary} />
          )}
          <Text style={[
            styles.secondaryButtonText,
            logsSent && { color: colors.success }
          ]}>
            {isSendingLogs ? 'Sending...' : logsSent ? 'Logs Sent' : 'Send Error Report'}
          </Text>
        </Pressable>
        
        <Pressable 
          style={[styles.button, styles.tertiaryButton]}
          onPress={handleGoToDashboard}
        >
          <Home size={20} color={colors.inactive} />
          <Text style={styles.tertiaryButtonText}>
            Back to Dashboard
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    marginBottom: 24,
  },
  errorBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inactive,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  deviceCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: colors.inactive,
    fontFamily: 'monospace',
  },
  content: {
    marginBottom: 24,
  },
  solutionsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  solutionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  solutionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  solutionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },
  solutionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  detailsToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  detailsContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailsText: {
    fontSize: 14,
    color: colors.inactive,
    lineHeight: 20,
    marginBottom: 8,
  },
  errorCode: {
    fontSize: 12,
    color: colors.error,
    fontFamily: 'monospace',
    backgroundColor: colors.errorLight,
    padding: 8,
    borderRadius: 6,
  },
  actions: {
    gap: 12,
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
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  tertiaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.inactive,
  },
});
