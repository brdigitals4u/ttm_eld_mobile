import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { StatusUpdate } from '@/types/status';
import { hosApi } from '@/api/hos';
import { Check, Lock, Edit2 } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { toast } from '@/components/Toast';

interface LogEntryProps {
  log: StatusUpdate | {
    id?: string;
    status: string;
    timestamp?: number;
    startTime?: number;
    endTime?: number;
    reason?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    isCertified?: boolean;
    logId?: string;
    [key: string]: any; // Allow additional properties
  };
  logs?: StatusUpdate[]; // Optional logs prop for future chart integration
  onCertify?: (logId: string, signature: string) => Promise<void>;
}



function LogEntry({ log, onCertify }: LogEntryProps) {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [signature, setSignature] = useState('');
  
  const getStatusColor = () => {
    const status = log.status || (log as any).status || '';
    switch (status) {
      case 'driving':
        return '#FF9500'; // Orange for driving
      case 'onDuty':
        return '#F59E0B'; // Amber for on duty
      case 'offDuty':
        return '#3B82F6'; // Blue for off duty
      case 'sleeping':
      case 'sleeperBerth':
        return '#6366F1'; // Indigo for sleeping
      case 'personalConveyance':
        return '#10B981'; // Green for personal conveyance
      case 'yardMoves':
        return colors.warning || '#F59E0B'; // Warning color
      default:
        return colors.tint; // Use tint as primary
    }
  };
  
  const getStatusLabel = () => {
    const status = log.status || (log as any).status || '';
    switch (status) {
      case 'driving':
        return 'Driving';
      case 'onDuty':
        return 'On Duty';
      case 'offDuty':
        return 'Off Duty';
      case 'sleeping':
        return 'Sleeping';
      case 'sleeperBerth':
        return 'Sleeper Berth';
      case 'personalConveyance':
        return 'Personal Conveyance';
      case 'yardMoves':
        return 'Yard Moves';
      default:
        return status || 'Unknown';
    }
  };
  
  const formatTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp) || timestamp === 0) {
      console.warn('⚠️ LogEntry: Invalid timestamp for formatTime:', timestamp);
      return '--:--';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ LogEntry: Invalid date from timestamp:', timestamp);
      return '--:--';
    }
    const formatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return formatted;
  };
  
  // Get the timestamp value - prefer startTime over timestamp
  const getTimestamp = () => {
    const logAny = log as any;
    const timestamp = logAny.startTime || logAny.timestamp;
    console.log('🕐 LogEntry: Getting timestamp', {
      startTime: logAny.startTime,
      timestamp: logAny.timestamp,
      finalTimestamp: timestamp,
      logId: logAny.id || logAny.logId,
      status: logAny.status,
    });
    return timestamp;
  };
  
  const formatDate = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) {
      return 'Invalid Date';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleCertify = () => {
    if (log.isCertified) {
      toast.warning('This log entry has already been certified and cannot be modified.');
      return;
    }
    setShowCertifyModal(true);
  };

  const handleSubmitCertification = async () => {
    if (!signature.trim()) {
      toast.error('Please enter your signature');
      return;
    }

    if (onCertify && (log.logId || (log as any).logId || (log as any).id)) {
      try {
        await onCertify(log.logId || (log as any).logId || (log as any).id || '', signature.trim());
        setShowCertifyModal(false);
        setSignature('');
        toast.success('Log entry has been certified');
      } catch (error) {
        toast.error('Failed to certify log entry');
      }
    }
  };
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.surface : '#fff',
        borderLeftColor: getStatusColor(),
      }
    ]}>
      {/* Compact View: Status, Time, Certified badge, and Edit icon (only if not certified) */}
      <View style={styles.compactRow}>
        <View style={styles.leftSection}>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
          <Text style={[styles.time, { color: colors.textDim }]}>
            {formatTime(getTimestamp())}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {(log.isCertified || (log as any).isCertified) ? (
            <View style={styles.certifiedBadge}>
              <Lock size={14} color={colors.success || '#10B981'} />
              <Text style={[styles.certifiedText, { color: colors.success || '#10B981' }]}>
                Certified
              </Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      </View>

      {/* Certification Modal */}
      <Modal
        visible={showCertifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCertifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Certify Log Entry
            </Text>
            <Text style={[styles.modalDescription, { color: colors.textDim }]}>
              Enter your signature to certify this log entry. Once certified, it cannot be modified.
            </Text>
            <TextInput
              style={[styles.signatureInput, { 
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter your signature"
              placeholderTextColor={colors.textDim}
              value={signature}
              onChangeText={setSignature}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCertifyModal(false);
                  setSignature('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.tint }]}
                onPress={handleSubmitCertification}
              >
                <Text style={styles.submitButtonText}>Certify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    borderLeftWidth: 4,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  status: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  certifiedText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  signatureInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LogEntry;
