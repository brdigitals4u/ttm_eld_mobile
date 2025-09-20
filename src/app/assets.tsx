import { router } from 'expo-router';
import { ArrowLeft, FileText, Plus, Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { toast } from '@/components/Toast';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useAssets } from '@/contexts';
import { useAppTheme } from '@/theme/context';
import { Asset } from '@/types/assets';

export default function AssetsScreen() {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const { assets, addAsset, deleteAsset, isLoading } = useAssets();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'truck' as 'truck' | 'trailer',
    number: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    licensePlate: '',
  });

  const handleAddAsset = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setFormData({
      type: 'truck',
      number: '',
      make: '',
      model: '',
      year: '',
      vin: '',
      licensePlate: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.number) {
      toast.warning('Please enter the asset number.');
      return;
    }

    const assetData: Omit<Asset, 'id' | 'documents'> = {
      ...formData,
      make: formData.make || undefined,
      model: formData.model || undefined,
      year: formData.year || undefined,
      vin: formData.vin || undefined,
      licensePlate: formData.licensePlate || undefined,
      isActive: true,
    };

    await addAsset(assetData);
    handleCancelAdd();
  };

  const handleDeleteAsset = (id: string, number: string) => {
    // Simple confirmation for now - in a real app you'd use a proper modal
    const confirmed = confirm(`Are you sure you want to delete ${number}?`);
    if (confirmed) {
      deleteAsset(id);
      toast.success('Asset deleted successfully');
    }
  };

  const renderAssetItem = ({ item }: { item: Asset }) => (
    <ElevatedCard style={styles.assetCard}>
      <View style={styles.assetHeader}>
        <View style={styles.assetInfo}>
          <View style={styles.assetIcon}>
            <Truck size={24} color={colors.tint} />
          </View>
          <View style={styles.assetDetails}>
            <Text style={[styles.assetNumber, { color: colors.text }]}>
              {item.number}
            </Text>
            <Text style={[styles.assetType, { color: colors.textDim }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            {item.make && item.model && (
              <Text style={[styles.assetMakeModel, { color: colors.textDim }]}>
                {item.make} {item.model} {item.year}
              </Text>
            )}
          </View>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.isActive ? colors.success : colors.textDim }
        ]}>
          <Text style={styles.statusBadgeText}>
            {item.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {(item.vin || item.licensePlate) && (
        <View style={styles.assetMeta}>
          {item.vin && (
            <Text style={[styles.assetMetaText, { color: colors.textDim }]}>
              VIN: {item.vin}
            </Text>
          )}
          {item.licensePlate && (
            <Text style={[styles.assetMetaText, { color: colors.textDim }]}>
              License: {item.licensePlate}
            </Text>
          )}
        </View>
      )}

      <View style={styles.assetActions}>
        <View style={styles.documentsInfo}>
          <FileText size={16} color={colors.textDim} />
          <Text style={[styles.documentsCount, { color: colors.textDim }]}>
            {item.documents.length} documents
          </Text>
        </View>
        
        <LoadingButton
          title="Delete"
          onPress={() => handleDeleteAsset(item.id, item.number)}
          variant="danger"
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
          <Text style={[styles.title, { color: colors.text }]}>Add Asset</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Asset Type</Text>
            <View style={styles.typeSelector}>
              {[
                { key: 'truck', label: 'Truck' },
                { key: 'trailer', label: 'Trailer' },
              ].map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.key as any }))}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: formData.type === type.key ? colors.tint : 'transparent',
                      borderColor: colors.tint,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      {
                        color: formData.type === type.key ? '#fff' : colors.tint,
                      },
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Asset Number *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter asset number"
              placeholderTextColor={colors.textDim}
              value={formData.number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, number: text }))}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Make</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                placeholder="Make"
                placeholderTextColor={colors.textDim}
                value={formData.make}
                onChangeText={(text) => setFormData(prev => ({ ...prev, make: text }))}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Model</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                placeholder="Model"
                placeholderTextColor={colors.textDim}
                value={formData.model}
                onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Year</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Year"
              placeholderTextColor={colors.textDim}
              value={formData.year}
              onChangeText={(text) => setFormData(prev => ({ ...prev, year: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>VIN</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Vehicle Identification Number"
              placeholderTextColor={colors.textDim}
              value={formData.vin}
              onChangeText={(text) => setFormData(prev => ({ ...prev, vin: text }))}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>License Plate</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="License plate number"
              placeholderTextColor={colors.textDim}
              value={formData.licensePlate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, licensePlate: text }))}
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
              title="Add Asset"
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
        <Text style={[styles.title, { color: colors.text }]}>My Assets</Text>
        <LoadingButton
          title="Add"
          onPress={handleAddAsset}
          icon={<Plus size={16} color={isDark ? colors.text : '#fff'} />}
        />
      </View>

      {assets.length === 0 ? (
        <ElevatedCard style={styles.emptyContainer}>
          <Truck size={48} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No assets added
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
            Add trucks and trailers to manage your fleet
          </Text>
        </ElevatedCard>
      ) : (
        <FlatList
          data={assets}
          renderItem={renderAssetItem}
          keyExtractor={(item) => item.id}
          style={styles.assetsList}
          contentContainerStyle={styles.assetsListContent}
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  assetsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  assetsListContent: {
    paddingBottom: 20,
  },
  assetCard: {
    marginBottom: 16,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assetInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  assetIcon: {
    marginRight: 12,
  },
  assetDetails: {
    flex: 1,
  },
  assetNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  assetType: {
    fontSize: 14,
    marginBottom: 2,
  },
  assetMakeModel: {
    fontSize: 14,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  assetMeta: {
    marginBottom: 12,
  },
  assetMetaText: {
    fontSize: 12,
    marginBottom: 2,
  },
  assetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentsCount: {
    fontSize: 14,
    marginLeft: 6,
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