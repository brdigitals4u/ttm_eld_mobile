import React, { useState, useMemo } from "react"
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { Asset } from "expo-asset"
import { router } from "expo-router"
import { ArrowLeft, FileText, BookOpen, FileCheck, HelpCircle } from "lucide-react-native"
import Pdf from "react-native-pdf"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

interface PdfOptionBase {
  id: string
  title: string
  asset: any // require() asset
}

interface PdfOption extends PdfOptionBase {
  iconComponent: React.ComponentType<{ size?: number; color?: string }>
}

// PDF options configuration
// Local PDF files from assets/files/pdf
const PDF_OPTIONS_DATA: PdfOptionBase[] = [
  {
    id: "ttm-konnect-manual",
    title: "TTM Konnect Manual",
    asset: require("assets/files/pdf/Manual.pdf"),
  },
  {
    id: "dot-instruction-eng",
    title: "DOT Instruction Sheet (English)",
    asset: require("assets/files/pdf/DOTEnglish.pdf"),
  },
  {
    id: "dot-instruction-spanish",
    title: "DOT Instruction Sheet (Spanish)",
    asset: require("assets/files/pdf/DOTSpanish.pdf"),
  },
  {
    id: "manual-spanish",
    title: "TTM Konnect Manual (Spanish)",
    asset: require("assets/files/pdf/ManualSpanish.pdf"),
  },
]

const PDF_ICONS = [BookOpen, FileText, FileCheck, HelpCircle]

export const ManualPdfViewerScreen: React.FC = () => {
  const { theme, themeContext } = useAppTheme()
  const isDark = themeContext === "dark"
  const colors = theme.colors
  const insets = useSafeAreaInsets()
  const [selectedPdf, setSelectedPdf] = useState<PdfOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUri, setPdfUri] = useState<string | null>(null)

  // Create PDF options with icons
  const PDF_OPTIONS: PdfOption[] = useMemo(() => {
    return PDF_OPTIONS_DATA.map((option, index) => ({
      ...option,
      iconComponent: PDF_ICONS[index],
    }))
  }, [])

  const handlePdfSelect = async (pdf: PdfOption) => {
    setSelectedPdf(pdf)
    setLoading(true)
    setError(null)
    setPdfUri(null)

    try {
      // Find the corresponding asset from PDF_OPTIONS_DATA
      const pdfData = PDF_OPTIONS_DATA.find((p) => p.id === pdf.id)
      if (!pdfData) {
        throw new Error("PDF asset not found")
      }

      // Create Asset instance from require()
      const asset = Asset.fromModule(pdfData.asset)

      // Download the asset if needed (this handles both iOS and Android)
      await asset.downloadAsync()

      // Use the local URI for the PDF viewer
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

  const handleBack = () => {
    if (selectedPdf) {
      setSelectedPdf(null)
      setError(null)
    } else {
      router.back()
    }
  }

  const handleLoadComplete = (numberOfPages: number) => {
    setLoading(false)
    console.log(`PDF loaded: ${numberOfPages} pages`)
  }

  const handleError = (error: any) => {
    setLoading(false)
    setError("Failed to load PDF. Please try again.")
    console.error("PDF Error:", error)
    Alert.alert("Error", "Failed to load PDF. Please try again.")
  }

  const handlePageChanged = (page: number, numberOfPages: number) => {
    console.log(`Page ${page} of ${numberOfPages}`)
  }

  if (selectedPdf) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {selectedPdf.title}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.pdfContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textDim }]}>Loading PDF...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                onPress={() => handlePdfSelect(selectedPdf)}
                style={[styles.retryButton, { backgroundColor: colors.tint }]}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!error && selectedPdf && pdfUri && (
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
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Driver Manuals</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.optionsGrid}>
          {PDF_OPTIONS.map((pdf) => {
            const IconComponent = pdf.iconComponent
            return (
              <TouchableOpacity
                key={pdf.id}
                style={[
                  styles.pdfOptionCard,
                  {
                    backgroundColor: isDark ? colors.cardBackground : "#FFFFFF",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : colors.border,
                  },
                ]}
                onPress={() => handlePdfSelect(pdf)}
                activeOpacity={0.7}
              >
                <View style={styles.pdfOptionIcon}>
                  <IconComponent size={24} color={colors.tint} />
                </View>
                <Text style={[styles.pdfOptionTitle, { color: colors.text }]}>{pdf.title}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: -8,
    padding: 8,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
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
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
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
  optionsGrid: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  pdf: {
    flex: 1,
    width: "100%",
  },
  pdfContainer: {
    flex: 1,
  },
  pdfOptionCard: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    justifyContent: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: "48%",
  },
  pdfOptionIcon: {
    marginBottom: 12,
  },
  pdfOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
