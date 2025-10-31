import React, { useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { router, Stack } from "expo-router"
import { ArrowLeft, Camera, ThumbsUp, X } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { toast } from "@/components/Toast"
import { useAppTheme } from "@/theme/context"
import { Header } from "@/components/Header"

type InspectionType = "pre-trip" | "post-trip"
type SafetyStatus = "safe" | "unsafe" | null

interface PhotoSlot {
  id: string
  label: string
  taken: boolean
}

export default function DVIRScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const [inspectionType, setInspectionType] = useState<InspectionType>("pre-trip")
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>(null)
  const [showCertifyModal, setShowCertifyModal] = useState(false)

  const [vehiclePhotos, setVehiclePhotos] = useState<PhotoSlot[]>([
    { id: "driver-side", label: "Driver Side", taken: false },
    { id: "front", label: "Front", taken: false },
    { id: "passenger-side", label: "Passenger Side", taken: true },
    { id: "back", label: "Back", taken: false },
  ])

  const [trailerPhotos, setTrailerPhotos] = useState<PhotoSlot[]>([
    { id: "trailer-back", label: "Trailer Back", taken: false },
    { id: "trailer-left", label: "Trailer Left", taken: false },
    { id: "trailer-right", label: "Trailer Right", taken: false },
  ])

  const handlePhotoPress = (photoId: string, isTrailer: boolean = false) => {
    const photos = isTrailer ? trailerPhotos : vehiclePhotos
    const setPhotos = isTrailer ? setTrailerPhotos : setVehiclePhotos

    const updatedPhotos = photos.map((photo) =>
      photo.id === photoId ? { ...photo, taken: !photo.taken } : photo,
    )
    setPhotos(updatedPhotos)
  }

  const handleNext = () => {
    if (safetyStatus === null) {
      toast.warning("Please choose a safety status before proceeding.")
      return
    }

    if (safetyStatus === "safe") {
      setShowCertifyModal(true)
    } else {
      toast.warning("Please address all safety issues before proceeding.")
    }
  }

  const handleCertifyAndSubmit = () => {
    setShowCertifyModal(false)
    toast.success("Your Driver Vehicle Inspection Report has been submitted successfully.")
    setTimeout(() => {
      router.back()
    }, 1500)
  }

  const renderPhotoGrid = (photos: PhotoSlot[], isTrailer: boolean = false) => (
    <View style={styles.photoGrid}>
      {photos.map((photo) => (
        <TouchableOpacity
          key={photo.id}
          style={[styles.photoSlot, { borderColor: photo.taken ? colors.tint : colors.border }]}
          onPress={() => handlePhotoPress(photo.id, isTrailer)}
        >
          <Camera size={24} color={photo.taken ? colors.tint : colors.textDim} />
          <Text style={[styles.photoLabel, { color: photo.taken ? colors.tint : colors.textDim }]}>
            {photo.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <>
      <View style={{ flex: 1 }}>
        <Header
          title="Create DVIR"
          titleMode="center"
          backgroundColor={colors.background}
          titleStyle={{
            fontSize: 22,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: 0.3,
          }}
          leftIcon="back"
          leftIconColor={colors.tint}
          onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
          RightActionComponent={
            <View style={{ paddingRight: 4 }}>
              <X size={24} color={colors.text} />
            </View>
          }
          containerStyle={{
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            shadowColor: colors.tint,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
          style={{
            paddingHorizontal: 16,
          }}
          safeAreaEdges={["top"]}
        />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Inspection Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              inspectionType === "pre-trip" && styles.toggleButtonActive,
              { borderColor: colors.tint },
            ]}
            onPress={() => setInspectionType("pre-trip")}
          >
            <Text
              style={[
                styles.toggleText,
                { color: inspectionType === "pre-trip" ? colors.tint : colors.textDim },
              ]}
            >
              Pre-Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              inspectionType === "post-trip" && styles.toggleButtonActive,
              { borderColor: colors.tint },
            ]}
            onPress={() => setInspectionType("post-trip")}
          >
            <Text
              style={[
                styles.toggleText,
                { color: inspectionType === "post-trip" ? colors.tint : colors.textDim },
              ]}
            >
              Post-Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Photos Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Take walkaround photos</Text>
          {renderPhotoGrid(vehiclePhotos)}
        </View>

        {/* Trailer Photos Section */}
        <View style={styles.section}>{renderPhotoGrid(trailerPhotos, true)}</View>

        {/* Vehicle Defects Section */}
        <ElevatedCard style={styles.defectsCard}>
          <Text style={[styles.defectsTitle, { color: colors.text }]}>Add new vehicle defects</Text>
          <Text style={[styles.defectsSubtitle, { color: colors.textDim }]}>
            Any vehicle attributes not displayed are certified safe by the driver
          </Text>

          <TouchableOpacity
            style={[styles.addDefectsButton, { borderColor: colors.tint }]}
            onPress={() => toast.warning("Defects management would be implemented here")}
          >
            <Text style={[styles.addDefectsText, { color: colors.tint }]}>Add defects</Text>
          </TouchableOpacity>
        </ElevatedCard>

        {/* Trailer Defects Section */}
        <ElevatedCard style={styles.defectsCard}>
          <Text style={[styles.defectsTitle, { color: colors.text }]}>Add new trailer defects</Text>
          <Text style={[styles.defectsSubtitle, { color: colors.textDim }]}>
            Any trailer attributes not displayed are certified safe by the driver
          </Text>

          <TouchableOpacity
            style={[styles.addDefectsButton, { borderColor: colors.tint }]}
            onPress={() => toast.warning("Defects management would be implemented here")}
          >
            <Text style={[styles.addDefectsText, { color: colors.tint }]}>Add defects</Text>
          </TouchableOpacity>
        </ElevatedCard>

        {/* Safety Status Section */}
        <ElevatedCard style={[styles.safetyCard, { borderColor: "#FF6B6B", borderWidth: 2 }]}>
          <Text style={[styles.safetyTitle, { color: colors.text }]}>Choose safety status</Text>
          <Text style={[styles.safetyRequired, { color: "#FF6B6B" }]}>Required</Text>

          <View style={styles.safetyButtons}>
            <TouchableOpacity
              style={[
                styles.safetyButton,
                safetyStatus === "safe" && styles.safetyButtonActive,
                { borderColor: colors.border },
              ]}
              onPress={() => setSafetyStatus("safe")}
            >
              <Text
                style={[
                  styles.safetyButtonText,
                  { color: safetyStatus === "safe" ? colors.tint : colors.text },
                ]}
              >
                Safe to drive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.safetyButton,
                safetyStatus === "unsafe" && [
                  styles.safetyButtonActive,
                  { backgroundColor: "#FFE5E5" },
                ],
                { borderColor: safetyStatus === "unsafe" ? "#FF6B6B" : colors.border },
              ]}
              onPress={() => setSafetyStatus("unsafe")}
            >
              <Text
                style={[
                  styles.safetyButtonText,
                  { color: safetyStatus === "unsafe" ? "#FF6B6B" : colors.text },
                ]}
              >
                Unsafe
              </Text>
            </TouchableOpacity>
          </View>
        </ElevatedCard>

        <LoadingButton title="Next" onPress={handleNext} fullWidth style={styles.nextButton} />
      </ScrollView>

      {/* Certify Modal */}
      <Modal
        visible={showCertifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCertifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCertifyModal(false)}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: colors.text }]}>Certify DVIR</Text>

            <View style={styles.modalIcon}>
              <ThumbsUp size={48} color="#4CAF50" />
            </View>

            <Text style={[styles.modalVehicleTitle, { color: colors.text }]}>
              Safe DVIR for 330
            </Text>

            <Text style={[styles.modalCertifyText, { color: colors.textDim }]}>
              I certify that the Vehicle 330 is safe to drive.
            </Text>

            <LoadingButton
              title="Certify and Submit"
              onPress={handleCertifyAndSubmit}
              fullWidth
              style={styles.certifyButton}
            />
          </View>
        </View>
      </Modal>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  addDefectsButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addDefectsText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  backButton: {
    padding: 8,
  },
  certifyButton: {
    width: "100%",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  defectsCard: {
    marginBottom: 16,
  },
  defectsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  defectsTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingBottom: 20,
    paddingHorizontal: 10,
    paddingTop: 40,
  },
  modalCertifyText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: "center",
  },
  modalCloseButton: {
    left: 16,
    padding: 8,
    position: "absolute",
    top: 16,
  },
  modalContent: {
    alignItems: "center",
    borderRadius: 12,
    maxWidth: 400,
    padding: 32,
    position: "relative",
    width: "90%",
  },
  modalIcon: {
    marginBottom: 24,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    marginBottom: 24,
  },
  modalVehicleTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  nextButton: {
    marginBottom: 40,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 4,
    textAlign: "center",
  },
  photoSlot: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 2,
    justifyContent: "center",
    padding: 8,
    width: "22%",
  },
  safetyButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  safetyButtonActive: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  safetyButtonText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  safetyButtons: {
    flexDirection: "row",
    gap: 12,
  },
  safetyCard: {
    marginBottom: 24,
  },
  safetyRequired: {
    fontSize: 14,
    fontWeight: "500" as const,
    marginBottom: 16,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  toggleButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  toggleButtonActive: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
})
