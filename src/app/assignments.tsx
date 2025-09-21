import React, { useState } from "react"
import {
  Alert,
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
// Removed @/hooks/api import - using mock data instead

export default function AssignmentsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  // Mock data for vehicles, trailers, and shipping IDs
  const vehicles: any[] = []
  const vehiclesLoading = false
  const trailers: any[] = []
  const trailersLoading = false
  const addTrailer = (trailer: any) => {}
  const removeTrailer = (id: string) => {}
  const shippingIDs: any[] = []
  const shippingLoading = false
  const addShippingID = (shipping: any) => {}
  const removeShippingID = (id: string) => {}

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
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

    try {
      await addTrailer({
        number: newTrailerNumber.trim(),
        type: "Dry Van",
      })
      setNewTrailerNumber("")
      setShowTrailerModal(false)
      toast.success("Trailer added successfully")
    } catch (error) {
      toast.warning("Failed to add trailer")
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
    Alert.alert("Remove Trailer", "Are you sure you want to remove this trailer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          try {
            await removeTrailer(id)
            toast.success("Trailer removed successfully")
          } catch (error) {
            toast.warning("Failed to remove trailer")
          }
        },
        style: "destructive",
      },
    ])
  }

  const handleRemoveShippingID = async (id: string) => {
    Alert.alert("Remove Shipping ID", "Are you sure you want to remove this shipping ID?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          try {
            await removeShippingID(id)
            toast.success("Shipping ID removed successfully")
          } catch (error) {
            toast.warning("Failed to remove shipping ID")
          }
        },
        style: "destructive",
      },
    ])
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Assignments",
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
        <Text style={[styles.title, { color: colors.text }]}>My Assets</Text>
        <LoadingButton
          loading={vehiclesLoading}
          title={selectedVehicle ? `Vehicle ${selectedVehicle}` : "Select Vehicle"}
          onPress={() => toast.warning("Vehicle selection functionality would be implemented here")}
          icon={<Plus size={16} color={isDark ? colors.text : "#fff"} />}
        />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Trailers Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trailers</Text>

          {trailers.map((trailer) => (
            <ElevatedCard key={trailer.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemNumber, { color: colors.text }]}>
                    Trailer {trailer.number}
                  </Text>
                  <Text style={[styles.itemType, { color: colors.textDim }]}>{trailer.type}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveTrailer(trailer.id)}
                  style={styles.removeButton}
                >
                  <X size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </ElevatedCard>
          ))}

          <TouchableOpacity
            style={[styles.addButton, { borderColor: colors.tint }]}
            onPress={() => setShowTrailerModal(true)}
          >
            <Plus size={20} color={colors.tint} />
            <Text style={[styles.addButtonText, { color: colors.tint }]}>Add a Trailer</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Trailer</Text>

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
                loading={trailersLoading}
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
