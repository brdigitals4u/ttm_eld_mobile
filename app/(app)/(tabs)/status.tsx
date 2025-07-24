import { router } from 'expo-router';
import { AlertTriangle, Bed, Briefcase, Coffee, Lock, MoreHorizontal, Settings, Truck, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, Modal, TouchableOpacity, Alert } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import StatusButton from '@/components/StatusButton';
import { useStatus } from '@/context/status-context';
import { useTheme } from '@/context/theme-context';
import { DriverStatus } from '@/types/status';

export default function StatusScreen() {
  const { colors, isDark } = useTheme();
  const { 
    currentStatus, 
    hoursOfService, 
    formatDuration, 
    certification, 
    canUpdateStatus,
    splitSleepSettings,
    toggleSplitSleep 
  } = useStatus();
  const [showDoneForDayModal, setShowDoneForDayModal] = useState(false);

  const handleStatusChange = (status: DriverStatus) => {
    if (!canUpdateStatus()) {
      return;
    }
    
    // Show "Done for the day?" modal when selecting Off Duty
    if (status === 'offDuty') {
      setShowDoneForDayModal(true);
      return;
    }
    
    router.push({ pathname: '/status-update', params: { status } });
  };

  const handleGoOffDuty = () => {
    setShowDoneForDayModal(false);
    router.push({ pathname: '/status-update', params: { status: 'offDuty' } });
  };

  const handleGoOffDutyAndSignOut = () => {
    setShowDoneForDayModal(false);
    // In a real app, this would sign out the user after going off duty
    Alert.alert(
      'Sign Out',
      'You will be signed out after going off duty.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            router.push({ pathname: '/status-update', params: { status: 'offDuty', signOut: 'true' } });
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Update Your Status
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.inactive }]}>
        Select your current duty status
      </Text>

      {certification.isCertified && (
        <Card style={[styles.certificationWarning, { backgroundColor: colors.warning }]}>
          <View style={styles.warningContent}>
            <Lock size={24} color={isDark ? '#000' : '#fff'} />
            <Text style={[styles.warningText, { color: isDark ? '#000' : '#fff' }]}>
              Logs are certified. Status updates are disabled until logs are uncertified.
            </Text>
          </View>
        </Card>
      )}

      <View style={[styles.statusButtons, { opacity: canUpdateStatus() ? 1 : 0.5 }]}>
        <StatusButton
          status="driving"
          label="Driving"
          isActive={currentStatus === 'driving'}
          onPress={() => handleStatusChange('driving')}
          icon={<Truck size={20} color={currentStatus === 'driving' ? (isDark ? '#000' : '#fff') : colors.driving} />}
        />
        
        <StatusButton
          status="onDuty"
          label="On Duty (Not Driving)"
          isActive={currentStatus === 'onDuty'}
          onPress={() => handleStatusChange('onDuty')}
          icon={<Briefcase size={20} color={currentStatus === 'onDuty' ? (isDark ? '#000' : '#fff') : colors.onDuty} />}
        />
        
        <StatusButton
          status="offDuty"
          label="Off Duty"
          isActive={currentStatus === 'offDuty'}
          onPress={() => handleStatusChange('offDuty')}
          icon={<Coffee size={20} color={currentStatus === 'offDuty' ? (isDark ? '#000' : '#fff') : colors.offDuty} />}
        />
        
        <StatusButton
          status="sleeperBerth"
          label="Sleeper Berth"
          isActive={currentStatus === 'sleeperBerth'}
          onPress={() => handleStatusChange('sleeperBerth')}
          icon={<Bed size={20} color={currentStatus === 'sleeperBerth' ? (isDark ? '#000' : '#fff') : colors.sleeping} />}
        />
        
        <StatusButton
          status="personalConveyance"
          label="Personal Conveyance"
          isActive={currentStatus === 'personalConveyance'}
          onPress={() => handleStatusChange('personalConveyance')}
          icon={<User size={20} color={currentStatus === 'personalConveyance' ? (isDark ? '#000' : '#fff') : colors.primary} />}
        />
        
        <StatusButton
          status="yardMoves"
          label="Yard Moves"
          isActive={currentStatus === 'yardMoves'}
          onPress={() => handleStatusChange('yardMoves')}
          icon={<MoreHorizontal size={20} color={currentStatus === 'yardMoves' ? (isDark ? '#000' : '#fff') : colors.warning} />}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Split Sleep Settings
      </Text>

      <Card>
        <View style={styles.splitSleepRow}>
          <View style={styles.splitSleepInfo}>
            <Text style={[styles.splitSleepLabel, { color: colors.text }]}>
              Split Sleep Toggle
            </Text>
            <Text style={[styles.splitSleepDescription, { color: colors.inactive }]}>
              Adds {splitSleepSettings.additionalHours} hours to driving time
            </Text>
          </View>
          <Switch
            value={splitSleepSettings.enabled}
            onValueChange={(enabled) => toggleSplitSleep(enabled, splitSleepSettings.additionalHours)}
            trackColor={{ false: colors.inactive, true: colors.primary }}
            thumbColor={splitSleepSettings.enabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Hours of Service Summary
      </Text>

      <Card>
        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.inactive }]}>
            Drive Time Remaining:
          </Text>
          <Text 
            style={[
              styles.hosValue, 
              { 
                color: hoursOfService.driveTimeRemaining < 60 
                  ? colors.danger 
                  : colors.text 
              }
            ]}
          >
            {formatDuration(hoursOfService.driveTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.inactive }]}>
            Shift Time Remaining:
          </Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hoursOfService.shiftTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.inactive }]}>
            Cycle Time Remaining:
          </Text>
          <Text style={[styles.hosValue, { color: colors.text }]}>
            {formatDuration(hoursOfService.cycleTimeRemaining)}
          </Text>
        </View>

        <View style={styles.hosRow}>
          <Text style={[styles.hosLabel, { color: colors.inactive }]}>
            Break Required In:
          </Text>
          <Text 
            style={[
              styles.hosValue, 
              { 
                color: hoursOfService.breakTimeRemaining < 30 
                  ? colors.danger 
                  : colors.text 
              }
            ]}
          >
            {formatDuration(hoursOfService.breakTimeRemaining)}
          </Text>
        </View>
      </Card>

      {hoursOfService.driveTimeRemaining < 60 && (
        <Card style={[styles.warningCard, { backgroundColor: colors.danger }]}>
          <View style={styles.warningContent}>
            <AlertTriangle size={24} color={isDark ? '#000' : '#fff'} />
            <Text style={[styles.warningText, { color: isDark ? '#000' : '#fff' }]}>
              You have less than {formatDuration(hoursOfService.driveTimeRemaining)} of driving time remaining. Plan to take a break soon.
            </Text>
          </View>
        </Card>
      )}

      <Text style={[styles.infoText, { color: colors.inactive }]}>
        {canUpdateStatus() 
          ? 'Remember to update your status whenever your duty status changes to maintain accurate records.'
          : 'Status updates are disabled because logs have been certified.'
        }
      </Text>

      {/* Done for the day modal */}
      <Modal
        visible={showDoneForDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoneForDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Done for the day?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={handleGoOffDutyAndSignOut}
              >
                <Text style={styles.primaryModalButtonText}>
                  Go Off Duty & Sign Out
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={handleGoOffDuty}
              >
                <Text style={[styles.secondaryModalButtonText, { color: colors.primary }]}>
                  Go Off Duty
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={() => setShowDoneForDayModal(false)}
              >
                <Text style={[styles.secondaryModalButtonText, { color: colors.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  certificationWarning: {
    marginBottom: 24,
  },
  statusButtons: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  hosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hosLabel: {
    fontSize: 16,
  },
  hosValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  warningCard: {
    marginTop: 16,
    marginBottom: 24,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 12,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  splitSleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitSleepInfo: {
    flex: 1,
  },
  splitSleepLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  splitSleepDescription: {
    fontSize: 14,
    marginTop: 2,
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
    maxWidth: 320,
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
  primaryModalButton: {
    backgroundColor: '#6B7280',
  },
  primaryModalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  secondaryModalButton: {
    backgroundColor: 'transparent',
  },
  secondaryModalButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
});