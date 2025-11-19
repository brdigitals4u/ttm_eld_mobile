import { router } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { toast } from '@/components/Toast';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useInspection } from '@/contexts';
import { useAppTheme } from '@/theme/context';
import { InspectionItem } from '@/types/inspection';
import { Text } from '@/components/Text';
import { translate } from '@/i18n/translate';

export default function InspectionScreen() {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const { currentInspection, startInspection, updateInspectionItem, completeInspection, isLoading } = useInspection();
  const [selectedType, setSelectedType] = useState<'pre-trip' | 'post-trip' | 'dot'>('pre-trip');
  const [signature, setSignature] = useState('');
  const [showSignature, setShowSignature] = useState(false);

  const handleStartInspection = async () => {
    await startInspection(selectedType);
  };

  const handleItemUpdate = async (item: InspectionItem, status: 'pass' | 'fail' | 'na') => {
    try {
      await updateInspectionItem(item.id, status);
      toast.success(`Item marked as ${status.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleCompleteInspection = () => {
    if (!currentInspection) return;

    const pendingRequired = currentInspection.items.filter(
      item => item.isRequired && item.status === 'pending'
    );

    if (pendingRequired.length > 0) {
      toast.warning(`Please complete all required items (${pendingRequired.length} remaining).`);
      return;
    }

    setShowSignature(true);
  };

  const handleSubmitSignature = async () => {
    if (!signature.trim()) {
      toast.warning('Please enter your signature to complete the inspection.');
      return;
    }

    await completeInspection(signature.trim());
    setSignature('');
    setShowSignature(false);
    router.back();
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'na' | 'pending') => {
    switch (status) {
      case 'pass':
        return colors.success || '#10B981';
      case 'fail':
        return colors.error || '#EF4444';
      case 'na':
        return colors.textDim;
      default:
        return colors.warning || '#F59E0B';
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'na' | 'pending') => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={20} color={colors.success || '#10B981'} />;
      case 'fail':
        return <XCircle size={20} color={colors.error || '#EF4444'} />;
      case 'na':
        return <Text style={{ color: colors.textDim, fontSize: 16, fontWeight: '600' as const }}>N/A</Text>;
      default:
        return <Clock size={20} color={colors.warning || '#F59E0B'} />;
    }
  };

  const renderInspectionItem = ({ item }: { item: InspectionItem }) => (
    <ElevatedCard style={styles.inspectionItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemCategory, { color: colors.textDim }]}>
            {item.category}
          </Text>
          <Text style={[styles.itemName, { color: colors.text }]}>
            {item.item}
            {item.isRequired && <Text style={{ color: colors.error || '#EF4444' }}> *</Text>}
          </Text>
          {item.notes && (
            <Text style={[styles.itemNotes, { color: colors.textDim }]}>
              Notes: {item.notes}
            </Text>
          )}
        </View>
        <View style={styles.itemStatus}>
          {getStatusIcon(item.status)}
        </View>
      </View>

      <View style={styles.itemActions}>
        <Pressable
          onPress={() => handleItemUpdate(item, 'pass')}
          style={[
            styles.statusButton,
            {
              backgroundColor: item.status === 'pass' ? (colors.success || '#10B981') : 'transparent',
              borderColor: colors.success || '#10B981',
            },
          ]}
        >
          <Text
            style={[
              styles.statusButtonText,
              {
                color: item.status === 'pass' ? '#fff' : (colors.success || '#10B981'),
              },
            ]}
          >
            Pass
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleItemUpdate(item, 'fail')}
          style={[
            styles.statusButton,
            {
              backgroundColor: item.status === 'fail' ? (colors.error || '#EF4444') : 'transparent',
              borderColor: colors.error || '#EF4444',
            },
          ]}
        >
          <Text
            style={[
              styles.statusButtonText,
              {
                color: item.status === 'fail' ? '#fff' : (colors.error || '#EF4444'),
              },
            ]}
          >
            Fail
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleItemUpdate(item, 'na')}
          style={[
            styles.statusButton,
            {
              backgroundColor: item.status === 'na' ? colors.textDim : 'transparent',
              borderColor: colors.textDim,
            },
          ]}
        >
          <Text
            style={[
              styles.statusButtonText,
              {
                color: item.status === 'na' ? '#fff' : colors.textDim,
              },
            ]}
          >
            N/A
          </Text>
        </Pressable>
      </View>
    </ElevatedCard>
  );

  if (showSignature) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setShowSignature(false)} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{translate("inspection.complete" as any)}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.signatureForm}>
          <ElevatedCard>
            <Text style={[styles.signatureTitle, { color: colors.text }]}>
              Digital Signature Required
            </Text>
            <Text style={[styles.signatureDescription, { color: colors.textDim }]}>
              By signing below, you certify that this inspection has been completed accurately.
            </Text>

            <TextInput
              style={[
                styles.signatureInput,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  color: colors.text,
                  borderColor: isDark ? 'transparent' : '#E5E7EB',
                },
              ]}
              placeholder="Enter your full name as signature"
              placeholderTextColor={colors.textDim}
              value={signature}
              onChangeText={setSignature}
            />

            <View style={styles.signatureButtons}>
              <LoadingButton
                title="Cancel"
                onPress={() => setShowSignature(false)}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <LoadingButton
                title="Complete Inspection"
                onPress={handleSubmitSignature}
                loading={isLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </ElevatedCard>
        </View>
      </View>
    );
  }

  if (!currentInspection) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{translate("inspection.title" as any)}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.startForm}>
          <ElevatedCard>
            <Text style={[styles.startTitle, { color: colors.text }]}>
              Start New Inspection
            </Text>
            <Text style={[styles.startDescription, { color: colors.textDim }]}>
              Select the type of inspection you want to perform:
            </Text>

            <View style={styles.typeSelector}>
              {[
                { key: 'pre-trip', label: 'Pre-Trip Inspection' },
                { key: 'post-trip', label: 'Post-Trip Inspection' },
                { key: 'dot', label: 'DOT Inspection' },
              ].map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => setSelectedType(type.key as any)}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: selectedType === type.key ? colors.tint : 'transparent',
                      borderColor: colors.tint,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                    {
                      color: selectedType === type.key ? '#fff' : colors.tint,
                    },
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <LoadingButton
              title={translate("inspection.start" as any)}
              onPress={handleStartInspection}
              loading={isLoading}
              fullWidth
            />
          </ElevatedCard>
        </View>
      </View>
    );
  }

  const completedItems = currentInspection.items.filter(item => item.status !== 'pending').length;
  const totalItems = currentInspection.items.length;
  const progress = (completedItems / totalItems) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {currentInspection.type.charAt(0).toUpperCase() + currentInspection.type.slice(1)} Inspection
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ElevatedCard style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>
            Progress: {completedItems}/{totalItems}
          </Text>
          <Text style={[styles.progressPercentage, { color: colors.tint }]}>
            {Math.round(progress)}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: isDark ? colors.surface : '#E5E7EB' }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.tint,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      </ElevatedCard>

      <FlatList
        data={currentInspection.items}
        renderItem={renderInspectionItem}
        keyExtractor={(item) => item.id}
        style={styles.inspectionList}
        contentContainerStyle={styles.inspectionListContent}
      />

      <View style={styles.completeButton}>
        <LoadingButton
          title={translate("inspection.complete" as any)}
          onPress={handleCompleteInspection}
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
  startForm: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  startTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  typeSelector: {
    marginBottom: 24,
  },
  typeButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  inspectionList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inspectionListContent: {
    paddingBottom: 20,
  },
  inspectionItem: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  itemStatus: {
    marginLeft: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  completeButton: {
    padding: 20,
  },
  signatureForm: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  signatureTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  signatureDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  signatureInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  signatureButtons: {
    flexDirection: 'row',
  },
});