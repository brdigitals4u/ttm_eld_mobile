import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ArrowLeft, MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useStatus } from '@/context/status-context';
import { useTheme } from '@/context/theme-context';
import { DriverStatus, StatusReason } from '@/types/status';

export default function StatusUpdateScreen() {
  const params = useLocalSearchParams<any>();
  const status = params?.status as DriverStatus;
  const { colors, isDark } = useTheme();
  const { updateStatus, getStatusReasons, isUpdating, getCurrentLocation, currentLocation } = useStatus();
  const [selectedReason, setSelectedReason] = useState<StatusReason | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (!status) {
    router.back();
    return null;
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'driving':
        return 'Driving';
      case 'onDuty':
        return 'On Duty';
      case 'offDuty':
        return 'Off Duty';
      case 'sleeperBerth':
        return 'Sleeper Berth';
      case 'personalConveyance':
        return 'Personal Conveyance';
      case 'yardMoves':
        return 'Yard Moves';
      default:
        return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'driving':
        return colors.driving;
      case 'onDuty':
        return colors.onDuty;
      case 'offDuty':
        return colors.offDuty;
      case 'sleeperBerth':
        return colors.sleeping;
      case 'personalConveyance':
        return colors.primary;
      case 'yardMoves':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const handleReasonSelect = (reason: StatusReason) => {
    setSelectedReason(reason);
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    await updateStatus(status, selectedReason.text);
    router.back();
  };

  const renderReasonItem = ({ item }: { item: StatusReason }) => (
    <Pressable
      onPress={() => handleReasonSelect(item)}
      style={({ pressed }) => [
        styles.reasonItem,
        {
          backgroundColor: selectedReason?.id === item.id
            ? getStatusColor()
            : isDark ? colors.card : '#F3F4F6',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.reasonText,
          {
            color: selectedReason?.id === item.id
              ? isDark ? '#000' : '#fff'
              : colors.text,
          },
        ]}
      >
        {item.text}
      </Text>
    </Pressable>
  );

  const statusReasons = getStatusReasons(status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Update Status</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.statusCard}>
          <Text style={[styles.statusLabel, { color: colors.inactive }]}>
            Changing status to:
          </Text>
          <Text style={[styles.statusValue, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
          
          {currentLocation && (
            <View style={styles.locationContainer}>
              <MapPin size={16} color={colors.inactive} />
              <Text style={[styles.locationText, { color: colors.inactive }]}>
                {currentLocation.address || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
              </Text>
            </View>
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Select a reason for this status change:
        </Text>

        <FlatList
          data={statusReasons}
          renderItem={renderReasonItem}
          keyExtractor={(item) => item.id}
          style={styles.reasonsList}
          contentContainerStyle={styles.reasonsListContent}
        />

        {status === 'driving' && (
          <Card style={[styles.warningCard, { backgroundColor: colors.warning }]}>
            <View style={styles.warningContent}>
              <AlertTriangle size={24} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.warningText, { color: isDark ? '#000' : '#fff' }]}>
                Changing to Driving status will start your driving time clock. Make sure you are ready to drive.
              </Text>
            </View>
          </Card>
        )}

        <Button
          title="Submit Status Change"
          onPress={handleSubmit}
          disabled={!selectedReason}
          loading={isUpdating}
          fullWidth
        />
      </View>
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
  statusCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  reasonsList: {
    flex: 1,
  },
  reasonsListContent: {
    paddingBottom: 16,
  },
  reasonItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  warningCard: {
    marginVertical: 16,
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
});