import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '@/theme/context'
import { Text } from '@/components/Text'
import Pdf from 'react-native-pdf'
import { Asset } from 'expo-asset'
import { translate } from '@/i18n/translate'
import { useToast } from '@/providers/ToastProvider'
import { useAuth } from '@/stores/authStore'
import { settingsStorage } from '@/utils/storage'
import { submitPrivacyPolicyAcceptance } from '@/api/submissions'

export const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const colors = theme.colors
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUri, setPdfUri] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numberOfPages, setNumberOfPages] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)

  // Load PDF on mount
  useEffect(() => {
    loadPdf()
  }, [])

  const loadPdf = async () => {
    setLoading(true)
    setError(null)
    setPdfUri(null)

    try {
      const pdfAsset = require('assets/files/pdf/TTM_Konnect_Beta_Testing_Agreement.pdf')
      const asset = Asset.fromModule(pdfAsset)
      await asset.downloadAsync()

      if (asset.localUri) {
        setPdfUri(asset.localUri)
      } else if (asset.uri) {
        setPdfUri(asset.uri)
      } else {
        throw new Error('Could not resolve PDF URI')
      }

      setLoading(false)
    } catch (err) {
      console.error('Error preparing PDF:', err)
      setError('Failed to load PDF. Please try again.')
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
    setError('Failed to load PDF. Please try again.')
    console.error('PDF Error:', error)
  }

  const handleSubmit = async () => {
    if (!user || !canSubmit || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      // Get user name from firstName and lastName
      const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()

      // Submit to API
      await submitPrivacyPolicyAcceptance({
        userId: user.id,
        email: user.email,
        name: userName,
      })

      // Store acceptance locally
      await settingsStorage.setPrivacyPolicyAccepted(user.id)

      // Show success message
      toast.success('Privacy policy accepted successfully!', 2000)

      // Navigate to device scan screen
      router.replace('/device-scan')
    } catch (error: any) {
      console.error('Error submitting privacy policy acceptance:', error)
      toast.error(
        error.message || translate('privacyPolicy.error' as any),
        4000
      )
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    // Prevent going back - user must accept privacy policy
    toast.info('Please accept the privacy policy to continue', 2000)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {translate('privacyPolicy.title' as any)}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.pdfContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textDim }]}>
              {translate('privacyPolicy.loading' as any)}
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
              <Text style={styles.retryButtonText}>{translate('common.retry' as any)}</Text>
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
                  {translate('privacyPolicy.scrollToBottom' as any)}
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
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              {
                backgroundColor: isSubmitting ? colors.textDim : colors.tint,
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {translate('privacyPolicy.submitButton' as any)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  pdfContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollHint: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scrollHintText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  pageIndicator: {
    fontSize: 12,
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})

