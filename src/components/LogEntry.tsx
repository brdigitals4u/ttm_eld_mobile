import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useAppTheme } from '@/theme/context';
import { StatusUpdate } from '@/types/status';
import { hosApi } from '@/api/hos';
import { Check, Lock } from 'lucide-react-native';
import { Text } from '@/components/Text';

interface LogEntryProps {
  log: StatusUpdate;
  logs?: StatusUpdate[]; // Optional logs prop for future chart integration
  onCertify?: (logId: string, signature: string) => Promise<void>;
}

function LogEntry({ log, onCertify }: LogEntryProps) {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [signature, setSignature] = useState('');
  
  const getStatusColor = () => {
    switch (log.status) {
      case 'driving':
        return '#FF9500'; // Orange for driving
      case 'onDuty':
        return '#F59E0B'; // Amber for on duty
      case 'offDuty':
        return '#3B82F6'; // Blue for off duty
      case 'sleeping':
        return '#6366F1'; // Indigo for sleeping
      case 'yardMoves':
        return colors.warning || '#F59E0B'; // Warning color
      default:
        return colors.tint; // Use tint as primary
    }
  };
  
  const getStatusLabel = () => {
    switch (log.status) {
      case 'driving':
        return 'Driving';
      case 'onDuty':
        return 'On Duty';
      case 'offDuty':
        return 'Off Duty';
      case 'sleeping':
        return 'Sleeping';
      case 'yardMoves':
        return 'Yard Moves';
      default:
        return log.status;
    }
  };
  
  const formatTime = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) {
      return '--:--';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      Alert.alert(
        'Already Certified',
        'This log entry has already been certified and cannot be modified.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowCertifyModal(true);
  };

  const handleSubmitCertification = async () => {
    if (!signature.trim()) {
      Alert.alert('Error', 'Please enter your signature');
      return;
    }

    if (onCertify && log.logId) {
      try {
        await onCertify(log.logId, signature.trim());
        setShowCertifyModal(false);
        setSignature('');
        Alert.alert('Success', 'Log entry has been certified');
      } catch (error) {
        Alert.alert('Error', 'Failed to certify log entry');
      }
    }
  };
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? colors.surface : '#fff',
        borderLeftColor: getStatusColor(),
        shadowColor: isDark ? '#FFFFFF' : '#000000',
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>
        <Text style={[styles.time, { color: colors.text }]}>
          {formatTime(log.timestamp)}
        </Text>
      </View>
      
      <Text style={[styles.date, { color: colors.textDim }]}>
        {formatDate(log.timestamp)}
      </Text>
      
      <Text style={[styles.reason, { color: colors.text }]}>
        {log.reason}
      </Text>
      
      {log.location && (
        <Text style={[styles.location, { color: colors.textDim }]}>
          {log.location.address || `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`}
        </Text>
      )}

      {/* Certification Section */}
      <View style={styles.certificationSection}>
        {log.isCertified ? (
          <View style={styles.certifiedBadge}>
            <Lock size={16} color={colors.success || '#10B981'} />
            <Text style={[styles.certifiedText, { color: colors.success || '#10B981' }]}>
              Certified
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.certifyButton, { backgroundColor: colors.tint }]}
            onPress={handleCertify}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.certifyButtonText}>Certify</Text>
          </TouchableOpacity>
        )}
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
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  time: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  date: {
    fontSize: 12,
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  certificationSection: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  certifiedText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  certifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  certifyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
