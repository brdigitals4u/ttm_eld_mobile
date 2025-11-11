import React, { useState, useMemo } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router, Stack } from "expo-router"
import { ArrowLeft, Plus, X } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { toast } from "@/components/Toast"
import { useAppTheme } from "@/theme/context"
import { useVehicles } from "@/api/vehicles"
import { useTrailerAssignments, useAssignTrailer, useRemoveTrailer } from "@/api/trailers"
import { useAuth } from "@/stores/authStore"
import { useLocationData } from "@/hooks/useLocationData"
import { translate } from "@/i18n/translate"

export default function AssignmentsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { driverProfile, vehicleAssignment, isAuthenticated } = useAuth()
  const locationData = useLocationData()
  
  // GET API: Get vehicles - show only vehicle assigned to driver (from vehicleAssignment)
  // Note: Vehicle assignment is managed by organization admin, driver can only view assigned vehicle
  const assignedVehicleId = vehicleAssignment?.vehicle_info?.id ? parseInt(vehicleAssignment.vehicle_info.id) : null
  const { data: allVehicles, isLoading: vehiclesLoading } = useVehicles({ enabled: isAuthenticated })
  
  // Filter to show only assigned vehicle
  const vehicles = useMemo(() => {
    if (!allVehicles || !assignedVehicleId) return []
    return allVehicles.filter(v => v.id === assignedVehicleId)
  }, [allVehicles, assignedVehicleId])
  
  // GET API: Get trailer assignments for this driver
  const { data: trailerAssignments, isLoading: trailersLoading, refetch: refetchTrailers } = useTrailerAssignments(
    { driver: driverProfile?.driver_id || undefined, status: 'active' },
    { enabled: isAuthenticated && !!driverProfile?.driver_id }
  )
  
  const assignTrailerMutation = useAssignTrailer()
  const removeTrailerMutation = useRemoveTrailer()
  
  // Mock data for shipping IDs (not in API spec)
  const shippingIDs: any[] = []
  const shippingLoading = false
  const addShippingID = (shipping: any) => {}
  const removeShippingID = (id: string) => {}

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(
    vehicleAssignment?.vehicle_info?.vehicle_unit || null
  )
  const [showTrailerModal, setShowTrailerModal] = useState(false)
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [newTrailerNumber, setNewTrailerNumber] = useState("")
  const [newShippingNumber, setNewShippingNumber] = useState("")
  const [newShippingDescription, setNewShippingDescription] = useState("")

  const handleAddTrailer = async () => {
    if (!newTrailerNumber.trim()) {
      toast.warning("Please enter a trailer number")
      return
    }

    if (!driverProfile?.driver_id) {
      toast.error("Driver information not available")
      return
    }

    try {
      // Note: This assumes trailer already exists and we're just assigning it
      // If we need to create trailer first, we'd need trailer ID/asset_id
      // For now, we'll assign by asset_id (assuming trailer number is asset_id)
      
      await assignTrailerMutation.mutateAsync({
        driver: driverProfile.driver_id,
        trailer: newTrailerNumber.trim(), // Assuming this is trailer UUID or asset_id
        start_time: new Date().toISOString(),
        status: 'active',
        is_primary: true,
        notes: `Assigned trailer ${newTrailerNumber.trim()}`,
      })
      
      setNewTrailerNumber("")
      setShowTrailerModal(false)
      refetchTrailers()
      toast.success("Trailer assigned successfully")
    } catch (error: any) {
      console.error("Failed to assign trailer:", error)
      toast.error(error?.message || "Failed to assign trailer")
    }
  }

  const handleAddShippingID = async () => {
    if (!newShippingNumber.trim()) {
      toast.warning("Please enter a shipping ID number")
      return
    }

    try {
      await addShippingID({
        number: newShippingNumber.trim(),
        description: newShippingDescription.trim() || "No description",
      })
      setNewShippingNumber("")
      setNewShippingDescription("")
      setShowShippingModal(false)
      toast.success("Shipping ID added successfully")
    } catch (error) {
      toast.warning("Failed to add shipping ID")
    }
  }

  const handleRemoveTrailer = async (id: string) => {
    try {
      await removeTrailerMutation.mutateAsync(id)
      refetchTrailers()
      toast.success("Trailer removed successfully")
    } catch (error: any) {
      console.error("Failed to remove trailer:", error)
      toast.error(error?.message || "Failed to remove trailer")
    }
  }

  const handleRemoveShippingID = async (id: string) => {
    try {
      await removeShippingID(id)
      toast.success("Shipping ID removed successfully")
    } catch (error) {
      toast.error("Failed to remove shipping ID")
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: translate("assignments.title" as any),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.tint, fontSize: 16 }}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{translate("assignments.title" as any)}</Text>
        <LoadingButton
          loading={vehiclesLoading}
          title={selectedVehicle ? `${translate("assignments.vehicle" as any)} ${selectedVehicle}` : translate("assignments.noAssignments" as any)}
          onPress={() => toast.info("Vehicle assignment is managed by organization admin")}
          disabled={true}
          variant="secondary"
        />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Vehicle Section - Show assigned vehicle */}
        {vehicles.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("assignments.vehicle" as any)}</Text>
            {vehicles.map((vehicle) => (
              <ElevatedCard key={vehicle.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemNumber, { color: colors.text }]}>
                      {vehicle.vehicle_unit}
                    </Text>
                    <Text style={[styles.itemType, { color: colors.textDim }]}>
                      {vehicle.make} {vehicle.model} • {vehicle.license_plate}
                    </Text>
                  </View>
                </View>
              </ElevatedCard>
            ))}
          </View>
        )}

        {/* Trailers Section */}
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{translate("assignments.trailer" as any)}</Text>

          {trailerAssignments && trailerAssignments.length > 0 ? (
            trailerAssignments.map((assignment) => (
              <ElevatedCard key={assignment.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemNumber, { color: colors.text }]}>
                      Trailer {assignment.trailer_asset_id || assignment.trailer}
                    </Text>
                    <Text style={[styles.itemType, { color: colors.textDim }]}>
                      {assignment.is_primary ? "Primary" : "Secondary"} • {assignment.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveTrailer(assignment.id)}
                    style={styles.removeButton}
                  >
                    <X size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </ElevatedCard>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              {translate("assignments.noAssignments" as any)}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.tint }]}
            onPress={() => setShowTrailerModal(true)}
          >
            <Plus size={20} color={colors.tint} />
            <Text style={[styles.addButtonText, { color: colors.tint }]}>{translate("assignments.addTrailer" as any)}</Text>
          </TouchableOpacity>
        </View>

        {/* Shipping IDs Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping IDs</Text>

          {shippingIDs.map((shipping) => (
            <ElevatedCard key={shipping.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemNumber, { color: colors.text }]}>{shipping.number}</Text>
                  <Text style={[styles.itemType, { color: colors.textDim }]}>
                    {shipping.description}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveShippingID(shipping.id)}
                  style={styles.removeButton}
                >
                  <X size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </ElevatedCard>
          ))}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.tint }]}
            onPress={() => setShowShippingModal(true)}
          >
            <Plus size={20} color={colors.tint} />
            <Text style={[styles.addButtonText, { color: colors.tint }]}>Add a Shipping ID</Text>
          </TouchableOpacity>
        </View>

        <LoadingButton
          title="Done"
          onPress={() => router.back()}
          fullWidth
          style={styles.doneButton}
        />
      </ScrollView>

      {/* Add Trailer Modal */}
      <Modal
        visible={showTrailerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrailerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{translate("assignments.addTrailer" as any)}</Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Trailer Number"
              placeholderTextColor={colors.textDim}
              value={newTrailerNumber}
              onChangeText={setNewTrailerNumber}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <LoadingButton
                title="Cancel"
                onPress={() => {
                  setShowTrailerModal(false)
                  setNewTrailerNumber("")
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <LoadingButton
                title="Add"
                onPress={handleAddTrailer}
                loading={trailersLoading || assignTrailerMutation.isPending}
                disabled={assignTrailerMutation.isPending}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Shipping ID Modal */}
      <Modal
        visible={showShippingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShippingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Shipping ID</Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Shipping ID Number"
              placeholderTextColor={colors.textDim}
              value={newShippingNumber}
              onChangeText={setNewShippingNumber}
              autoCapitalize="characters"
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textDim}
              value={newShippingDescription}
              onChangeText={setNewShippingDescription}
            />

            <View style={styles.modalButtons}>
              <LoadingButton
                title="Cancel"
                onPress={() => {
                  setShowShippingModal(false)
                  setNewShippingNumber("")
                  setNewShippingDescription("")
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <LoadingButton
                title="Add"
                onPress={handleAddShippingID}
                loading={shippingLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    padding: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "500" as const,
    marginLeft: 8,
  },
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  doneButton: {
    marginBottom: 40,
    marginTop: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemType: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    padding: 16,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    padding: 20,
    textAlign: "center",
  },
  modalButton: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalContent: {
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 24,
    textAlign: "center",
  },
  removeButton: {
    padding: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 16,
  },
  selectButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
})
