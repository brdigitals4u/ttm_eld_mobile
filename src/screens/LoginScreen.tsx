import React, { useState, useMemo } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Linking, ScrollView, Image, Pressable } from 'react-native'
import { Text } from '@/components/Text'
import { useDriverLogin } from '@/api/organization'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/providers/ToastProvider'
import { LoginCredentials } from '@/database/schemas'
import { router } from 'expo-router'
import { AnimatedButton } from '@/components/AnimatedButton'
import { COLORS } from '@/constants/colors'

export const LoginScreen: React.FC = () => {
  const { login } = useAuth()
  const toast = useToast()
  const driverLoginMutation = useDriverLogin()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: 'testdriver.cognito@ttmkonnect.com',
    password: 'TestDriver@2025!',
  })
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [privacyError, setPrivacyError] = useState('')

  // Check if button should be disabled
  const isButtonDisabled = useMemo(() => {
    return !credentials.email.trim() || !credentials.password || !agreedToPrivacy
  }, [credentials.email, credentials.password, agreedToPrivacy])

  const validateForm = () => {
    let valid = true
    const newErrors = { email: '', password: '' }

    if (!credentials.email) {
      newErrors.email = 'Email is required'; valid = false
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid'; valid = false
    }
    if (!credentials.password) {
      newErrors.password = 'Password is required'; valid = false
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'; valid = false
    }
    setErrors(newErrors)
    return valid
  }

  const handleLogin = async () => {
    if (!validateForm()) {
      throw new Error('Please fix form errors')
    }
    if (!agreedToPrivacy) {
      setPrivacyError('You must agree to the Privacy Policy to continue')
      throw new Error('You must agree to the Privacy Policy to continue')
    }
    try {
      const result = await driverLoginMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
      })
      await login(result)
      toast.success('Login successful!', 2000)
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred'
      if (error?.response?.status === 401) errorMessage = 'Invalid email or password'
      else if (error?.response?.status === 403) errorMessage = 'Account access denied'
      else if (error?.response?.status === 429) errorMessage = 'Too many login attempts. Please try again later'
      else if (error?.response?.data?.message) errorMessage = error.response.data.message
      else if (error?.message) errorMessage = error.message
      else if (typeof error === 'string') errorMessage = error
      toast.error(errorMessage, 4000)
      throw error // Re-throw to prevent AnimatedButton from showing success
    }
  }

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    toast.info(`Contact support to reset your password!`, 2000)
  }

  const handleRegister = () => {
    // Navigate to register screen

  }

  const handleLoginSuccess = () => {
    router.replace('/device-scan')
  }

  // Lottie animations (import your own JSON files or use existing ones)
  const loadingAnimation = require('assets/animations/loading.json')
  const successAnimation = require('assets/animations/success.json')

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>

          <View>
            {/* You can add your own image here */}
            <Image
              source={require('assets/images/trident_logo.png')}
              style={styles.loginHeaderImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcomeTitle}>Welcome to TTM Family</Text>
          <Text style={styles.welcomeSubtitle}>Sign in to continue your journey</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                placeholderTextColor={COLORS.ink300}
                value={credentials.email}
                onChangeText={(text) => {
                  setCredentials((p) => ({ ...p, email: text }))
                  setErrors((p) => ({ ...p, email: '' }))
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor={COLORS.ink300}
                value={credentials.password}
                onChangeText={(text) => {
                  setCredentials((p) => ({ ...p, password: text }))
                  setErrors((p) => ({ ...p, password: '' }))
                }}
                secureTextEntry={!showPassword}
              />
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Privacy Policy Agreement */}
          <View style={styles.privacyContainer}>
            <Pressable 
              style={styles.checkboxContainer}
              onPress={() => {
                setAgreedToPrivacy(!agreedToPrivacy)
                setPrivacyError('')
              }}
            >
              <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyText}>
                  I agree to the{' '}
                  <Text 
                    style={styles.privacyLink}
                    onPress={(e) => {
                      e.stopPropagation()
                      Linking.openURL('https://ttmkonnect.com/privacy')
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </Pressable>
            {!!privacyError && <Text style={styles.errorText}>{privacyError}</Text>}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotContainer} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forget password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <AnimatedButton
            title={driverLoginMutation.isPending ? 'Logging in…' : 'Login now'}
            onPress={handleLogin}
            onSuccess={handleLoginSuccess}
            loadingAnimation={loadingAnimation}
            successAnimation={successAnimation}
            disabled={isButtonDisabled}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
            successDuration={1500}
          />


        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    marginTop: 48,
    marginBottom: 48,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 35,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.ink500,
    textAlign: 'center',
  },

  /* Form */
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.ink700,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },

  /* Privacy Policy */
  privacyContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.ink300,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyText: {
    fontSize: 14,
    color: COLORS.ink700,
    lineHeight: 20,
  },
  privacyLink: {
    color: COLORS.indigo,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* Forgot Password */
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
  },

  /* Login Button */
  loginButton: {
    backgroundColor: COLORS.indigo,
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold'
  },

  /* Divider */
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 14,
    color: COLORS.ink500,
    marginHorizontal: 16,
  },

  /* Social Login */
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  socialButton: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialEmoji: {
    fontSize: 32,
  },

  /* Sign Up */
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: COLORS.ink500
  },
  signupLink: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginHeaderImage: {
    width: '100%',
    height: 140,
    marginBottom: 20,
  },
})
