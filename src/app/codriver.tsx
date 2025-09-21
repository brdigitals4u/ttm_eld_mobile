import { router } from 'expo-router';
import { ArrowLeft, Mail, Plus, User, UserMinus, UserPlus, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { toast } from '@/components/Toast';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useCoDriver } from '@/contexts';
import { useAppTheme } from '@/theme/context';
import { CoDriver } from '@/types/codriver';

export default function CoDriverScreen() {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const { coDrivers, activeCoDriver, addCoDriver, removeCoDriver, setActiveCoDriver, isLoading } = useCoDriver();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    licenseNumber: '',
  });

  const handleAddCoDriver = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setFormData({
      name: '',
      email: '',
      licenseNumber: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.licenseNumber) {
      toast.warning('Please fill in all fields.');
      return;
    }

    const coDriverData: Omit<CoDriver, 'id' | 'addedAt'> = {
      ...formData,
      isActive: false,
    };

    await addCoDriver(coDriverData);
    handleCancelAdd();
  };

  const handleRemoveCoDriver = (id: string, name: string) => {
    Alert.alert(
      'Remove Co-Driver',
      `Are you sure you want to remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => removeCoDriver(id as any), style: 'destructive' }
      ]
    );
  };

  const handleSetActive = (id: string) => {
    const isCurrentlyActive = activeCoDriver?.id === id;
    setActiveCoDriver(isCurrentlyActive ? null : id);
  };

  const renderCoDriverItem = ({ item }: { item: CoDriver }) => (
    <ElevatedCard style={styles.coDriverCard}>
      <View style={styles.coDriverHeader}>
        <View style={styles.coDriverInfo}>
          <View style={[
            styles.avatarContainer,
            { 
              backgroundColor: isDark ? colors.surface : '#F3F4F6',
              borderColor: colors.tint,
            }
          ]}>
            <User size={24} color={colors.tint} />
          </View>
          <View style={styles.coDriverDetails}>
            <Text style={[styles.coDriverName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.coDriverEmail, { color: colors.textDim }]}>
              {item.email}
            </Text>
            <Text style={[styles.coDriverLicense, { color: colors.textDim }]}>
              License: {item.licenseNumber}
            </Text>
          </View>
        </View>
        
        {activeCoDriver?.id === item.id && (
          <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.coDriverActions}>
        <LoadingButton
          title={activeCoDriver?.id === item.id ? "Deactivate" : "Set Active"}
          onPress={() => handleSetActive(item.id)}
          variant={activeCoDriver?.id === item.id ? "outline" : "primary"}
          icon={activeCoDriver?.id === item.id ? 
            <UserMinus size={16} color={colors.tint} /> : 
            <UserPlus size={16} color={isDark ? colors.text : '#fff'} />
          }
          style={{ flex: 1, marginRight: 8 }}
        />
        <LoadingButton
          title="Remove"
          onPress={() => handleRemoveCoDriver(item.id, item.name)}
          variant="danger"
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>
    </ElevatedCard>
  );

  if (showAddForm) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={handleCancelAdd} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Add Co-Driver</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter co-driver's full name"
              placeholderTextColor={colors.textDim}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter email address"
              placeholderTextColor={colors.textDim}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>License Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter driver's license number"
              placeholderTextColor={colors.textDim}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, licenseNumber: text }))}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formButtons}>
            <LoadingButton
              title="Cancel"
              onPress={handleCancelAdd}
              variant="outline"
              style={{ flex: 1, marginRight: 8 }}
            />
            <LoadingButton
              title="Add Co-Driver"
              onPress={handleSubmit}
              loading={isLoading}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Co-Drivers</Text>
        <LoadingButton
          title="Add"
          onPress={handleAddCoDriver}
          icon={<Plus size={16} color={isDark ? colors.text : '#fff'} />}
        />
      </View>

      {activeCoDriver && (
        <ElevatedCard style={[styles.activeDriverCard, { backgroundColor: colors.success }]}>
          <View style={styles.activeDriverContent}>
            <UserPlus size={24} color="#fff" />
            <View style={styles.activeDriverText}>
              <Text style={styles.activeDriverTitle}>Active Co-Driver</Text>
              <Text style={styles.activeDriverName}>{activeCoDriver.name}</Text>
            </View>
          </View>
        </ElevatedCard>
      )}

      {coDrivers.length === 0 ? (
        <ElevatedCard style={styles.emptyContainer}>
          <Users size={48} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No co-drivers added
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
            Add co-drivers to manage team driving
          </Text>
        </ElevatedCard>
      ) : (
        <FlatList
          data={coDrivers}
          renderItem={renderCoDriverItem}
          keyExtractor={(item) => item.id}
          style={styles.coDriversList}
          contentContainerStyle={styles.coDriversListContent}
        />
      )}
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
    width: 60,
  },
  activeDriverCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  activeDriverContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDriverText: {
    marginLeft: 12,
    flex: 1,
  },
  activeDriverTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  activeDriverName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  coDriversList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  coDriversListContent: {
    paddingBottom: 20,
  },
  coDriverCard: {
    marginBottom: 16,
  },
  coDriverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  coDriverInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
  },
  coDriverDetails: {
    flex: 1,
  },
  coDriverName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  coDriverEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  coDriverLicense: {
    fontSize: 12,
  },
  activeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  coDriverActions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    margin: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});