import { useState, useEffect } from "react"
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router } from "expo-router"
import { ChevronDown, Check, X } from "lucide-react-native"

import { useAvailableVehicles } from "@/api/driver-hooks"
import { useDriverTeams } from "@/api/driver-teams"
import statesHash from "@/app/states_hash.json"
import { Header } from "@/components/Header"
import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useAuthStore } from "@/stores/authStore"
import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { useAppTheme } from "@/theme/context"

export default function TeamRequestScreen() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { driverProfile } = useAuthStore()
  const { requestTeam, isLoading } = useDriverTeamStore()

  // Fetch teams when screen loads
  useDriverTeams(
    { primary_driver: driverProfile?.driver_id },
    { enabled: !!driverProfile?.driver_id },
  )
  const {
    data: vehiclesData,
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useAvailableVehicles(undefined, true)

  // Simplified form state
  const [codriverName, setCodriverName] = useState("")
  const [codriverLicenseNumber, setCodriverLicenseNumber] = useState("")
  const [codriverLicenseState, setCodriverLicenseState] = useState<string>("")
  const [showStateModal, setShowStateModal] = useState(false)
  const [driverEmail, setDriverEmail] = useState("")
  // Vehicle selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [showVehicleModal, setShowVehicleModal] = useState(false)

  // Shared state
  const [notes, setNotes] = useState("")
  const [formErrors, setFormErrors] = useState<{
    codriverName?: string
    codriverLicenseNumber?: string
    codriverLicenseState?: string
    vehicle?: string
  }>({})

  // Get vehicles list - refetch when modal opens
  useEffect(() => {
    if (showVehicleModal) {
      refetchVehicles()
    }
  }, [showVehicleModal, refetchVehicles])

  // API response: { vehicles: VehicleInfo[], count: number }
  // Note: Vehicle IDs may be numeric strings (e.g., "13", "12"), numbers, or UUIDs
  // We normalize them to strings for consistency with Zod schema
  const vehicles = (vehiclesData?.vehicles || [])
    .map((v: any) => {
      // Normalize ID to string (handles both string and number IDs from API)
      if (v && v.id !== undefined && v.id !== null) {
        return { ...v, id: String(v.id) }
      }
      return v
    })
    .filter((v: any) => {
      if (!v || !v.id) {
        console.warn("Vehicle missing id field:", v)
        return false
      }
      // Accept any non-empty string ID
      return typeof v.id === "string" && v.id.trim().length > 0
    })

  // Get sorted states list
  const statesList = Object.keys(statesHash).sort()

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {}

    if (!selectedVehicleId) {
      errors.vehicle = translate("driverTeam.vehicleRequired" as any) || "Vehicle is required"
    }

    if (!codriverName.trim() || codriverName.trim().length < 2) {
      errors.codriverName =
        translate("driverTeam.nameRequired" as any) || "Co-driver name is required"
    }

    if (!codriverLicenseNumber.trim() || codriverLicenseNumber.trim().length < 3) {
      errors.codriverLicenseNumber =
        translate("driverTeam.licenseNumberRequired" as any) || "License number is required"
    }

    if (!codriverLicenseState) {
      errors.codriverLicenseState =
        translate("driverTeam.licenseStateRequired" as any) || "License state is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    // Validate vehicle ID exists
    if (!selectedVehicleId) {
      console.error("No vehicle selected")
      toast.error("Please select a valid vehicle")
      setFormErrors((prev) => ({ ...prev, vehicle: "Please select a valid vehicle" }))
      return
    }

    // Find the selected vehicle to ensure we have the correct ID
    const selectedVehicleObj = vehicles.find((v: any) => v.id === selectedVehicleId)
    if (!selectedVehicleObj) {
      console.error("Selected vehicle not found in vehicles list:", selectedVehicleId)
      toast.error("Selected vehicle not found. Please try again.")
      return
    }

    // Use the ID from the vehicle object and ensure it's a string
    // Backend may return numeric IDs, but Zod schema expects string
    const vehicleId = String(selectedVehicleObj.id)
    console.log(
      "Selected vehicle ID:",
      vehicleId,
      "Type:",
      typeof vehicleId,
      "Original:",
      selectedVehicleObj.id,
    )

    try {
      // Simplified form - send name + license
      const payload = {
        codriver_name: codriverName.trim(),
        codriver_license_number: codriverLicenseNumber.trim(),
        codriver_license_state: codriverLicenseState,
        vehicle: vehicleId, // Ensure it's a string
        notes: notes.trim() || undefined,
        codriver_email: driverEmail.trim() || undefined,
      }
      console.log("Submitting team request with payload:", payload)
      await requestTeam(payload)
      toast.success(
        translate("driverTeam.createSuccess" as any) ||
          "Team created successfully! You can now activate it.",
      )
      router.back()
    } catch (error: any) {
      console.error("Failed to request team:", error)
      toast.error(error?.message || "Failed to create team")
    }
  }

  const renderVehicleItem = ({ item }: { item: any }) => {
    // Use item.id as the vehicle identifier (may be numeric string or UUID)
    const vehicleId = item.id
    if (!vehicleId || typeof vehicleId !== "string") {
      console.warn("Vehicle item missing id field or invalid type:", item)
      return null
    }

    const isSelected = selectedVehicleId === vehicleId
    const vehicleLabel = item.vehicle_unit || item.license_plate || item.vin || vehicleId

    return (
      <TouchableOpacity
        style={[
          styles.vehicleItem,
          isSelected && { backgroundColor: colors.tint + "20", borderColor: colors.tint },
        ]}
        onPress={() => {
          console.log("Vehicle selected - ID:", vehicleId, "Label:", vehicleLabel)
          // Set the vehicle ID (numeric string or UUID)
          setSelectedVehicleId(vehicleId)
          setShowVehicleModal(false)
          if (formErrors.vehicle) {
            setFormErrors((prev) => ({ ...prev, vehicle: undefined }))
          }
        }}
      >
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicleLabel}</Text>
          {item.make && item.model && (
            <Text style={styles.vehicleDetails}>
              {item.make} {item.model} {item.year ? `(${item.year})` : ""}
            </Text>
          )}
        </View>
        {isSelected && <Check size={24} color={colors.tint} style={styles.checkIcon} />}
      </TouchableOpacity>
    )
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
  const vehicleLabel = selectedVehicle
    ? selectedVehicle.vehicle_unit ||
      selectedVehicle.license_plate ||
      selectedVehicle.vin ||
      selectedVehicle.id
    : null

  const isSubmitDisabled = () => {
    if (isLoading) return true
    if (!selectedVehicleId) return true
    return !codriverName.trim() || !codriverLicenseNumber.trim() || !codriverLicenseState
  }

  const styles = StyleSheet.create({
    checkIcon: {
      marginLeft: 8,
    },
    closeButton: {
      alignItems: "center",
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      padding: 20,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 14,
      padding: 32,
      textAlign: "center",
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    infoText: {
      color: colors.textDim,
      fontSize: 12,
      marginBottom: 16,
      textAlign: "center",
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 16,
    },
    inputError: {
      borderColor: colors.error,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalOverlay: {
      alignItems: "center",
      backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 16,
    },
    stateButton: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
      padding: 16,
    },
    stateButtonError: {
      borderColor: colors.error,
    },
    stateButtonText: {
      color: colors.text,
      flex: 1,
      fontSize: 16,
      fontWeight: codriverLicenseState ? "600" : "400",
    },
    stateItem: {
      backgroundColor: colors.cardBackground,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      padding: 16,
    },
    stateItemSelected: {
      backgroundColor: colors.tint + "20",
    },
    stateItemText: {
      color: colors.text,
      fontSize: 16,
    },
    stateItemTextSelected: {
      color: colors.tint,
      fontWeight: "600",
    },
    stateModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: "70%",
      padding: 20,
      width: "90%",
    },
    stateModalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
      textAlign: "center",
    },
    submitButton: {
      marginBottom: 80,
      marginTop: 24,
    },
    vehicleButton: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
      padding: 16,
    },
    vehicleButtonError: {
      borderColor: colors.error,
    },
    vehicleButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: selectedVehicleId ? "600" : "400",
    },
    vehicleDetails: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 4,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehicleItem: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 2,
      flexDirection: "row",
      marginBottom: 12,
      padding: 16,
    },
    vehicleModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: "70%",
      padding: 20,
      width: "90%",
    },
    vehicleModalTitle: {
      color: colors.text,
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
    },
    vehicleName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  })

  return (
    <View style={styles.container}>
      <Header
        title={translate("driverTeam.requestTeam" as any) || "Request Team"}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {translate("driverTeam.vehicle" as any) || "Vehicle"} *
          </Text>
          <TouchableOpacity
            style={[styles.vehicleButton, formErrors.vehicle && styles.vehicleButtonError]}
            onPress={() => setShowVehicleModal(true)}
          >
            <Text style={styles.vehicleButtonText}>
              {vehicleLabel || translate("driverTeam.selectVehicle" as any) || "Select vehicle"}
            </Text>
            <ChevronDown size={20} color={selectedVehicleId ? colors.tint : colors.textDim} />
          </TouchableOpacity>
          {formErrors.vehicle && <Text style={styles.errorText}>{formErrors.vehicle}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {translate("driverTeam.tabAddNew" as any) || "Co-Driver Details"} *
          </Text>
          <Text style={styles.infoText}>
            {translate("driverTeam.simplifiedFormInfo" as any) ||
              "Enter co-driver details. System will find existing driver or create new account automatically."}
          </Text>

          {/* Co-Driver Name */}
          <Text style={styles.label}>
            {translate("driverTeam.codriverName" as any) || "Co-Driver Name"} *
          </Text>
          <TextInput
            style={[styles.input, formErrors.codriverName && styles.inputError]}
            placeholder={
              translate("driverTeam.codriverNamePlaceholder" as any) || "Enter full name"
            }
            placeholderTextColor={colors.textDim}
            value={codriverName}
            onChangeText={(text) => {
              setCodriverName(text)
              if (formErrors.codriverName) {
                setFormErrors((prev) => ({ ...prev, codriverName: undefined }))
              }
            }}
            autoCapitalize="words"
          />
          {formErrors.codriverName && (
            <Text style={styles.errorText}>{formErrors.codriverName}</Text>
          )}

          {/* License Number */}
          <Text style={styles.label}>
            {translate("driverTeam.codriverLicenseNumber" as any) || "License Number"} *
          </Text>
          <TextInput
            style={[styles.input, formErrors.codriverLicenseNumber && styles.inputError]}
            placeholder={
              translate("driverTeam.codriverLicenseNumberPlaceholder" as any) ||
              "Enter license number"
            }
            placeholderTextColor={colors.textDim}
            value={codriverLicenseNumber}
            onChangeText={(text) => {
              setCodriverLicenseNumber(text)
              if (formErrors.codriverLicenseNumber) {
                setFormErrors((prev) => ({ ...prev, codriverLicenseNumber: undefined }))
              }
            }}
            autoCapitalize="characters"
          />
          {formErrors.codriverLicenseNumber && (
            <Text style={styles.errorText}>{formErrors.codriverLicenseNumber}</Text>
          )}

          {/* License State */}
          <Text style={styles.label}>
            {translate("driverTeam.codriverLicenseState" as any) || "License State"} *
          </Text>
          <TouchableOpacity
            style={[styles.stateButton, formErrors.codriverLicenseState && styles.stateButtonError]}
            onPress={() => setShowStateModal(true)}
          >
            <Text style={styles.stateButtonText}>
              {codriverLicenseState
                ? statesHash[codriverLicenseState as keyof typeof statesHash]
                : translate("driverTeam.selectState" as any) || "Select state"}
            </Text>
            <ChevronDown size={20} color={codriverLicenseState ? colors.tint : colors.textDim} />
          </TouchableOpacity>
          {formErrors.codriverLicenseState && (
            <Text style={styles.errorText}>{formErrors.codriverLicenseState}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{"Driver Email *:"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Driver Email"
            placeholderTextColor={colors.textDim}
            value={driverEmail}
            onChangeText={setDriverEmail}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        {/* Notes Field (Shared) */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {translate("driverTeam.notes" as any) || "Notes (optional):"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              translate("driverTeam.notesPlaceholder" as any) ||
              "e.g., Route 101, Long haul trip..."
            }
            placeholderTextColor={colors.textDim}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <LoadingButton
          title={translate("driverTeam.submitRequest" as any) || "Submit Request"}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isSubmitDisabled()}
          style={styles.submitButton}
        />
      </ScrollView>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.stateModalContent}>
            <Text style={styles.stateModalTitle}>
              {translate("driverTeam.codriverLicenseState" as any) || "Select License State"}
            </Text>
            <FlatList
              data={statesList}
              keyExtractor={(item) => item}
              renderItem={({ item: stateCode }) => {
                const isSelected = codriverLicenseState === stateCode
                return (
                  <TouchableOpacity
                    style={[
                      styles.stateItem,
                      isSelected && styles.stateItemSelected,
                      isSelected && { backgroundColor: colors.tint + "20" },
                    ]}
                    onPress={() => {
                      setCodriverLicenseState(stateCode)
                      setShowStateModal(false)
                      if (formErrors.codriverLicenseState) {
                        setFormErrors((prev) => ({ ...prev, codriverLicenseState: undefined }))
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.stateItemText,
                        isSelected && [styles.stateItemTextSelected, { color: colors.tint }],
                      ]}
                    >
                      {statesHash[stateCode as keyof typeof statesHash]} ({stateCode})
                    </Text>
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal
        visible={showVehicleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vehicleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.vehicleModalTitle}>
                {translate("driverTeam.selectVehicle" as any) || "Select Vehicle"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowVehicleModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {isVehiclesLoading ? (
              <Text style={styles.emptyText}>Loading vehicles...</Text>
            ) : vehicles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {translate("driverTeam.noVehicles" as any) || "No vehicles available"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowVehicleModal(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={colors.textDim} />
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id}
                renderItem={renderVehicleItem}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
