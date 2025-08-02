import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { BLEDevice } from '@/src/utils/TTMBLEManager';
// SafeView component not available, using regular Text
import Button from '@/components/Button';

interface PasscodeModalProps {
  isVisible: boolean;
  selectedDevice: BLEDevice | null;
  onClose: () => void;
  onSubmit: (passcode: string) => void;
  isSubmitting: boolean;
  colors: {
    text: string;
    inactive: string;
    primary: string;
    background: string;
    card: string;
    border: string;
  };
}

export default function PasscodeModal({
  isVisible,
  selectedDevice,
  onClose,
  onSubmit,
  isSubmitting,
  colors
}: PasscodeModalProps) {
  const [passcode, setPasscode] = useState('');

  const handleSubmit = () => {
    if (passcode.length < 8) {
      Alert.alert('Invalid Passcode', 'Please enter an 8-digit passcode.');
      return;
    }
    onSubmit(passcode);
  };

  const handleClose = () => {
    setPasscode('');
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Enter Device Passcode
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.inactive }]}>
            Please enter the 8-digit passcode for your ELD device
          </Text>
        </View>

        {selectedDevice && (
          <View style={[styles.deviceInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {selectedDevice.name || "Unnamed Device"}
            </Text>
            <Text style={[styles.deviceId, { color: colors.inactive }]}>
              ID: {selectedDevice.address || selectedDevice.id}
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            Passcode
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: colors.card, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Enter 8-digit passcode"
            placeholderTextColor={colors.inactive}
            keyboardType="numeric"
            maxLength={8}
            secureTextEntry
            autoFocus
          />
          <Text style={[styles.inputHint, { color: colors.inactive }]}>
            Enter the 8-digit passcode found on your ELD device
          </Text>
        </View>

        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="secondary"
            style={styles.cancelButton}
          />
          <Button
            title={isSubmitting ? "Connecting..." : "Connect"}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || passcode.length < 8}
            variant="primary"
            style={styles.submitButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  deviceInfo: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
}); 