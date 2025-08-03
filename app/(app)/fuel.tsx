import { router } from 'expo-router';
import { Calendar, Camera, DollarSign, Fuel, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useFuel } from '@/context/fuel-context';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { FuelReceipt } from '@/types/fuel';

export default function FuelScreen() {
  const { colors, isDark } = useTheme();
  const { receipts, addFuelReceipt, deleteFuelReceipt, isLoading } = useFuel();
  const { user, vehicleInfo } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    gallons: '',
    pricePerGallon: '',
    odometer: '',
    receiptImage: '',
  });

  const handleAddReceipt = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setFormData({
      location: '',
      gallons: '',
      pricePerGallon: '',
      odometer: '',
      receiptImage: '',
    });
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Limitation', 'Camera functionality is not available on web.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({
        ...prev,
        receiptImage: result.assets[0].uri,
      }));
    }
  };

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({
        ...prev,
        receiptImage: result.assets[0].uri,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.location || !formData.gallons || !formData.pricePerGallon) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const gallons = parseFloat(formData.gallons);
    const pricePerGallon = parseFloat(formData.pricePerGallon);

    if (isNaN(gallons) || isNaN(pricePerGallon)) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for gallons and price.');
      return;
    }

    const receipt: Omit<FuelReceipt, 'id' | 'createdAt'> = {
      purchaseDate: Date.now(),
      location: formData.location,
      gallons,
      pricePerGallon,
      totalAmount: gallons * pricePerGallon,
      receiptImage: formData.receiptImage || undefined,
      odometer: formData.odometer ? parseInt(formData.odometer) : undefined,
      vehicleId: vehicleInfo?.vehicleNumber || 'unknown',
      driverId: user?.id || 'unknown',
    };

    await addFuelReceipt(receipt);
    handleCancelAdd();
  };

  const handleDeleteReceipt = (id: string) => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this fuel receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteFuelReceipt(id) },
      ]
    );
  };

  const renderReceiptItem = ({ item }: { item: FuelReceipt }) => (
    <Card style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <Text style={[styles.receiptLocation, { color: colors.text }]}>
            {item.location}
          </Text>
          <Text style={[styles.receiptDate, { color: colors.inactive }]}>
            {new Date(item.purchaseDate).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.receiptAmount, { color: colors.primary }]}>
          ${item.totalAmount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.receiptDetails}>
        <View style={styles.receiptDetailItem}>
          <Text style={[styles.receiptDetailLabel, { color: colors.inactive }]}>
            Gallons:
          </Text>
          <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
            {item.gallons.toFixed(2)}
          </Text>
        </View>
        <View style={styles.receiptDetailItem}>
          <Text style={[styles.receiptDetailLabel, { color: colors.inactive }]}>
            Price/Gal:
          </Text>
          <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
            ${item.pricePerGallon.toFixed(3)}
          </Text>
        </View>
        {item.odometer && (
          <View style={styles.receiptDetailItem}>
            <Text style={[styles.receiptDetailLabel, { color: colors.inactive }]}>
              Odometer:
            </Text>
            <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
              {item.odometer.toLocaleString()} mi
            </Text>
          </View>
        )}
      </View>

      {item.receiptImage && (
        <Image source={{ uri: item.receiptImage }} style={styles.receiptImage} />
      )}

      <Pressable
        onPress={() => handleDeleteReceipt(item.id)}
        style={[styles.deleteButton, { backgroundColor: colors.danger }]}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </Card>
  );

  if (showAddForm) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Fuel Receipt</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.card : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Gas station name or location"
              placeholderTextColor={colors.inactive}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Gallons *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.card : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.inactive}
                value={formData.gallons}
                onChangeText={(text) => setFormData(prev => ({ ...prev, gallons: text }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Price/Gallon *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.card : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                placeholder="0.000"
                placeholderTextColor={colors.inactive}
                value={formData.pricePerGallon}
                onChangeText={(text) => setFormData(prev => ({ ...prev, pricePerGallon: text }))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Odometer (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.card : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Current mileage"
              placeholderTextColor={colors.inactive}
              value={formData.odometer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, odometer: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.imageSection}>
            <Text style={[styles.label, { color: colors.text }]}>Receipt Photo (optional)</Text>
            
            {formData.receiptImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: formData.receiptImage }} style={styles.previewImage} />
                <Pressable
                  onPress={() => setFormData(prev => ({ ...prev, receiptImage: '' }))}
                  style={[styles.removeImageButton, { backgroundColor: colors.danger }]}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <Button
                  title="Take Photo"
                  onPress={handleTakePhoto}
                  variant="outline"
                  icon={<Camera size={18} color={colors.primary} />}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Select Image"
                  onPress={handleSelectImage}
                  variant="outline"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            )}
          </View>

          <View style={styles.formButtons}>
            <Button
              title="Cancel"
              onPress={handleCancelAdd}
              variant="outline"
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Save Receipt"
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
        <Text style={[styles.title, { color: colors.text }]}>Fuel Receipts</Text>
        <Button
          title="Add Receipt"
          onPress={handleAddReceipt}
          icon={<Plus size={18} color={isDark ? colors.text : '#fff'} />}
        />
      </View>

      {receipts.length === 0 ? (
        <Card style={styles.emptyContainer}>
          <Fuel size={48} color={colors.inactive} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No fuel receipts recorded
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.inactive }]}>
            Add your first fuel receipt to get started
          </Text>
        </Card>
      ) : (
        <FlatList
          data={receipts.sort((a, b) => b.purchaseDate - a.purchaseDate)}
          renderItem={renderReceiptItem}
          keyExtractor={(item) => item.id}
          style={styles.receiptsList}
          contentContainerStyle={styles.receiptsListContent}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
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
  imageSection: {
    marginBottom: 20,
  },
  imageButtons: {
    flexDirection: 'row',
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  receiptsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  receiptsListContent: {
    paddingBottom: 20,
  },
  receiptCard: {
    marginBottom: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptLocation: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  receiptDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptDetailItem: {
    alignItems: 'center',
  },
  receiptDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  receiptDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
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