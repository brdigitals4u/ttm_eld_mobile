import React, { useState, useEffect } from "react"
import { FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View, ScrollView } from "react-native"
import { Check, Users, UserPlus, ChevronDown } from "lucide-react-native"

import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { translate } from "@/i18n/translate"
import { useDrivers } from "@/api/drivers"
import { useDriverTeamStore } from "@/stores/driverTeamStore"
import { useAuthStore } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import statesHash from "@/app/states_hash.json"

interface TeamRequestDialogProps {
  visible: boolean
  onClose: () => void
}

export function TeamRequestDialog({ visible, onClose }: TeamRequestDialogProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { driverProfile, vehicleAssignment } = useAuthStore()
  const { requestTeam, isLoading } = useDriverTeamStore()
  const { data: drivers, isLoading: isDriversLoading } = useDrivers({ enabled: visible })

  // Tab state
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing")

  // Existing driver selection state
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)

  // Simplified form state
  const [codriverName, setCodriverName] = useState("")
  const [codriverLicenseNumber, setCodriverLicenseNumber] = useState("")
  const [codriverLicenseState, setCodriverLicenseState] = useState<string>("")
  const [showStateModal, setShowStateModal] = useState(false)

  // Shared state
  const [notes, setNotes] = useState("")
  const [formErrors, setFormErrors] = useState<{
    codriverName?: string
    codriverLicenseNumber?: string
    codriverLicenseState?: string
  }>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!visible) {
      setActiveTab("existing")
      setSelectedDriverId(null)
      setCodriverName("")
      setCodriverLicenseNumber("")
      setCodriverLicenseState("")
      setNotes("")
      setFormErrors({})
      setShowStateModal(false)
    }
  }, [visible])

  // Filter out current driver from the list
  const availableDrivers = drivers?.filter((driver) => driver.id !== driverProfile?.driver_id) || []

  // Get sorted states list
  const statesList = Object.keys(statesHash).sort()

  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId)
  }

  const validateSimplifiedForm = (): boolean => {
    const errors: typeof formErrors = {}

    if (!codriverName.trim() || codriverName.trim().length < 2) {
      errors.codriverName = translate("driverTeam.nameRequired" as any) || "Co-driver name is required"
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
    if (activeTab === "existing") {
      // Existing logic - send codriver UUID
      if (!selectedDriverId) {
        toast.warning(translate("driverTeam.selectCoDriver" as any) || "Please select a co-driver")
        return
      }

      try {
        const createdTeam = await requestTeam({
          codriver: selectedDriverId,
          vehicle: vehicleAssignment?.vehicle_info?.id,
          notes: notes.trim() || undefined,
        })
        toast.success(
          translate("driverTeam.createSuccess" as any) ||
            "Team created successfully! You can now activate it.",
        )
        onClose()
      } catch (error: any) {
        console.error("Failed to request team:", error)
        toast.error(error?.message || "Failed to create team")
      }
    } else {
      // Simplified form - send name + license
      if (!validateSimplifiedForm()) {
        return
      }

      try {
        const createdTeam = await requestTeam({
          codriver_name: codriverName.trim(),
          codriver_license_number: codriverLicenseNumber.trim(),
          codriver_license_state: codriverLicenseState,
          vehicle: vehicleAssignment?.vehicle_info?.id,
          notes: notes.trim() || undefined,
        })
        toast.success(
          translate("driverTeam.createSuccess" as any) ||
            "Team created successfully! You can now activate it.",
        )
        onClose()
      } catch (error: any) {
        console.error("Failed to request team:", error)
        toast.error(error?.message || "Failed to create team")
      }
    }
  }

  const renderDriverItem = ({ item }: { item: any }) => {
    const isSelected = selectedDriverId === item.id

    return (
      <TouchableOpacity
        style={[
          styles.driverItem,
          isSelected && { backgroundColor: colors.tint + "20", borderColor: colors.tint },
        ]}
        onPress={() => handleSelectDriver(item.id)}
      >
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.driver_name || item.driver_email}</Text>
          {item.company_driver_id && (
            <Text style={styles.driverId}>ID: {item.company_driver_id}</Text>
          )}
        </View>
        {isSelected && <Check size={24} color={colors.tint} style={styles.checkIcon} />}
      </TouchableOpacity>
    )
  }

  const isSubmitDisabled = () => {
    if (activeTab === "existing") {
      return isLoading || !selectedDriverId
    } else {
      return (
        isLoading ||
        !codriverName.trim() ||
        !codriverLicenseNumber.trim() ||
        !codriverLicenseState
      )
    }
  }

  const styles = StyleSheet.create({
    checkIcon: {
      marginLeft: 8,
    },
    driverId: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 4,
    },
    driverInfo: {
      flex: 1,
    },
    driverItem: {
      alignItems: "center",
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 2,
      flexDirection: "row",
      marginBottom: 12,
      padding: 16,
    },
    driverName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
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
    listContainer: {
      maxHeight: 300,
    },
    modalButton: {
      flex: 1,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: "80%",
      maxWidth: 400,
      padding: 24,
      width: "100%",
    },
    modalOverlay: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 24,
      textAlign: "center",
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
    tabButton: {
      alignItems: "center",
      borderRadius: 8,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      padding: 12,
    },
    tabButtonActive: {
      backgroundColor: colors.tint,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    tabContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
      padding: 4,
    },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {translate("driverTeam.requestTeam" as any) || "Request Team"}
          </Text>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "existing" && [styles.tabButtonActive, { backgroundColor: colors.tint }],
              ]}
              onPress={() => setActiveTab("existing")}
            >
              <Users size={18} color={activeTab === "existing" ? "#FFFFFF" : colors.textDim} />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === "existing" ? "#FFFFFF" : colors.textDim,
                  },
                ]}
              >
                {translate("driverTeam.tabSelectExisting" as any) || "Select Existing"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "new" && [styles.tabButtonActive, { backgroundColor: colors.tint }],
              ]}
              onPress={() => setActiveTab("new")}
            >
              <UserPlus size={18} color={activeTab === "new" ? "#FFFFFF" : colors.textDim} />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === "new" ? "#FFFFFF" : colors.textDim,
                  },
                ]}
              >
                {translate("driverTeam.tabAddNew" as any) || "Add New Co-Driver"}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "existing" ? (
            <>
              <Text style={styles.infoText}>
                {translate("driverTeam.requestInfo" as any) ||
                  "Select a co-driver to create a team. The team will be created immediately."}
              </Text>

              {isDriversLoading ? (
                <Text style={styles.emptyText}>Loading drivers...</Text>
              ) : availableDrivers.length === 0 ? (
                <Text style={styles.emptyText}>
                  {translate("driverTeam.noDrivers" as any) || "No drivers available"}
                </Text>
              ) : (
                <FlatList
                  data={availableDrivers}
                  renderItem={renderDriverItem}
                  keyExtractor={(item) => item.id}
                  style={styles.listContainer}
                  showsVerticalScrollIndicator={true}
                />
              )}
            </>
          ) : (
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
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
                style={[
                  styles.stateButton,
                  formErrors.codriverLicenseState && styles.stateButtonError,
                ]}
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
            </ScrollView>
          )}

          {/* Notes Field (Shared) */}
          <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 8, marginTop: 8 }}>
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

          <View style={styles.modalButtons}>
            <LoadingButton
              title={translate("common.cancel" as any) || "Cancel"}
              onPress={onClose}
              variant="outline"
              style={styles.modalButton}
              disabled={isLoading}
            />
            <LoadingButton
              title={translate("driverTeam.submitRequest" as any) || "Submit Request"}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isSubmitDisabled()}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>

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
    </Modal>
  )
}
