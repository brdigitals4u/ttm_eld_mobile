import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput } from 'react-native'
import { Text } from '@/components/Text'
import { useDriverLogin } from '@/api/organization'
import { useAuth } from '@/contexts'
import TTMKonnectLogo from '@/components/TTMKonnectLogo';
import { useAppTheme } from '@/theme/context'
import { useToast } from '@/providers/ToastProvider'
import { LoginCredentials } from '@/database/schemas'
import Button from '@/components/LoadingButton';
import { ERROR_MESSAGES } from '@/api/constants'
import { router } from 'expo-router'

export const LoginScreen: React.FC = () => {

  const colors = {
    background: '#FFFFFF',
    text: '#000000',
    inactive: '#666666',
    card: '#F5F5F5',
  };

  const isDark = false;
  const insets = { top: 44, bottom: 34, left: 0, right: 0 };

  const { theme } = useAppTheme()
  const { login } = useAuth()
  const toast = useToast()
  const driverLoginMutation = useDriverLogin()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: 'john.smith@example.com',
    password: 'SecurePass123!',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  })

  const validateForm = () => {
    let valid = true
    const newErrors = { email: '', password: '' }

    if (!credentials.email) {
      newErrors.email = 'Email is required'
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid'
      valid = false
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required'
      valid = false
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleEmailChange = (text: string) => {
    setCredentials({ ...credentials, email: text })
    if (errors.email) setErrors({ ...errors, email: '' })
  }

  const handlePasswordChange = (text: string) => {
    setCredentials({ ...credentials, password: text })
    if (errors.password) setErrors({ ...errors, password: '' })
  }



  const handleLogin = async () => {
    if (!validateForm()) return
    try {
      // Use mutation approach since it's working now
      console.log('Using driver login mutation...')
      const driverResult = await driverLoginMutation.mutateAsync(credentials)
      
      console.log('Driver login result:', driverResult)
      
      if (driverResult && driverResult.token) {
        console.log('Login successful, user already stored by mutation')
        
        // Convert driver profile to user format for auth context
        const userProfile = {
          _id: driverResult.user.id,
          email: driverResult.user.email,
          firstName: driverResult.user.firstName,
          lastName: driverResult.user.lastName,
          avatar: undefined,
          phoneNumber: driverResult.user.driver_profile.phone,
          dateOfBirth: undefined,
          isEmailVerified: true,
          createdAt: new Date(driverResult.user.driver_profile.created_at),
          updatedAt: new Date(driverResult.user.driver_profile.updated_at),
        }
        
        console.log('Calling login function with user profile:', userProfile)
        login(userProfile)
        toast.success(`Welcome back, ${userProfile.firstName}!`, 3000)
        
        // Manual navigation to dashboard
        console.log('Manually navigating to dashboard...')
        router.replace('/(tabs)/dashboard')
        return
      } else {
        throw new Error('Login failed - no token received')
      }
    } catch (driverLoginError: any) {
      console.log('Driver login failed:', driverLoginError)
      
      let errorMessage: string = ERROR_MESSAGES.SERVER_ERROR

      if (driverLoginError.message === 'Invalid email or password') {
        errorMessage = ERROR_MESSAGES.INVALID_CREDENTIALS as string
      } else if (driverLoginError.message) {
        errorMessage = driverLoginError.message
      }

      toast.error(errorMessage, 4000)
    }
  }

  return (
    <KeyboardAvoidingView
    style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.logoContainer}>
      <TTMKonnectLogo size={80} showText={true} />
      <Text style={[styles.title, { color: colors.text }]}>TTM Konnect</Text>
      <Text style={[styles.subtitle, { color: colors.inactive }]}>
        Transform your operations with TTMKonnect intelligence
      </Text>
    </View>

    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? colors.card : '#F3F4F6',
              color: colors.text,
              borderColor: isDark ? 'transparent' : '#E5E7EB',
            },
          ]}
          placeholder="Enter your email"
          placeholderTextColor={colors.inactive}
          value={credentials.email}
          onChangeText={handleEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? colors.card : '#F3F4F6',
              color: colors.text,
              borderColor: isDark ? 'transparent' : '#E5E7EB',
            },
          ]}
          placeholder="Enter your password"
          placeholderTextColor={colors.inactive}
          value={credentials.password}
          onChangeText={handlePasswordChange}
          secureTextEntry
        />
      </View>

      <Button
        title="Log In"
        onPress={handleLogin}
        loading={driverLoginMutation.isPending}
        fullWidth
      />
    </View>
  
  </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
  helpText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});