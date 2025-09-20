import { router } from 'expo-router';
import { ArrowLeft, Building, Edit, Mail, MapPin, Phone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import LoadingButton from '@/components/LoadingButton';
import ElevatedCard from '@/components/EvevatedCard';
import { useCarrier } from '@/contexts';
import { useAppTheme } from '@/theme/context';
import { CarrierInfo } from '@/types/carrier';

export default function CarrierScreen() {
  const { theme } = useAppTheme();
  const { colors, isDark } = theme;
  const { carrierInfo, updateCarrierInfo, isLoading } = useCarrier();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CarrierInfo | null>(carrierInfo);

  const handleEdit = () => {
    setFormData(carrierInfo);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(carrierInfo);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData) return;
    
    await updateCarrierInfo(formData);
    setIsEditing(false);
  };

  const updateFormData = (field: keyof CarrierInfo, value: any) => {
    if (!formData) return;
    
    if (field === 'address') {
      setFormData({
        ...formData,
        address: { ...formData.address, ...value },
      });
    } else {
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  if (!carrierInfo || !formData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Carrier Info</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textDim }]}>
            Loading carrier information...
          </Text>
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
        <Text style={[styles.title, { color: colors.text }]}>Carrier Info</Text>
        {!isEditing ? (
          <LoadingButton
            title="Edit"
            onPress={handleEdit}
            icon={<Edit size={16} color={isDark ? colors.text : '#fff'} />}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <ElevatedCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building size={24} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Company Information
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Company Name</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                placeholder="Company name"
                placeholderTextColor={colors.textDim}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {(carrierInfo as any)?.name || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.infoGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>DOT Number</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.dotNumber}
                  onChangeText={(text) => updateFormData('dotNumber', text)}
                  placeholder="DOT number"
                  placeholderTextColor={colors.textDim}
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.dotNumber || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={[styles.infoGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>MC Number</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.mcNumber || ''}
                  onChangeText={(text) => updateFormData('mcNumber', text)}
                  placeholder="MC number"
                  placeholderTextColor={colors.textDim}
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.mcNumber || 'N/A'}
                </Text>
              )}
            </View>
          </View>
        </ElevatedCard>

        <ElevatedCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Address
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Street Address</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                value={formData.address.street}
                onChangeText={(text) => updateFormData('address', { street: text })}
                placeholder="Street address"
                placeholderTextColor={colors.textDim}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {(carrierInfo as any)?.address?.street || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.infoGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>City</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.address.city}
                  onChangeText={(text) => updateFormData('address', { city: text })}
                  placeholder="City"
                  placeholderTextColor={colors.textDim}
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.address?.city || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={[styles.infoGroup, { flex: 1, marginHorizontal: 4 }]}>
              <Text style={[styles.label, { color: colors.text }]}>State</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.address.state}
                  onChangeText={(text) => updateFormData('address', { state: text })}
                  placeholder="State"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.address?.state || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={[styles.infoGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>ZIP</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.address.zipCode}
                  onChangeText={(text) => updateFormData('address', { zipCode: text })}
                  placeholder="ZIP"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.address?.zipCode || 'Not provided'}
                </Text>
              )}
            </View>
          </View>
        </ElevatedCard>

        <ElevatedCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={24} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contact Information
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                placeholder="Phone number"
                placeholderTextColor={colors.textDim}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {(carrierInfo as any)?.phone || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                placeholder="Email address"
                placeholderTextColor={colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {(carrierInfo as any)?.email || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Contact Person</Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'transparent' : '#E5E7EB',
                  },
                ]}
                value={formData.contactPerson}
                onChangeText={(text) => updateFormData('contactPerson', text)}
                placeholder="Contact person name"
                placeholderTextColor={colors.textDim}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>
                {(carrierInfo as any)?.contactPerson || 'Not provided'}
              </Text>
            )}
          </View>
        </ElevatedCard>

        <ElevatedCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            HOS Configuration
          </Text>

          <View style={styles.inputRow}>
            <View style={[styles.infoGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Cycle Type</Text>
              {isEditing ? (
                <View style={styles.cycleSelector}>
                  {[
                    { key: '60-7', label: '60-hour/7-day' },
                    { key: '70-8', label: '70-hour/8-day' },
                  ].map((cycle) => (
                    <Pressable
                      key={cycle.key}
                      onPress={() => updateFormData('cycleType', cycle.key)}
                      style={[
                        styles.cycleButton,
                        {
                          backgroundColor: formData.cycleType === cycle.key ? colors.tint : 'transparent',
                          borderColor: colors.tint,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cycleButtonText,
                          {
                            color: formData.cycleType === cycle.key ? '#fff' : colors.tint,
                          },
                        ]}
                      >
                        {cycle.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.cycleType === '60-7' ? '60-hour/7-day' : '70-hour/8-day'}
                </Text>
              )}
            </View>

            <View style={[styles.infoGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Restart Hours</Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'transparent' : '#E5E7EB',
                    },
                  ]}
                  value={formData.restartHours.toString()}
                  onChangeText={(text) => updateFormData('restartHours', parseInt(text) || 34)}
                  placeholder="34"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={[styles.value, { color: colors.text }]}>
                  {(carrierInfo as any)?.restartHours || 'Not specified'} hours
                </Text>
              )}
            </View>
          </View>
        </ElevatedCard>

        {isEditing && (
          <View style={styles.editButtons}>
            <LoadingButton
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              style={{ flex: 1, marginRight: 8 }}
            />
            <LoadingButton
              title="Save Changes"
              onPress={handleSave}
              loading={isLoading}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginLeft: 12,
  },
  infoGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  cycleSelector: {
    gap: 8,
  },
  cycleButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  cycleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});