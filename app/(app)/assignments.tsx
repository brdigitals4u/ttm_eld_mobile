import { router, Stack } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useTheme } from '@/context/theme-context';
import { useVehicles, useTrailers, useShippingIDs } from '@/hooks/api';

export default function AssignmentsScreen() {
  const { colors, isDark } = useTheme();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { trailers, loading: trailersLoading, addTrailer, removeTrailer } = useTrailers();
  const { shippingIDs, loading: shippingLoading, addShippingID, removeShippingID } = useShippingIDs();
  
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [newTrailerNumber, setNewTrailerNumber] = useState('');
  const [newShippingNumber, setNewShippingNumber] = useState('');
  const [newShippingDescription, setNewShippingDescription] = useState('');

  const handleAddTrailer = async () => {
    if (!newTrailerNumber.trim()) {
      Alert.alert('Error', 'Please enter a trailer number');
      return;
    }

    try {
      await addTrailer({
        number: newTrailerNumber.trim(),
        type: 'Dry Van'
      });
      setNewTrailerNumber('');
      setShowTrailerModal(false);
      Alert.alert('Success', 'Trailer added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add trailer');
    }
  };

  const handleAddShippingID = async () => {
    if (!newShippingNumber.trim()) {
      Alert.alert('Error', 'Please enter a shipping ID number');
      return;
    }

    try {
      await addShippingID({
        number: newShippingNumber.trim(),
        description: newShippingDescription.trim() || 'No description'
      });
      setNewShippingNumber('');
      setNewShippingDescription('');
      setShowShippingModal(false);
      Alert.alert('Success', 'Shipping ID added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add shipping ID');
    }
  };

  const handleRemoveTrailer = async (id: string) => {
    Alert.alert(
      'Remove Trailer',
      'Are you sure you want to remove this trailer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrailer(id);
              Alert.alert('Success', 'Trailer removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove trailer');
            }
          }
        }
      ]
    );
  };

  const handleRemoveShippingID = async (id: string) => {
    Alert.alert(
      'Remove Shipping ID',
      'Are you sure you want to remove this shipping ID?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeShippingID(id);
              Alert.alert('Success', 'Shipping ID removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove shipping ID');
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Assignments',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Sign Out</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Vehicle Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle</Text>
          
          {vehiclesLoading ? (
            <Text style={[styles.loadingText, { color: colors.inactive }]}>Loading vehicles...</Text>
          ) : (
            <TouchableOpacity 
              style={[styles.selectButton, { borderColor: colors.primary }]}
              onPress={() => {
                // In a real app, this would open a vehicle selection modal
                Alert.alert('Select Vehicle', 'Vehicle selection functionality would be implemented here');
              }}
            >
              <Text style={[styles.selectButtonText, { color: colors.primary }]}>
                {selectedVehicle ? `Vehicle ${selectedVehicle}` : 'Select Vehicle'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trailers Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trailers</Text>
          
          {trailers.map((trailer) => (
            <Card key={trailer.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemNumber, { color: colors.text }]}>
                    Trailer {trailer.number}
                  </Text>
                  <Text style={[styles.itemType, { color: colors.inactive }]}>
                    {trailer.type}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveTrailer(trailer.id)}
                  style={styles.removeButton}
                >
                  <X size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          
          <TouchableOpacity 
            style={[styles.addButton, { borderColor: colors.primary }]}
            onPress={() => setShowTrailerModal(true)}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              Add a Trailer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shipping IDs Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping IDs</Text>
          
          {shippingIDs.map((shipping) => (
            <Card key={shipping.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemNumber, { color: colors.text }]}>
                    {shipping.number}
                  </Text>
                  <Text style={[styles.itemType, { color: colors.inactive }]}>
                    {shipping.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveShippingID(shipping.id)}
                  style={styles.removeButton}
                >
                  <X size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          
          <TouchableOpacity 
            style={[styles.addButton, { borderColor: colors.primary }]}
            onPress={() => setShowShippingModal(true)}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>
              Add a Shipping ID
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Done"
          onPress={() => router.back()}
          fullWidth
          style={styles.doneButton}
        />
      </ScrollView>

      {/* Add Trailer Modal */}
      <Modal
        visible={showTrailerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrailerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Trailer</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Trailer Number"
              placeholderTextColor={colors.inactive}
              value={newTrailerNumber}
              onChangeText={setNewTrailerNumber}
              autoCapitalize="characters"
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowTrailerModal(false);
                  setNewTrailerNumber('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Add"
                onPress={handleAddTrailer}
                loading={trailersLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Shipping ID Modal */}
      <Modal
        visible={showShippingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShippingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Shipping ID</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Shipping ID Number"
              placeholderTextColor={colors.inactive}
              value={newShippingNumber}
              onChangeText={setNewShippingNumber}
              autoCapitalize="characters"
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.inactive}
              value={newShippingDescription}
              onChangeText={setNewShippingDescription}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowShippingModal(false);
                  setNewShippingNumber('');
                  setNewShippingDescription('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Add"
                onPress={handleAddShippingID}
                loading={shippingLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 8,
  },
  doneButton: {
    marginTop: 24,
    marginBottom: 40,
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});