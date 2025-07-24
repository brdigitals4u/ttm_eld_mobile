import { router } from 'expo-router';
import { ArrowLeft, Clock, FileText, Lock, Share2, Unlock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import LogEntry from '@/components/LogEntry';
import { useAuth } from '@/context/auth-context';
import { useStatus } from '@/context/status-context';
import { useTheme } from '@/context/theme-context';

export default function InspectorModeScreen() {
  const { colors, isDark } = useTheme();
  const { statusHistory } = useStatus();
  const { user, vehicleInfo } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [isCreatingPin, setIsCreatingPin] = useState(false);

  const handleExitInspectorMode = () => {
    if (isLocked) {
      Alert.alert(
        'Screen Locked',
        'Please unlock the screen first to exit inspector mode.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Exit Inspector Mode',
      'Are you sure you want to exit inspector mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => router.back() },
      ]
    );
  };

  const handleToggleLock = () => {
    if (isLocked) {
      // Unlock - ask for PIN
      setIsCreatingPin(false);
      setShowPinModal(true);
    } else {
      // Lock - create new PIN
      setIsCreatingPin(true);
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = () => {
    if (isCreatingPin) {
      if (pin.length >= 4) {
        setTempPin(pin);
        setIsLocked(true);
        setShowPinModal(false);
        setPin('');
        Alert.alert('Screen Locked', 'Inspector mode screen has been locked with your PIN.');
      } else {
        Alert.alert('Invalid PIN', 'PIN must be at least 4 digits.');
      }
    } else {
      if (pin === tempPin) {
        setIsLocked(false);
        setShowPinModal(false);
        setPin('');
        setTempPin('');
        Alert.alert('Screen Unlocked', 'Inspector mode screen has been unlocked.');
      } else {
        Alert.alert('Incorrect PIN', 'Please enter the correct PIN to unlock.');
        setPin('');
      }
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPin('');
    setIsCreatingPin(false);
  };

  const handleShareLogs = async () => {
    try {
      // Format logs for sharing
      const today = new Date().toLocaleDateString();
      const driverName = user?.name || 'Driver';
      const vehicleId = vehicleInfo?.vehicleNumber || 'Unknown';
      
      const logsText = statusHistory
        .map(log => {
          const date = new Date(log.timestamp).toLocaleString();
          return `${date} - ${log.status.toUpperCase()}: ${log.reason}`;
        })
        .join('\n');
      
      const shareText = `Driver Logs - ${today}\nDriver: ${driverName}\nVehicle: ${vehicleId}\n\n${logsText}`;
      
      const result = await Share.share({
        message: shareText,
        title: `Driver Logs - ${today}`,
      });
      
      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Logs shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share logs');
      console.error('Share error:', error);
    }
  };

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...statusHistory].sort((a, b) => b.timestamp - a.timestamp);

  // Get today's logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = sortedLogs.filter(log => log.timestamp >= today.getTime());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleExitInspectorMode} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Inspector Mode</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>Driver:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>License:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.licenseNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>Vehicle:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{vehicleInfo?.vehicleNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.inactive }]}>Company:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.organizationName || 'N/A'}</Text>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <Button
            title="Share Logs"
            onPress={handleShareLogs}
            icon={<Share2 size={18} color={isDark ? colors.text : '#fff'} />}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title={isLocked ? 'Unlock Screen' : 'Lock Screen'}
            onPress={handleToggleLock}
            variant={isLocked ? 'outline' : 'secondary'}
            icon={isLocked ? <Unlock size={18} color={colors.primary} /> : <Lock size={18} color={isDark ? colors.text : '#fff'} />}
          />
        </View>

        <View style={styles.logsHeader}>
          <View style={styles.logsHeaderLeft}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.logsTitle, { color: colors.text }]}>Today's Logs</Text>
          </View>
          <Text style={[styles.logsCount, { color: colors.inactive }]}>
            {todayLogs.length} entries
          </Text>
        </View>

        {todayLogs.length === 0 ? (
          <Card>
            <View style={styles.emptyLogs}>
              <FileText size={32} color={colors.inactive} />
              <Text style={[styles.emptyLogsText, { color: colors.inactive }]}>
                No logs recorded today
              </Text>
            </View>
          </Card>
        ) : (
          <FlatList
            data={todayLogs}
            renderItem={({ item }) => <LogEntry log={item} />}
            keyExtractor={(item) => item.timestamp.toString()}
            style={styles.logsList}
            contentContainerStyle={styles.logsListContent}
          />
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.inactive }]}>
            This device is in inspector mode. {isLocked ? 'Screen is locked.' : 'Screen is unlocked.'}
          </Text>
        </View>
      </View>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isCreatingPin ? 'Create PIN' : 'Enter PIN'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.inactive }]}>
              {isCreatingPin 
                ? 'Create a 4-digit PIN to lock the screen' 
                : 'Enter your PIN to unlock the screen'
              }
            </Text>
            
            <TextInput
              style={[styles.pinInput, { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter PIN"
              placeholderTextColor={colors.inactive}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={handlePinCancel}
                variant="outline"
              />
              <Button
                title={isCreatingPin ? 'Create PIN' : 'Unlock'}
                onPress={handlePinSubmit}
                disabled={pin.length < 4}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  infoCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  logsCount: {
    fontSize: 14,
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingBottom: 16,
  },
  emptyLogs: {
    alignItems: 'center',
    padding: 24,
  },
  emptyLogsText: {
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});