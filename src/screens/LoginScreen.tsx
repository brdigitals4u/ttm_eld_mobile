import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, TextInput, TouchableOpacity } from 'react-native'
import { Text } from '@/components/Text'
import { useDriverLogin } from '@/api/organization'
import { useAuth } from '@/contexts/AuthContext'
import { useAppTheme } from '@/theme/context'
import { useToast } from '@/providers/ToastProvider'
import { LoginCredentials } from '@/database/schemas'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/api/constants'
import { tokenStorage, userStorage } from '@/utils/storage'
import { RealmService } from '@/database/realm'
import { BSON } from 'realm'
import { router } from 'expo-router'

export const LoginScreen: React.FC = () => {
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

    console.log('Starting login process...')
    console.log('API Base URL:', 'http://10.0.2.2:8000/api')
    console.log('Login endpoint:', '/organisation_users/login/')
    console.log('Full URL:', 'http://10.0.2.2:8000/api/organisation_users/login/')

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
    <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIcon, { backgroundColor: theme.colors.tint }]}>
                <Text style={styles.logoText}>TT</Text>
              </View>
              <Text style={[styles.appTitle, { color: theme.colors.text }]}>TTMKonnect</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Login Card */}
            <View style={[styles.loginCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Driver Login</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textDim }]}>Sign in to your account</Text>
              </View>

              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email Address</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      { 
                        backgroundColor: theme.colors.background, 
                        borderColor: errors.email ? theme.colors.error : theme.colors.border,
                        color: theme.colors.text 
                      }
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.textDim}
                    value={credentials.email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.email && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.email}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      { 
                        backgroundColor: theme.colors.background, 
                        borderColor: errors.password ? theme.colors.error : theme.colors.border,
                        color: theme.colors.text 
                      }
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textDim}
                    value={credentials.password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry
                    autoComplete="password"
                  />
                  {errors.password && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.password}</Text>
                  )}
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton, 
                    { 
                      backgroundColor: theme.colors.tint,
                      opacity: driverLoginMutation.isPending ? 0.6 : 1
                    }
                  ]}
                  onPress={handleLogin}
                  disabled={driverLoginMutation.isPending}
                >
                  <Text style={[styles.loginButtonText, { color: theme.colors.palette.neutral100 }]}>
                    {driverLoginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Text>
                </TouchableOpacity>

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPasswordContainer}>
                  <Text style={[styles.forgotPasswordText, { color: theme.colors.tint }]}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Test API Connection Button */}

              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginCard: {
    borderRadius: 8,
    padding: 32,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  testButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})