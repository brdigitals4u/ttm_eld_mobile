import { useState, useEffect, useMemo } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native"
import { Asset } from "expo-asset"
import { router } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import Pdf from "react-native-pdf"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useToast } from "@/providers/ToastProvider"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { settingsStorage } from "@/utils/storage"

export const LocationConsentScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const colors = theme.colors
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { user, logout } = useAuth()

  // Selection screen state
  const [selectedOption, setSelectedOption] = useState<"terms" | "privacy" | null>(null)

  // PDF viewer state (only used when selectedOption === "terms")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUri, setPdfUri] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numberOfPages, setNumberOfPages] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)

  // Load PDF only when Terms option is selected
  useEffect(() => {
    if (selectedOption === "terms") {
      loadPdf()
    }
  }, [selectedOption])

  const loadPdf = async () => {
    setLoading(true)
    setError(null)
    setPdfUri(null)

    try {
      const pdfAsset = require("assets/files/pdf/TTM_Konnect_Beta_Testing_Agreement.pdf")
      const asset = Asset.fromModule(pdfAsset)
      await asset.downloadAsync()

      if (asset.localUri) {
        setPdfUri(asset.localUri)
      } else if (asset.uri) {
        setPdfUri(asset.uri)
      } else {
        throw new Error("Could not resolve PDF URI")
      }

      setLoading(false)
    } catch (err) {
      console.error("Error preparing PDF:", err)
      setError("Failed to load PDF. Please try again.")
      setLoading(false)
    }
  }

  const handleLoadComplete = (totalPages: number) => {
    setLoading(false)
    setNumberOfPages(totalPages)
    console.log(`PDF loaded: ${totalPages} pages`)
  }

  const handlePageChanged = (page: number, totalPages: number) => {
    setCurrentPage(page)
    setNumberOfPages(totalPages)
    // Enable submit button when user reaches the last page
    setCanSubmit(page === totalPages)
  }

  const handleError = (error: any) => {
    setLoading(false)
    setError("Failed to load PDF. Please try again.")
    console.error("PDF Error:", error)
  }

  const handleAllow = async () => {
    if (!user?.id) {
      toast.error("User not found. Please login again.")
      return
    }

    if (isSubmitting) {
      return // Prevent multiple clicks
    }

    setIsSubmitting(true)
    try {
      // Store that disclosure was shown and user accepted
      await settingsStorage.setLocationConsentShown(user.id)
      await settingsStorage.setLocationDisclosureAccepted(user.id)
      
      // Navigate to permissions screen - permissions will be requested there
      router.replace("/permissions")
    } catch (error) {
      console.error("Error saving location consent:", error)
      toast.error("Failed to save preference. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotNow = async () => {
    if (!user?.id) {
      toast.error("User not found. Please login again.")
      return
    }

    if (isSubmitting) {
      return // Prevent multiple clicks
    }

    setIsSubmitting(true)
    try {
      // Store that disclosure was shown but declined
      await settingsStorage.setLocationConsentShown(user.id)
      await settingsStorage.setLocationDisclosureDeclined(user.id)
      
      // Show warning toast
      toast.warning(
        translate("locationConsent.notNowWarning" as any) ||
          "Location access is required for ELD compliance. Without location permissions, you will not be able to use the app for FMCSA-compliant logging.",
      )
      
      // Navigate to permissions screen (skip location, request others)
      router.replace("/permissions")
    } catch (error) {
      console.error("Error handling Not Now:", error)
      toast.error("Failed to save preference. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = async () => {
    if (selectedOption === "terms") {
      // If viewing PDF, go back to selection screen
      setSelectedOption(null)
      setPdfUri(null)
      setError(null)
      setCanSubmit(false)
      return
    }

    // If on selection screen, logout user
    try {
      await logout()
      router.replace("/login")
    } catch (error) {
      console.error("Error during logout:", error)
      toast.error("Failed to logout. Please try again.")
    }
  }


  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: 20,
          paddingHorizontal: 20,
        },
        backButton: {
          marginLeft: -8,
          padding: 8,
        },
        headerTitle: {
          flex: 1,
          fontSize: 20,
          fontWeight: "700",
          textAlign: "center",
        },
        headerPlaceholder: {
          width: 40,
        },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
        },
        subtitle: {
          color: colors.text,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 32,
          textAlign: "center",
        },
        card: {
          backgroundColor: colors.sectionBackground,
          borderRadius: 16,
          marginBottom: 16,
          padding: 20,
        },
        cardContent: {
          flex: 1,
          marginRight: 12,
        },
        cardTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 8,
        },
        cardDescription: {
          color: colors.textDim,
          fontSize: 14,
          lineHeight: 20,
        },
        cardRow: {
          alignItems: "center",
          flexDirection: "row",
        },
        checkboxContainer: {
          alignItems: "center",
          justifyContent: "center",
        },
        footer: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 32,
          paddingHorizontal: 24,
          paddingTop: 20,
        },
        continueButton: {
          alignItems: "center",
          backgroundColor: colors.buttonPrimary,
          borderRadius: 16,
          elevation: 4,
          justifyContent: "center",
          minHeight: 56,
          paddingHorizontal: 32,
          paddingVertical: 16,
          shadowColor: `${colors.tint}66`,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        continueButtonDisabled: {
          backgroundColor: colors.textDim,
          opacity: 0.6,
        },
        continueButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 18,
          fontWeight: "bold",
        },
        notNowButton: {
          alignItems: "center",
          backgroundColor: "transparent" as const,
          borderRadius: 16,
          justifyContent: "center",
          marginTop: 12,
          minHeight: 56,
          paddingHorizontal: 32,
          paddingVertical: 16,
        },
        notNowButtonText: {
          color: colors.textDim,
          fontSize: 16,
          fontWeight: "600",
        },
        // PDF viewer styles (when selectedOption === "terms")
        pdfContainer: {
          flex: 1,
        },
        loadingContainer: {
          alignItems: "center",
          backgroundColor: colors.background + "E6", // 90% opacity
          bottom: 0,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        },
        loadingText: {
          fontSize: 16,
          marginTop: 12,
        },
        errorContainer: {
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          padding: 20,
        },
        errorText: {
          fontSize: 16,
          marginBottom: 20,
          textAlign: "center",
        },
        retryButton: {
          borderRadius: 8,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        retryButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 16,
          fontWeight: "600",
        },
        pdf: {
          flex: 1,
          width: "100%",
        },
        scrollHint: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground + "E6", // 90% opacity
          bottom: 80,
          left: 0,
          paddingHorizontal: 20,
          paddingVertical: 12,
          position: "absolute",
          right: 0,
        },
        scrollHintText: {
          fontSize: 14,
          marginBottom: 4,
          textAlign: "center",
        },
        pageIndicator: {
          fontSize: 12,
        },
        submitContainer: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          marginBottom: 120,
          paddingHorizontal: 20,
          paddingVertical: 16,
        },
        submitButton: {
          alignItems: "center",
          borderRadius: 12,
          justifyContent: "center",
          minHeight: 52,
          paddingHorizontal: 24,
          paddingVertical: 16,
        },
        submitButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 16,
          fontWeight: "700",
        },
      }),
    [colors],
  )

  // Show PDF viewer when Terms option is selected
  if (selectedOption === "terms") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Terms of Service
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.pdfContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textDim }]}>
                {translate("privacyPolicy.loading" as any)}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                onPress={loadPdf}
                style={[styles.retryButton, { backgroundColor: colors.tint }]}
              >
                <Text style={styles.retryButtonText}>{translate("common.retry" as any)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!error && pdfUri && (
            <>
              <Pdf
                source={{ uri: pdfUri, cache: true }}
                onLoadComplete={handleLoadComplete}
                onPageChanged={handlePageChanged}
                onError={handleError}
                style={styles.pdf}
                enablePaging
                fitPolicy={0}
                trustAllCerts={false}
              />
              {!canSubmit && numberOfPages > 0 && (
                <View style={styles.scrollHint}>
                  <Text style={[styles.scrollHintText, { color: colors.textDim }]}>
                    {translate("privacyPolicy.scrollToBottom" as any)}
                  </Text>
                  <Text style={[styles.pageIndicator, { color: colors.textDim }]}>
                    {currentPage} / {numberOfPages}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {canSubmit && (
          <View style={[styles.submitContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => {
                // Close PDF viewer and return to selection screen
                setCanSubmit(false)
                setSelectedOption(null)
              }}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    )
  }

  // Main selection screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          📍 Location Access Required for FMCSA Compliance
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {translate("locationConsent.subtitle" as any) ||
            "This app collects your precise location, including in the background, to comply with FMCSA ELD regulations"}
        </Text>

        {/* Why We Need Your Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {translate("locationConsent.whyNeeded" as any) || "Why We Need Your Location"}
          </Text>
          <Text style={styles.cardDescription}>
            {translate("locationConsent.whyNeededText" as any) ||
              "Federal Motor Carrier Safety Administration (FMCSA) regulations require Electronic Logging Devices (ELD) to automatically record vehicle location data to ensure accurate Hours of Service (HOS) compliance."}
          </Text>
        </View>

        {/* What Location Data We Collect */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {translate("locationConsent.whatWeCollect" as any) || "What Location Data We Collect"}
          </Text>
          <Text style={styles.cardDescription}>
            {translate("locationConsent.whatWeCollectText" as any) ||
              "• Precise GPS coordinates (latitude and longitude)\n• Timestamp for each location point\n• Vehicle movement and motion detection\n• Continuous tracking while driving, even when the app is closed"}
          </Text>
        </View>

        {/* How We Use Your Location Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {translate("locationConsent.howWeUse" as any) || "How We Use Your Location Data"}
          </Text>
          <Text style={styles.cardDescription}>
            {translate("locationConsent.howWeUseText" as any) ||
              "• Record driver duty status changes\n• Generate FMCSA-required electronic logs\n• Detect vehicle movement and driving time\n• Synchronize with ELD hardware devices\n• Ensure compliance with FMCSA 49 CFR §395 regulations\n• Provide accurate HOS calculations"}
          </Text>
        </View>

        {/* Data Sharing & Privacy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {translate("locationConsent.dataSharing" as any) || "Data Sharing & Privacy"}
          </Text>
          <Text style={styles.cardDescription}>
            {translate("locationConsent.dataSharingText" as any) ||
              "Your location data is used solely for ELD compliance and is not shared with third parties except as required by FMCSA regulations or during FMCSA audits. We do not use your location for advertising or marketing purposes."}
          </Text>
        </View>

        {/* Data Retention */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {translate("locationConsent.retention" as any) || "Data Retention"}
          </Text>
          <Text style={styles.cardDescription}>
            {translate("locationConsent.retentionText" as any) ||
              "Location data is retained for a minimum of 6 months as required by FMCSA regulations, and may be retained longer for compliance and audit purposes."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleAllow}
          disabled={isSubmitting}
          style={[styles.continueButton, isSubmitting && styles.continueButtonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={styles.continueButtonText}>
              {translate("locationConsent.allowButton" as any) || "Allow & Continue"}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleNotNow}
          disabled={isSubmitting}
          style={[styles.notNowButton, isSubmitting && styles.continueButtonDisabled]}
        >
          <Text style={styles.notNowButtonText}>
            {translate("locationConsent.notNowButton" as any) || "Not Now"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
