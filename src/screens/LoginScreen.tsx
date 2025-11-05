import React, { useState, useMemo, useEffect } from "react"
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
} from "react-native"
import { router } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { useDriverLogin } from "@/api/organization"
import { AnimatedButton } from "@/components/AnimatedButton"
import { Text } from "@/components/Text"
import { COLORS } from "@/constants/colors"
import { LoginCredentials } from "@/database/schemas"
import { useToast } from "@/providers/ToastProvider"
import { useAuth } from "@/stores/authStore"

export const LoginScreen: React.FC = () => {
  const { login } = useAuth()
  const toast = useToast()
  const driverLoginMutation = useDriverLogin()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  })

  const [errors, setErrors] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [privacyError, setPrivacyError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  // Check if button should be disabled
  const isButtonDisabled = useMemo(() => {
    return !credentials.email.trim() || !credentials.password || !agreedToPrivacy
  }, [credentials.email, credentials.password, agreedToPrivacy])

  // Load saved credentials if Remember Me was enabled
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("rememberedEmail")
        const savedRememberMe = await AsyncStorage.getItem("rememberMe")
        if (savedEmail && savedRememberMe === "true") {
          setCredentials((prev) => ({ ...prev, email: savedEmail }))
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
    const newErrors = { email: "", password: "" }

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
    try {
      const result = await driverLoginMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
      })

      // Save email if Remember Me is enabled
      if (rememberMe) {
        await AsyncStorage.setItem("rememberedEmail", credentials.email)
        await AsyncStorage.setItem("rememberMe", "true")
      } else {
        await AsyncStorage.removeItem("rememberedEmail")
        await AsyncStorage.removeItem("rememberMe")
      }

      await login(result)
      toast.success("Login successful!", 2000)
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred"
      if (error?.response?.status === 401) errorMessage = "Invalid email or password"
      else if (error?.response?.status === 403) errorMessage = "Account access denied"
      else if (error?.response?.status === 429)
        errorMessage = "Too many login attempts. Please try again later"
      else if (error?.response?.data?.message) errorMessage = error.response.data.message
      else if (error?.message) errorMessage = error.message
      else if (typeof error === "string") errorMessage = error
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
    router.replace("/device-scan")
  }

  // Lottie animations (import your own JSON files or use existing ones)
  const loadingAnimation = require("assets/animations/loading.json")
  const successAnimation = require("assets/animations/success.json")

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              source={require("assets/images/trident_logo.png")}
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
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor={COLORS.ink300}
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  /* Header */
  header: {
    marginBottom: 48,
    marginTop: 48,
  },
  welcomeTitle: {
    color: COLORS.black,
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 35,
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeSubtitle: {
    color: COLORS.ink500,
    fontSize: 16,
    textAlign: "center",
  },

  /* Form */
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputWrapper: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    height: 60,
    paddingHorizontal: 20,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  textInput: {
    color: COLORS.ink700,
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    marginLeft: 8,
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
  },

  /* Remember Me */
  rememberMeContainer: {
    marginBottom: 16,
  },
  rememberMeText: {
    color: COLORS.ink700,
    fontSize: 14,
  },

  /* Privacy Policy */
  privacyContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.ink300,
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyText: {
    color: COLORS.ink700,
    fontSize: 14,
    lineHeight: 20,
  },
  privacyLink: {
    color: COLORS.indigo,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  /* Forgot Password */
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 32,
  },
  forgotText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "500",
  },

  /* Login Button */
  loginButton: {
    alignItems: "center",
    backgroundColor: COLORS.indigo,
    borderRadius: 16,
    elevation: 4,
    height: 60,
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },

  /* Divider */
  dividerContainer: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 32,
  },
  dividerLine: {
    backgroundColor: COLORS.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: COLORS.ink500,
    fontSize: 14,
    marginHorizontal: 16,
  },

  /* Social Login */
  socialContainer: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
    marginBottom: 32,
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  socialIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  socialEmoji: {
    fontSize: 32,
  },

  /* Sign Up */
  signupContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    color: COLORS.ink500,
    fontSize: 14,
  },
  signupLink: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  loginHeaderImage: {
    height: 140,
    marginBottom: 20,
    width: "100%",
  },
})
