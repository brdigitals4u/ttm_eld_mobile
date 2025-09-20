import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { Surface } from 'react-native-paper'
import { useUserProfile, useUpdateProfile, useChangePassword, useDeleteAccount } from '@/api/user'
import { useAuth } from '@/contexts/AuthContext'
import { useLogout } from '@/api/auth'
import { useDriverLogout } from '@/api/organization'
import { useAppTheme } from '@/theme/context'
import { useToast } from '@/providers/ToastProvider'
import { UpdateProfileData, ChangePasswordData } from '@/api/user'
import { router } from 'expo-router'

export const ProfileScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const { user, logout: authLogout, updateUser } = useAuth()
  const toast = useToast()
  const logoutMutation = useLogout()
  const driverLogoutMutation = useDriverLogout()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()
  const deleteAccountMutation = useDeleteAccount()
  
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  
  const [editMode, setEditMode] = useState(false)
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phoneNumber: profile?.phoneNumber || '',
  })
  
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
  })
  
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [errors, setErrors] = useState<Partial<UpdateProfileData & ChangePasswordData>>({})

  const handleLogout = async () => {
    try {
      // Use driver logout (handles missing API gracefully)
      await driverLogoutMutation.mutateAsync()
      
      // Clear auth state
      authLogout()
      
      // Navigate to login screen
      router.replace('/login')
      
      toast.success('Logged out successfully', 2000)
    } catch (error) {
      console.error('Logout error:', error)
      
      // Even if logout fails, clear auth state and redirect to login
      authLogout()
      router.replace('/login')
      
      toast.success('Logged out successfully', 2000)
    }
  }

  const validateProfileForm = (): boolean => {
    const newErrors: Partial<UpdateProfileData> = {}

    if (!profileData.firstName?.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!profileData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (profileData.phoneNumber && !/^\+?[\d\s-()]+$/.test(profileData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<ChangePasswordData> = {}

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdateProfile = async () => {
    if (!validateProfileForm()) return

    try {
      const result = await updateProfileMutation.mutateAsync(profileData)
      if (result) {
        updateUser(result)
        setEditMode(false)
        toast.success('Profile updated successfully', 3000)
      }
    } catch (error: any) {
      console.error('Update profile error:', error)
      toast.error(error.message || 'Failed to update profile', 4000)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return

    try {
      await changePasswordMutation.mutateAsync(passwordData)
      setPasswordData({ currentPassword: '', newPassword: '' })
      setShowPasswordForm(false)
      toast.success('Password changed successfully', 3000)
    } catch (error: any) {
      console.error('Change password error:', error)
      toast.error(error.message || 'Failed to change password', 4000)
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountMutation.mutateAsync(passwordData.currentPassword)
              authLogout()
              toast.success('Account deleted successfully', 3000)
            } catch (error: any) {
              console.error('Delete account error:', error)
              toast.error(error.message || 'Failed to delete account', 4000)
            }
          },
        },
      ]
    )
  }

  const currentUser = profile || user

  if (profileLoading) {
    return (
      <Screen style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.text }}>Loading profile...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text preset="heading" style={{ color: theme.colors.text }}>
              Profile
            </Text>
            <Button
              preset="reversed"
              text="Logout"
              onPress={handleLogout}
              disabled={logoutMutation.isPending || driverLogoutMutation.isPending}
            //   loading={logoutMutation.isPending || driverLogoutMutation.isPending}
            />
          </View>

          <Surface style={[styles.card, { backgroundColor: theme.colors.background }]} elevation={2}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={[styles.avatar, { backgroundColor: theme.colors.tint }]}>
                  {currentUser?.firstName?.charAt(0)}{currentUser?.lastName?.charAt(0)}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text preset="heading" style={{ color: theme.colors.text }}>
                  {currentUser?.firstName} {currentUser?.lastName}
                </Text>
                <Text preset="default" style={[styles.email, { color: theme.colors.textDim }]}>
                  {currentUser?.email}
                </Text>
                <Text preset="default" style={[styles.status, { color: theme.colors.textDim }]}>
                  {currentUser?.isEmailVerified ? 'Email Verified' : 'Email Not Verified'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text preset="subheading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Personal Information
              </Text>
              
              <View style={styles.form}>
                <TextField
                  label="First Name"
                  value={profileData.firstName}
                  onChangeText={(text) => {
                    setProfileData(prev => ({ ...prev, firstName: text }))
                    if (errors.firstName) {
                      setErrors(prev => ({ ...prev, firstName: undefined }))
                    }
                  }}
                //   error={errors.firstName}
                  editable={editMode}
                  style={styles.input}
                />

                <TextField
                  label="Last Name"
                  value={profileData.lastName}
                  onChangeText={(text) => {
                    setProfileData(prev => ({ ...prev, lastName: text }))
                    if (errors.lastName) {
                      setErrors(prev => ({ ...prev, lastName: undefined }))
                    }
                  }}
                //   error={errors.lastName}
                  editable={editMode}
                  style={styles.input}
                />

                <TextField
                  label="Phone Number"
                  value={profileData.phoneNumber}
                  onChangeText={(text) => {
                    setProfileData(prev => ({ ...prev, phoneNumber: text }))
                    if (errors.phoneNumber) {
                      setErrors(prev => ({ ...prev, phoneNumber: undefined }))
                    }
                  }}
                //   error={errors.phoneNumber}
                  editable={editMode}
                  keyboardType="phone-pad"
                  style={styles.input}
                />

                <TextField
                  label="Email"
                  value={currentUser?.email || ''}
                  editable={false}
                  style={styles.input}
                />

                {editMode ? (
                  <View style={styles.editButtons}>
                    <Button
                      preset="filled"
                      text="Save"
                      onPress={handleUpdateProfile}
                      disabled={updateProfileMutation.isPending}
                    //   loading={updateProfileMutation.isPending}
                      style={styles.saveButton}
                    />
                    <Button
                      preset="reversed"
                      text="Cancel"
                      onPress={() => {
                        setEditMode(false)
                        setProfileData({
                          firstName: currentUser?.firstName || '',
                          lastName: currentUser?.lastName || '',
                          phoneNumber: currentUser?.phoneNumber || '',
                        })
                        setErrors({})
                      }}
                      style={styles.cancelButton}
                    />
                  </View>
                ) : (
                  <Button
                    preset="filled"
                    text="Edit Profile"
                    onPress={() => setEditMode(true)}
                    style={styles.editButton}
                  />
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text preset="subheading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Security
              </Text>
              
              {showPasswordForm ? (
                <View style={styles.form}>
                  <TextField
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChangeText={(text) => {
                      setPasswordData(prev => ({ ...prev, currentPassword: text }))
                      if (errors.currentPassword) {
                        setErrors(prev => ({ ...prev, currentPassword: undefined }))
                      }
                    }}
                    // error={errors.currentPassword}
                    secureTextEntry
                    style={styles.input}
                  />

                  <TextField
                    label="New Password"
                    value={passwordData.newPassword}
                    onChangeText={(text) => {
                      setPasswordData(prev => ({ ...prev, newPassword: text }))
                      if (errors.newPassword) {
                        setErrors(prev => ({ ...prev, newPassword: undefined }))
                      }
                    }}
                    // error={errors.newPassword}
                    secureTextEntry
                    style={styles.input}
                  />

                  <View style={styles.passwordButtons}>
                    <Button
                      preset="filled"
                      text="Change Password"
                      onPress={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                    //   loading={changePasswordMutation.isPending}
                      style={styles.changePasswordButton}
                    />
                    <Button
                      preset="reversed"
                      text="Cancel"
                      onPress={() => {
                        setShowPasswordForm(false)
                        setPasswordData({ currentPassword: '', newPassword: '' })
                        setErrors({})
                      }}
                      style={styles.cancelPasswordButton}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  preset="reversed"
                  text="Change Password"
                  onPress={() => setShowPasswordForm(true)}
                  style={styles.changePasswordButton}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text preset="subheading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Danger Zone
              </Text>
              
              <Button
                preset="reversed"
                text="Delete Account"
                onPress={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                // loading={deleteAccountMutation.isPending}
                style={[styles.deleteButton, { borderColor: theme.colors.error }]}
                textStyle={{ color: theme.colors.error }}
              />
            </View>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    padding: 24,
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  email: {
    marginTop: 4,
  },
  status: {
    marginTop: 4,
    fontSize: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  form: {
    gap: 16,
  },
  input: {
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
  },
  editButton: {
    marginTop: 8,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  changePasswordButton: {
    flex: 1,
  },
  cancelPasswordButton: {
    flex: 1,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#ff4444',
    marginTop: 8,
  },
})
