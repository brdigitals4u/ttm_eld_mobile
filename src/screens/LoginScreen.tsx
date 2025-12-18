import { useState, useMemo, useEffect } from "react"
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Linking,
  ScrollView,
  Image,
  Pressable,
  Modal,
  SafeAreaView,
  StatusBar,
} from "react-native"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { useDriverLogin } from "@/api/organization"
import { AnimatedButton } from "@/components/AnimatedButton"
import { Header } from "@/components/Header"
import { LoginSuccessModal } from "@/components/LoginSuccessModal"
import { Text } from "@/components/Text"
import { LoginCredentials } from "@/database/schemas"
import { translate } from "@/i18n/translate"
import { useToast } from "@/providers/ToastProvider"
import { analyticsService } from "@/services/AnalyticsService"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { settingsStorage } from "@/utils/storage"

const loadingAnimation = require("assets/animations/loading.json")
const successAnimation = require("assets/animations/success.json")

const TENANT_OPTIONS = [{ value: "TTM_001", label: "OmVahana Fleet" }]

export const LoginScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { login } = useAuth()
  const toast = useToast()
  const driverLoginMutation = useDriverLogin()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
    tenant_code: "TTM_001",
  })

  const [errors, setErrors] = useState({ email: "", password: "", tenant_code: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [privacyError, setPrivacyError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [tenantPickerVisible, setTenantPickerVisible] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [loginResult, setLoginResult] = useState<any>(null)

  const selectedTenant = useMemo(
    () => TENANT_OPTIONS.find((tenant) => tenant.value === credentials.tenant_code),
    [credentials.tenant_code],
  )

  // Check if button should be disabled
  const isButtonDisabled = useMemo(() => {
    return (
      !credentials.email.trim() ||
      !credentials.password ||
      !credentials.tenant_code?.trim() ||
      !agreedToPrivacy
    )
  }, [credentials.email, credentials.password, credentials.tenant_code, agreedToPrivacy])

  // Load saved credentials if Remember Me was enabled
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("rememberedEmail")
        const savedTenant = await AsyncStorage.getItem("rememberedTenant")
        const savedRememberMe = await AsyncStorage.getItem("rememberMe")
        if (savedEmail && savedTenant && savedRememberMe === "true") {
          setCredentials((prev) => ({ ...prev, email: savedEmail, tenant_code: savedTenant }))
          setRememberMe(true)
        }
      } catch (error) {
        console.error("Failed to load saved credentials:", error)
      }
    }
    loadSavedCredentials()
  }, [])

  const validateForm = () => {
    let valid = true
    const newErrors = { email: "", password: "", tenant_code: "" }
    if (!credentials.tenant_code) {
      newErrors.tenant_code = "Tenant code is required"
      valid = false
    }

    if (!credentials.email) {
      newErrors.email = "Email is required"
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = "Email is invalid"
      valid = false
    }
    if (!credentials.password) {
      newErrors.password = "Password is required"
      valid = false
    } else if (credentials.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
      valid = false
    }
    setErrors(newErrors)
    return valid
  }

  const handleLogin = async () => {
    if (!validateForm()) {
      throw new Error("Please fix form errors")
    }
    if (!agreedToPrivacy) {
      setPrivacyError("You must agree to the Privacy Policy to continue")
      throw new Error("You must agree to the Privacy Policy to continue")
    }

    // Track login attempt
    await analyticsService.logLoginAttempt("email", credentials.tenant_code).catch(() => {})

    try {
      const result = await driverLoginMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
        tenant_code: credentials.tenant_code,
      })

      // Save email if Remember Me is enabled
      if (rememberMe) {
        await AsyncStorage.setItem("rememberedEmail", credentials.email)
        await AsyncStorage.setItem("rememberedTenant", credentials.tenant_code || "")
        await AsyncStorage.setItem("rememberMe", "true")
        await analyticsService.logRememberMeEnabled().catch(() => {})
      } else {
        await AsyncStorage.removeItem("rememberedEmail")
        await AsyncStorage.removeItem("rememberedTenant")
        await AsyncStorage.removeItem("rememberMe")
        await analyticsService.logRememberMeDisabled().catch(() => {})
      }

      await login(result)

      // Track login success
      await analyticsService.logLoginSuccess("email", credentials.tenant_code).catch(() => {})

      // Set driver properties for analytics
      const userId =
        (result as any)?.user?.id ||
        (result as any)?.id ||
        (result as any)?.driverProfile?.driver_id
      const vehicleId = (result as any)?.vehicleAssignment?.vehicle_info?.id
      const organizationId =
        (result as any)?.user?.organizationId || (result as any)?.organizationId
      if (userId) {
        await analyticsService
          .setDriverProperties(userId.toString(), vehicleId?.toString(), organizationId?.toString())
          .catch(() => {})
      }

      // Store login result for modal continue handler
      setLoginResult({ userId, result })

      // Show success modal instead of navigating immediately
      setShowSuccessModal(true)
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred"
      let errorCode: string | undefined

      if (error?.response?.status === 401) {
        errorMessage = "Invalid email or password"
        errorCode = "401"
      } else if (error?.response?.status === 403) {
        errorMessage = "Account access denied"
        errorCode = "403"
      } else if (error?.response?.status === 429) {
        errorMessage = "Too many login attempts. Please try again later"
        errorCode = "429"
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
        errorCode = String(error?.response?.status)
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      // Track login failure
      await analyticsService.logLoginFailure("email", errorCode, errorMessage).catch(() => {})

      toast.error(errorMessage, 4000)
      throw error // Re-throw to prevent AnimatedButton from showing success
    }
  }

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    toast.info(`Contact support to reset your password!`, 2000)
  }

  const _handleRegister = () => {
    // Navigate to register screen
  }

  const handleLoginSuccess = () => {
    // This function is kept for compatibility with AnimatedButton
    // Actual navigation happens in handleModalContinue
  }

  const handleModalContinue = async () => {
    if (!loginResult) {
      return
    }

    const { userId } = loginResult

    // Close modal first
    setShowSuccessModal(false)

    // Use requestAnimationFrame to ensure modal closes before navigation
    requestAnimationFrame(async () => {
      // Wait for modal animation to complete
      await new Promise((resolve) => setTimeout(resolve, 300))

      try {
        // Check if user has accepted privacy policy
        if (userId) {
          const hasAccepted = await settingsStorage.getPrivacyPolicyAccepted(userId)
          if (!hasAccepted) {
            // Navigate to privacy policy screen
            router.replace("/privacy-policy")
            return
          }
        }

        // Navigate to device scan if already accepted
        router.replace("/device-scan")
      } catch (error) {
        console.error("Navigation error:", error)
        // Fallback navigation
        if (userId) {
          const hasAccepted = await settingsStorage.getPrivacyPolicyAccepted(userId)
          router.replace(hasAccepted ? "/device-scan" : "/privacy-policy")
        }
      }
    })
  }

  // Debug: Check current language and translation

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        checkbox: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          borderColor: colors.textDim,
          borderRadius: 6,
          borderWidth: 2,
          height: 24,
          justifyContent: "center",
          marginRight: 12,
          marginTop: 2,
          width: 24,
        },
        checkboxChecked: {
          backgroundColor: colors.tint,
          borderColor: colors.tint,
        },
        checkboxContainer: {
          alignItems: "flex-start",
          flexDirection: "row",
        },
        checkmark: {
          color: colors.buttonPrimaryText,
          fontSize: 16,
          fontWeight: "bold",
        },
        container: {
          backgroundColor: colors.background,
          flex: 1,
        },
        dividerContainer: {
          alignItems: "center",
          flexDirection: "row",
          marginBottom: 32,
        },
        dividerLine: {
          backgroundColor: colors.border,
          flex: 1,
          height: 1,
        },
        dividerText: {
          color: colors.textDim,
          fontSize: 14,
          marginHorizontal: 16,
        },
        errorText: {
          color: colors.error,
          fontSize: 12,
          marginTop: 6,
        },
        eyeIcon: {
          marginLeft: 8,
          padding: 4,
        },
        eyeIconText: {
          fontSize: 20,
        },
        forgotContainer: {
          alignItems: "flex-end",
          marginBottom: 32,
        },
        forgotText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "500",
        },
        formContainer: {
          flex: 1,
        },
        header: {
          alignItems: "center",
          gap: 12,
          marginBottom: 48,
          marginTop: 60,
        },
        imageContainer: {
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        },
        inputError: {
          borderColor: colors.error,
        },
        inputGroup: {
          marginBottom: 24,
        },
        inputWrapper: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          flexDirection: "row",
          height: 60,
          paddingHorizontal: 20,
        },
        label: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
        },
        loginButton: {
          alignItems: "center",
          backgroundColor: colors.buttonPrimary,
          borderRadius: 16,
          elevation: 4,
          height: 60,
          justifyContent: "center",
          marginBottom: 32,
          shadowColor: `${colors.tint}66`,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        loginButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 18,
          fontWeight: "bold",
        },
        loginHeaderImage: {
          height: 72,
          marginBottom: 8,
          width: 72,
        },
        modalContent: {
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          paddingHorizontal: 24,
          paddingVertical: 28,
          width: "100%",
        },
        modalDivider: {
          backgroundColor: colors.border,
          height: StyleSheet.hairlineWidth,
          marginBottom: 12,
          opacity: 0.6,
        },
        modalOption: {
          alignItems: "center",
          borderRadius: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        modalOptionActive: {
          backgroundColor: `${colors.tint}1A`,
        },
        modalOptionCheck: {
          color: colors.tint,
          fontSize: 16,
          fontWeight: "700",
        },
        modalOptionLabel: {
          color: colors.text,
          fontSize: 16,
        },
        modalOptionLabelActive: {
          color: colors.tint,
          fontWeight: "600",
        },
        modalOverlay: {
          alignItems: "center",
          backgroundColor: `${colors.palette.neutral900}73`,
          flex: 1,
          justifyContent: "center",
          padding: 24,
        },
        modalTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
        },
        privacyContainer: {
          marginBottom: 16,
        },
        privacyLink: {
          color: colors.tint,
          fontWeight: "600",
          textDecorationLine: "underline",
        },
        privacyText: {
          color: colors.text,
          fontSize: 14,
          lineHeight: 20,
        },
        privacyTextContainer: {
          flex: 1,
        },
        rememberMeContainer: {
          marginBottom: 16,
        },
        rememberMeText: {
          color: colors.text,
          fontSize: 14,
        },
        safeArea: {
          backgroundColor: colors.background,
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          paddingBottom: 96,
          paddingHorizontal: 24,
        },
        signupContainer: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        },
        signupLink: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "bold",
        },
        signupText: {
          color: colors.textDim,
          fontSize: 14,
        },
        socialButton: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 20,
          height: 80,
          justifyContent: "center",
          width: 80,
        },
        socialContainer: {
          flexDirection: "row",
          gap: 20,
          justifyContent: "center",
          marginBottom: 32,
        },
        socialEmoji: {
          fontSize: 32,
        },
        socialIcon: {
          alignItems: "center",
          justifyContent: "center",
        },
        tenantChevron: {
          color: colors.textDim,
          fontSize: 18,
        },
        tenantContent: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
        },
        tenantSelectedText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
        },
        tenantWrapper: {
          justifyContent: "center",
        },
        textInput: {
          color: colors.text,
          flex: 1,
          fontSize: 16,
        },
        welcomeSubtitle: {
          color: colors.textDim,
          fontSize: 16,
          textAlign: "center",
        },
        welcomeTitle: {
          color: colors.text,
          fontSize: 32,
          fontWeight: "bold",
          lineHeight: 35,
          textAlign: "center",
        },
      }),
    [colors],
  )

  const logoSource = useMemo(() => {
    return isDark
      ? require("assets/images/ttm-white-logo-border.png")
      : require("assets/images/ttm-logo.png")
  }, [isDark])
  // Lottie animations (import your own JSON files or use existing ones)
  return (
    <SafeAreaView style={[styles.safeArea, styles.scrollContent]}>
      <StatusBar
        animated={true}
        backgroundColor={colors.background}
        showHideTransition="fade"
        hidden={false}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={logoSource} style={styles.loginHeaderImage} resizeMode="contain" />
          <Text style={styles.welcomeTitle}>{translate("login.welcomeTitle" as any)}</Text>
          <Text style={styles.welcomeSubtitle}>{translate("login.welcomeSubtitle" as any)}</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{translate("login.tenant" as any)}</Text>
            <Pressable
              style={[
                styles.inputWrapper,
                styles.tenantWrapper,
                errors.tenant_code && styles.inputError,
              ]}
              onPress={() => setTenantPickerVisible(true)}
            >
              <View style={styles.tenantContent}>
                <Text style={styles.tenantSelectedText}>
                  {selectedTenant?.label ||
                    credentials.tenant_code ||
                    translate("login.selectTenant" as any)}
                </Text>
                <Text style={styles.tenantChevron}>▾</Text>
              </View>
            </Pressable>
            {!!errors.tenant_code && <Text style={styles.errorText}>{errors.tenant_code}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                placeholderTextColor={colors.textDim}
                value={credentials.email}
                onChangeText={(text) => {
                  setCredentials((p) => ({ ...p, email: text }))
                  setErrors((p) => ({ ...p, email: "" }))
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{translate("login.password" as any)}</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor={colors.textDim}
                value={credentials.password}
                onChangeText={(text) => {
                  setCredentials((p) => ({ ...p, password: text }))
                  setErrors((p) => ({ ...p, password: "" }))
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? "👁️" : "🔒"}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Remember Me */}
          <View style={styles.rememberMeContainer}>
            <Pressable style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </Pressable>
          </View>

          {/* Privacy Policy Agreement */}
          <View style={styles.privacyContainer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => {
                setAgreedToPrivacy(!agreedToPrivacy)
                setPrivacyError("")
              }}
            >
              <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacyText}>
                  I agree to the{" "}
                  <Text
                    style={styles.privacyLink}
                    onPress={(e) => {
                      e.stopPropagation()
                      Linking.openURL("https://ttmkonnect.com/privacy")
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
            title={driverLoginMutation.isPending ? "Logging in…" : "Login now"}
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
      </KeyboardAvoidingView>

      <Modal
        visible={tenantPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTenantPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTenantPickerVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choose tenant</Text>
            <View style={styles.modalDivider} />
            {TENANT_OPTIONS.map((tenant) => {
              const isActive = tenant.value === credentials.tenant_code
              return (
                <Pressable
                  key={tenant.value}
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                  onPress={() => {
                    setCredentials((prev) => ({ ...prev, tenant_code: tenant.value }))
                    setErrors((prev) => ({ ...prev, tenant_code: "" }))
                    setTenantPickerVisible(false)
                  }}
                >
                  <Text
                    style={[styles.modalOptionLabel, isActive && styles.modalOptionLabelActive]}
                  >
                    {tenant.label}
                  </Text>
                  {isActive && <Text style={styles.modalOptionCheck}>✓</Text>}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <LoginSuccessModal visible={showSuccessModal} onContinue={handleModalContinue} />
    </SafeAreaView>
  )
}
