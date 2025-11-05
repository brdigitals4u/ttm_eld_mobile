import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Mail, Phone, MapPin, User, Lock, AlertCircle, CheckCircle, Clock } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/providers/ToastProvider'
import { Header } from '@/components/Header'
import ElevatedCard from '@/components/EvevatedCard'
import LoadingButton from '@/components/LoadingButton'
import {
  useUpdateDriverProfile,
  useRequestProfileChange,
  useDriverChangeRequests,
  ChangeRequest,
} from '@/api/driver-profile'

export default function ProfileEditScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { driverProfile } = useAuth()
  const toast = useToast()

  // Form state
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [homeTerminalAddress, setHomeTerminalAddress] = useState('')
  
  // Change request state
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false)
  const [changeRequestField, setChangeRequestField] = useState<'name' | 'driver_license' | ''>('')
  const [changeRequestValue, setChangeRequestValue] = useState('')
  const [changeRequestReason, setChangeRequestReason] = useState('')

  // API hooks
  const updateProfileMutation = useUpdateDriverProfile()
  const requestChangeMutation = useRequestProfileChange()
  const { data: changeRequestsData, isLoading: isLoadingRequests } = useDriverChangeRequests()

  // Initialize form with current profile data
  useEffect(() => {
    if (driverProfile) {
      setEmail(driverProfile.email || '')
      setPhone(driverProfile.phone || '')
      setHomeTerminalAddress(driverProfile.home_terminal_address || '')
    }
  }, [driverProfile])

  // Handle profile update (allowed fields)
  const handleUpdateProfile = async () => {
    try {
      const updateData: any = {}
      
      if (email !== driverProfile?.email) updateData.email = email
      if (phone !== driverProfile?.phone) updateData.phone = phone
      if (homeTerminalAddress !== driverProfile?.home_terminal_address) {
        updateData.home_terminal_address = homeTerminalAddress
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes detected to update.', 2000)
        return
      }

      await updateProfileMutation.mutateAsync(updateData)
      toast.success('Profile updated successfully!', 2000)
      setTimeout(() => {
        router.back()
      }, 500)
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.', 4000)
    }
  }

  // Handle change request (restricted fields)
  const handleRequestChange = async () => {
    if (!changeRequestField || !changeRequestValue || !changeRequestReason.trim()) {
      toast.warning('Please fill in all fields.', 3000)
      return
    }

    try {
      await requestChangeMutation.mutateAsync({
        field_name: changeRequestField,
        new_value: changeRequestValue,
        reason: changeRequestReason.trim(),
      })

      toast.success('Change request submitted successfully! It will be reviewed by an administrator.', 3000)
      setShowChangeRequestForm(false)
      setChangeRequestField('')
      setChangeRequestValue('')
      setChangeRequestReason('')
    } catch (error: any) {
      console.error('Change request error:', error)
      toast.error(error.message || 'Failed to submit change request. Please try again.', 4000)
    }
  }

  // Get status badge for change request
  const getStatusBadge = (status: ChangeRequest['status'] | string = 'pending') => {
    const statusConfig = {
      pending: { icon: Clock, color: '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' },
      approved: { icon: CheckCircle, color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
      rejected: { icon: AlertCircle, color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' },
    }

    const normalizedStatus = (status || 'pending') as keyof typeof statusConfig
    const config = statusConfig[normalizedStatus] || statusConfig.pending
    const Icon = config.icon

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: config.bg,
            borderColor: config.color,
          },
        ]}
      >
        <Icon size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
        </Text>
      </View>
    )
  }

  const renderChangeRequestForm = () => {
    if (!showChangeRequestForm) return null

    const fieldLabels: Record<string, string> = {
      name: 'Full Name',
      driver_license: 'Driver License Number',
    }

    return (
      <ElevatedCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Lock size={20} color={colors.tint} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Request Change
          </Text>
          <Text style={[styles.helperText, { color: colors.textDim }]}>
          Requires Admin Approval
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Field to Change</Text>
          <View style={styles.fieldButtons}>
            {(['name', 'driver_license'] as const).map((field) => (
              <TouchableOpacity
                key={field}
                style={[
                  styles.fieldButton,
                  {
                    backgroundColor:
                      changeRequestField === field
                        ? colors.tint
                        : isDark
                          ? colors.surface
                          : '#F3F4F6',
                    borderColor: changeRequestField === field ? colors.tint : 'transparent',
                  },
                ]}
                onPress={() => {
                  setChangeRequestField(field)
                  setChangeRequestValue('')
                }}
              >
                <Text
                  style={[
                    styles.fieldButtonText,
                    {
                      color: changeRequestField === field ? '#FFFFFF' : colors.text,
                      fontWeight: changeRequestField === field ? '600' : '500',
                    },
                  ]}
                >
                  {fieldLabels[field] || field}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {changeRequestField && (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Current Value</Text>
              <View
                style={[
                  styles.readOnlyInput,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  },
                ]}
              >
                <Text style={[styles.readOnlyText, { color: colors.textDim }]}>
                  {changeRequestField === 'name'
                    ? driverProfile?.name || 'N/A'
                    : driverProfile?.driver_license || driverProfile?.license_number || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>New Value</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  },
                ]}
                placeholder={`Enter new ${fieldLabels[changeRequestField] || changeRequestField}`}
                placeholderTextColor={colors.textDim}
                value={changeRequestValue}
                onChangeText={setChangeRequestValue}
                autoCapitalize={changeRequestField === 'name' ? 'words' : 'none'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Reason for Change <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    color: colors.text,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  },
                ]}
                placeholder="Explain why you need this change (e.g., legal name change, license renewal)"
                placeholderTextColor={colors.textDim}
                value={changeRequestReason}
                onChangeText={setChangeRequestReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                Provide documentation or explanation for admin review
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.textDim }]}
                onPress={() => {
                  setShowChangeRequestForm(false)
                  setChangeRequestField('')
                  setChangeRequestValue('')
                  setChangeRequestReason('')
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <LoadingButton
                title="Submit Request"
                onPress={handleRequestChange}
                loading={requestChangeMutation.isPending}
                variant="primary"
                style={styles.submitButton}
              />
            </View>
          </>
        )}
      </ElevatedCard>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Edit Profile"
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => router.back()}
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
        safeAreaEdges={['top']}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Editable Fields Section */}
          <ElevatedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mail size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Contact Information
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Email Address <Text style={{ color: '#10b981' }}>✓</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                    },
                  ]}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                You can update your email address directly
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Phone Number <Text style={{ color: '#10b981' }}>✓</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                    },
                  ]}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textDim}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                You can update your phone number directly
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Home Terminal Address <Text style={{ color: '#10b981' }}>✓</Text>
              </Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color={colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithIcon,
                    {
                      backgroundColor: isDark ? colors.surface : '#F3F4F6',
                      color: colors.text,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                    },
                  ]}
                  placeholder="Enter home terminal address"
                  placeholderTextColor={colors.textDim}
                  value={homeTerminalAddress}
                  onChangeText={setHomeTerminalAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                You can update your home terminal address directly
              </Text>
            </View>

            <LoadingButton
              title="Save Changes"
              onPress={handleUpdateProfile}
              loading={updateProfileMutation.isPending}
              variant="primary"
              style={styles.saveButton}
            />
          </ElevatedCard>

          {/* Restricted Fields Section */}
          <ElevatedCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={20} color="#ef4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Restricted Fields
              </Text>
              <Text style={[styles.helperText, { color: colors.textDim }]}  >
                Admin Approval Required
              </Text>
            </View>

            <View style={styles.restrictedField}>
              <View style={styles.restrictedFieldHeader}>
                <User size={20} color={colors.textDim} />
                <View style={styles.restrictedFieldContent}>
                  <Text style={[styles.restrictedFieldLabel, { color: colors.text }]}>
                    Full Name
                  </Text>
                  <Text style={[styles.restrictedFieldValue, { color: colors.text }]}>
                    {driverProfile?.name || 'N/A'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.restrictedFieldNote, { color: colors.textDim }]}>
                Requires admin approval to change
              </Text>
            </View>

            <View style={styles.restrictedField}>
              <View style={styles.restrictedFieldHeader}>
                <Lock size={20} color={colors.textDim} />
                <View style={styles.restrictedFieldContent}>
                  <Text style={[styles.restrictedFieldLabel, { color: colors.text }]}>
                    Driver License
                  </Text>
                  <Text style={[styles.restrictedFieldValue, { color: colors.text }]}>
                    {driverProfile?.driver_license || driverProfile?.license_number || 'N/A'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.restrictedFieldNote, { color: colors.textDim }]}>
                Requires admin approval to change
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.requestButton,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F4F6',
                  borderColor: colors.tint,
                },
              ]}
              onPress={() => setShowChangeRequestForm(!showChangeRequestForm)}
            >
              <Text style={[styles.requestButtonText, { color: colors.tint }]}>
                {showChangeRequestForm ? 'Hide' : 'Request'} Change
              </Text>
            </TouchableOpacity>
          </ElevatedCard>

          {/* Change Request Form */}
          {renderChangeRequestForm()}

          {/* View All Requests Button */}
          {changeRequestsData && changeRequestsData.requests && changeRequestsData.requests.length > 0 && (
            <ElevatedCard style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.viewAllButton,
                  {
                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                    borderColor: colors.tint,
                  },
                ]}
                onPress={() => router.push('/profile-requests')}
              >
                <Text style={[styles.viewAllButtonText, { color: colors.tint }]}>
                  View All Change Requests
                </Text>
              </TouchableOpacity>
            </ElevatedCard>
          )}

          {/* Change Requests History (Recent 3) */}
          {changeRequestsData && changeRequestsData.requests && changeRequestsData.requests.length > 0 && (
            <ElevatedCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={colors.tint} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Change Request History
                </Text>
              </View>

              {isLoadingRequests ? (
                <ActivityIndicator size="small" color={colors.tint} style={styles.loader} />
              ) : (
                changeRequestsData.requests.slice(0, 3).map((request) => (
                  <View key={request.id} style={styles.changeRequestItem}>
                    <View style={styles.changeRequestHeader}>
                      <View style={styles.changeRequestField}>
                        <Text style={[styles.changeRequestFieldLabel, { color: colors.textDim }]}>
                          Field:
                        </Text>
                        <Text style={[styles.changeRequestFieldValue, { color: colors.text }]}>
                          {request.field_name ? request.field_name.replace('_', ' ').toUpperCase() : 'N/A'}
                        </Text>
                      </View>
                      {getStatusBadge(request.status || 'pending')}
                    </View>

                    <View style={styles.changeRequestDetails}>
                      <Text style={[styles.changeRequestOldValue, { color: colors.textDim }]}>
                        From: {request.old_value || 'N/A'}
                      </Text>
                      <Text style={[styles.changeRequestNewValue, { color: colors.text }]}>
                        To: {request.new_value || 'N/A'}
                      </Text>
                      <Text style={[styles.changeRequestReason, { color: colors.textDim }]}>
                        Reason: {request.reason || 'N/A'}
                      </Text>
                      {request.admin_notes && (
                        <Text style={[styles.changeRequestAdminNotes, { color: colors.text }]}>
                          Admin Notes: {request.admin_notes}
                        </Text>
                      )}
                    </View>

                    <Text style={[styles.changeRequestDate, { color: colors.textDim }]}>
                      Submitted: {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                      {request.reviewed_at &&
                        ` • Reviewed: ${new Date(request.reviewed_at).toLocaleDateString()}`}
                    </Text>
                  </View>
                ))
              )}
            </ElevatedCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    paddingLeft: 44,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  inputWithIcon: {
    paddingLeft: 44,
  },
  textArea: {
    minHeight: 100,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  readOnlyInput: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: 10,
  },
  restrictedField: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  restrictedFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  restrictedFieldContent: {
    flex: 1,
  },
  restrictedFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restrictedFieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  restrictedFieldNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  requestButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  fieldButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  fieldButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
  },
  changeRequestItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  changeRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeRequestField: {
    flex: 1,
  },
  changeRequestFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  changeRequestFieldValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  changeRequestDetails: {
    marginBottom: 12,
  },
  changeRequestOldValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  changeRequestNewValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeRequestReason: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  changeRequestAdminNotes: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  changeRequestDate: {
    fontSize: 12,
    marginTop: 8,
  },
  loader: {
    padding: 20,
  },
  viewAllButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

