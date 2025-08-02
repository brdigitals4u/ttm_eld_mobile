import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Button from '@/components/Button';

interface ScanControlsProps {
  isScanning: boolean;
  scanTimeRemaining: number;
  scanAttempt: number;
  scanProgress: number;
  isConnecting: boolean;
  onStartScan: () => void;
  colors: {
    primary: string;
    inactive: string;
  };
}

export default function ScanControls({
  isScanning,
  scanTimeRemaining,
  scanAttempt,
  scanProgress,
  isConnecting,
  onStartScan,
  colors
}: ScanControlsProps) {
  return (
    <View style={styles.scanSection}>
      <Button
        title={isScanning 
          ? `Scanning... (${Math.floor(scanTimeRemaining / 60)}:${(scanTimeRemaining % 60).toString().padStart(2, '0')})` 
          : "Scan for Devices (2 min)"
        }
        onPress={onStartScan}
        loading={isScanning}
        disabled={isConnecting}
        fullWidth
      />
      
      {isScanning && (
        <View style={styles.scanningContainer}>
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.scanningText, { color: colors.inactive }]}>
              Searching for ELD devices... (Attempt #{scanAttempt})
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${scanProgress}%`, backgroundColor: colors.primary }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.inactive }]}>
              {Math.floor(scanTimeRemaining / 60)}:{(scanTimeRemaining % 60).toString().padStart(2, '0')} remaining
            </Text>
          </View>
          
          {/* Scanning Tips */}
          <View style={styles.tipsContainer}>
            <Text style={[styles.tipsTitle, { color: colors.inactive }]}>
              💡 Tips for better scanning:
            </Text>
            <Text style={[styles.tipsText, { color: colors.inactive }]}>
              • Ensure your ELD device is powered on
            </Text>
            <Text style={[styles.tipsText, { color: colors.inactive }]}>
              • Keep the device within 10 feet of your phone
            </Text>
            <Text style={[styles.tipsText, { color: colors.inactive }]}>
              • Make sure Bluetooth is enabled on your phone
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scanSection: {
    marginBottom: 20,
  },
  scanningContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanningText: {
    fontSize: 14,
    flex: 1,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  tipsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    marginBottom: 4,
  },
}); 