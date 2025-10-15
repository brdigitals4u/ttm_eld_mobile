import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Linking } from 'react-native'
import { Text } from '@/components/Text'
import { useDriverLogin } from '@/api/organization'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/providers/ToastProvider'
import { LoginCredentials } from '@/database/schemas'
import { router } from 'expo-router'
import { Icon, PressableIcon } from '@/components/Icon'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, G, Rect, Circle } from 'react-native-svg'
import TTMKonnectLogo from '@/components/TTMKonnectLogo'

const COLORS = {
  indigo: '#5750F1',
  black: '#000000',
  ink700: '#1F2430',
  ink500: '#4B5563',
  ink300: '#9CA3AF',
  surface: '#F4F5FF',   // very light indigo tint
  border: '#E6E7FB',
  white: '#FFFFFF',
}

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
  const [rememberMe, setRememberMe] = useState(false)

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
    if (!validateForm()) return
    try {
      const result = await driverLoginMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
      })
      await login(result)
      toast.success('Login successful!', 2000)
      // Navigate to device scan screen to connect ELD before going to dashboard
      // @ts-ignore - route exists at /src/app/device-scan.tsx
      router.replace('/device-scan')
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred'
      if (error?.response?.status === 401) errorMessage = 'Invalid email or password'
      else if (error?.response?.status === 403) errorMessage = 'Account access denied'
      else if (error?.response?.status === 429) errorMessage = 'Too many login attempts. Please try again later'
      else if (error?.response?.data?.message) errorMessage = error.response.data.message
      else if (error?.message) errorMessage = error.message
      else if (typeof error === 'string') errorMessage = error
      toast.error(errorMessage, 4000)
    }
  }

  const handlePrivacyPolicy = () => Linking.openURL('https://ttmkonnect.com/privacy')
  const handleTermsOfUse   = () => Linking.openURL('https://ttmkonnect.com/terms')

  /** ======= BRAND HEADER (FleetBackground) ======= **/
  const FleetBackground = () => (
    <Svg width="100%" height="100%" viewBox="0 0 400 300" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <SvgLinearGradient id="hdr" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.indigo} />
          <Stop offset="100%" stopColor={COLORS.black} />
        </SvgLinearGradient>
        <SvgLinearGradient id="lane" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
        </SvgLinearGradient>
      </Defs>

      {/* gradient block */}
      <Rect x="0" y="0" width="400" height="300" rx="0" fill="url(#hdr)" />

      {/* sweeping curved “road” edge */}
      <Path
        d="M0,220 C120,180 280,260 400,210 L400,300 L0,300 Z"
        fill="#FFFFFF"
        opacity={0.08}
      />

      {/* lane stripes */}
      <G>
        <Path d="M-40,150 C80,120 200,200 420,160" stroke="url(#lane)" strokeWidth="4" strokeDasharray="18 10" fill="none" />
        <Path d="M-30,190 C90,160 210,240 430,200" stroke="url(#lane)" strokeWidth="3" strokeDasharray="14 10" fill="none" />
      </G>
    </Svg>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <FleetBackground />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon icon="caretLeft" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.appTag}>TTMKonnect</Text>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>Login to driver account</Text>
        </View>
      </View>

      {/* Card area */}
      <View style={styles.contentContainer}>
        <View style={styles.inputContainer}>
          {/* Email */}
          <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
            <View style={styles.inputIcon}>
              <Icon icon="user" size={20} color={COLORS.indigo} />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Fleet ID or Email"
              placeholderTextColor={COLORS.ink300}
              value={credentials.email}
              onChangeText={(text) => setCredentials((p) => ({ ...p, email: text }))}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
            <View style={styles.inputIcon}>
              <Icon icon="lock" size={20} color={COLORS.indigo} />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor={COLORS.ink300}
              value={credentials.password}
              onChangeText={(text) => setCredentials((p) => ({ ...p, password: text }))}
              secureTextEntry={!showPassword}
            />
          </View>
          {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Icon icon="check" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={driverLoginMutation.isPending}
          >
            <Text style={styles.loginButtonText}>
              {driverLoginMutation.isPending ? 'Logging in…' : 'Login'}
            </Text>
          </TouchableOpacity>

          {/* Legal */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By signing in, you accept our{' '}
              <Text style={styles.legalLink} onPress={handlePrivacyPolicy}>Privacy Policy</Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={handleTermsOfUse}>Terms of Use</Text>.
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  /* Header */
  headerContainer: {
    height: '38%',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  headerCopy: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  appTag: {
    color: '#E9E9FF',
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },

  /* Card / Content */
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -18,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  inputContainer: { flex: 1 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: { marginRight: 12 },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.ink700,
  },
  eyeIcon: { padding: 4 },

  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    borderColor: COLORS.indigo, marginRight: 8, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.indigo },
  rememberMeText: { fontSize: 14, color: COLORS.ink500 },
  forgotPasswordText: { fontSize: 14, color: COLORS.indigo },

  loginButton: {
    backgroundColor: COLORS.indigo,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },

  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  signupText: { fontSize: 14, color: COLORS.ink500 },
  signupLink: { fontSize: 14, color: COLORS.indigo, textDecorationLine: 'underline' },

  legalContainer: { alignItems: 'center', paddingHorizontal: 12, marginTop: 4 },
  legalText: { fontSize: 12, color: COLORS.ink300, textAlign: 'center', lineHeight: 18 },
  legalLink: { color: COLORS.indigo, textDecorationLine: 'underline' },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: -6,
    marginBottom: 8,
  },
})
