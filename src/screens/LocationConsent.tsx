import React, { useState, useEffect, useMemo } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Linking,
} from "react-native"
import { Asset } from "expo-asset"
import { router } from "expo-router"
import { ArrowLeft, CheckCircle, ChevronRight } from "lucide-react-native"
import Pdf from "react-native-pdf"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { submitPrivacyPolicyAcceptance } from "@/api/submissions"
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
  const [termsAccepted, setTermsAccepted] = useState(true) // Checked by default
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

  const handleSubmit = async () => {
    router.replace("/permissions")
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

  const handleTermsTap = () => {
    setSelectedOption("terms")
  }

  const handlePrivacyTap = async () => {
    try {
      const url = "https://ttmkonnect.com/privacy"
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        toast.error("Unable to open privacy policy URL")
      }
    } catch (error) {
      console.error("Error opening privacy policy URL:", error)
      toast.error("Failed to open privacy policy. Please try again.")
    }
  }

  const handleTermsCheckboxToggle = () => {
    setTermsAccepted(!termsAccepted)
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
        // PDF viewer styles (when selectedOption === "terms")
        pdfContainer: {
          flex: 1,
        },
        loadingContainer: {
          alignItems: "center",
          backgroundColor: `${colors.palette.neutral900}1A`,
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
          backgroundColor: `${colors.palette.neutral900}B3`,
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
                setTermsAccepted(true)
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
          This app collects your precise location, including in the background, to comply with FMCSA
          ELD regulations
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}> Location data is used to:</Text>
              <Text style={styles.cardDescription}>
                Record driver duty status Map vehicle movement, mileage & driving time Synchronize
                with engine ELD devices Generate FMCSA-required electronic logs, even
                when the app is closed or not in use. Your location data is only used for ELD
                compliance and is not shared with third parties except as required by FMCSA
                regulations.
              </Text>
            </View>
            <ChevronRight size={24} color={colors.textDim} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!termsAccepted || isSubmitting}
          style={[
            styles.continueButton,
            (!termsAccepted || isSubmitting) && styles.continueButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Text style={styles.continueButtonText}>Allow & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
