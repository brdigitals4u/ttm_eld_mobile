import React, { useState } from "react"
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router } from "expo-router"
import { ArrowLeft, Camera, ChevronDown, Edit, Fuel, Plus } from "lucide-react-native"

import { useCreateFuelPurchase, fuelPurchaseApi } from "@/api/fuel-purchase"
import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import LoadingButton from "@/components/LoadingButton"
import { toast } from "@/components/Toast"
import { useFuel, useAuth } from "@/contexts"
import { useLocationData } from "@/hooks/useLocationData"
import { useAppTheme } from "@/theme/context"
import { FuelReceipt } from "@/types/fuel"

import statesHash from "./states_hash.json"

interface FuelFormData {
  location: string
  gallons: string
  pricePerGallon: string
  odometer: string
  receiptImage: string
  fuelGrade: string
  iftaFuelType: string
  purchaseState: string
}

export default function EnhancedFuelScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { receipts, addFuelReceipt, deleteFuelReceipt, isLoading } = useFuel()
  const { user, driverProfile, vehicleAssignment } = useAuth()
  const locationData = useLocationData()
  const createFuelPurchaseMutation = useCreateFuelPurchase()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<FuelFormData>({
    location: "",
    gallons: "",
    pricePerGallon: "",
    odometer: "",
    receiptImage: "",
    fuelGrade: "",
    iftaFuelType: "",
    purchaseState: "",
  })
  const [showFuelGradeModal, setShowFuelGradeModal] = useState(false)
  const [showIftaFuelTypeModal, setShowIftaFuelTypeModal] = useState(false)
  const [showStateModal, setShowStateModal] = useState(false)

  // Fuel grade options
  const fuelGradeOptions = ["Unknown", "Regular", "Premium", "Mid-Grade"]

  // IFTA fuel type options
  const iftaFuelTypeOptions = ["Diesel", "Gasoline", "CNG", "LNG", "Electric", "Hybrid"]

  // US States
  const usStates = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ]

  const handleAddReceipt = () => {
    setShowAddForm(true)
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setFormData({
      location: "",
      gallons: "",
      pricePerGallon: "",
      odometer: "",
      receiptImage: "",
      fuelGrade: "",
      iftaFuelType: "",
      purchaseState: "",
    })
  }

  const handleTakePhoto = async () => {
    if (Platform.OS === "web") {
      toast.warning("Camera functionality is not available on web.")
      return
    }

    // Dynamically import expo-image-picker to fix the error
    // @ts-ignore - Dynamic import for optional dependency
    const ImagePicker = await import("expo-image-picker")
    const { status } = await ImagePicker.getCameraPermissionsAsync()
    if (status !== "granted") {
      const { status: reqStatus } = await ImagePicker.requestCameraPermissionsAsync()
      if (reqStatus !== "granted") {
        toast.error("Camera permission is required to take photos.")
        return
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setFormData((prev: FuelFormData) => ({
        ...prev,
        receiptImage: result.assets[0].uri,
      }))
    }
  }

  const handleSelectImage = async () => {
    if (Platform.OS === "web") {
      toast.warning("Image selection is not available on web.")
      return
    }

    // Dynamically import expo-image-picker
    // @ts-ignore - Dynamic import for optional dependency
    const ImagePicker = await import("expo-image-picker")
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      toast.error("Photo library permission is required to select images.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setFormData((prev: FuelFormData) => ({
        ...prev,
        receiptImage: result.assets[0].uri,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.location || !formData.gallons || !formData.pricePerGallon) {
      toast.warning("Please fill in all required fields.")
      return
    }

    const gallons = parseFloat(formData.gallons)
    const pricePerGallon = parseFloat(formData.pricePerGallon)

    if (isNaN(gallons) || isNaN(pricePerGallon)) {
      toast.error("Please enter valid numbers for gallons and price.")
      return
    }

    try {
      // Step 1: Upload receipt image if available
      let receiptImageUrl: string | undefined
      if (formData.receiptImage) {
        try {
          const now = new Date()
          const dateStr = now.toISOString().split("T")[0].replace(/-/g, "")
          const filename = `fuel_receipt_${dateStr}_${Date.now()}.jpg`

          const uploadResponse = await fuelPurchaseApi.uploadReceiptImage(
            formData.receiptImage,
            filename,
            "Fuel Receipt",
          )

          receiptImageUrl = uploadResponse.file_url
          console.log("✅ Receipt image uploaded:", receiptImageUrl)
        } catch (uploadError: any) {
          console.error("Failed to upload receipt image:", uploadError)
          // Continue without receipt image if upload fails
          toast.warning("Receipt image upload failed, proceeding without image.")
        }
      }

      // Convert gallons to liters (1 gallon = 3.78541 liters)
      const fuelQuantityLiters = gallons * 3.78541
      const totalAmount = gallons * pricePerGallon

      // Generate transaction reference (FP + YYYYMMDD + timestamp)
      const now = new Date()
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "")
      const timeStr = now.getTime().toString().slice(-6)
      const transactionReference = `FP${dateStr}${timeStr}`

      // Prepare API payload according to spec
      const payload = {
        transaction_reference: transactionReference,
        transaction_time: now.toISOString(),
        transaction_location: formData.location,
        fuel_quantity_liters: fuelQuantityLiters,
        transaction_price: {
          amount: totalAmount.toFixed(2),
          currency: "usd",
        },
        // Optional fields
        latitude: locationData.latitude || undefined,
        longitude: locationData.longitude || undefined,
        fuel_grade: formData.fuelGrade || undefined,
        ifta_fuel_type: formData.iftaFuelType || undefined,
        merchant_name: formData.location.split(",")[0] || undefined, // Extract merchant from location
        source: "Mobile App",
        driver_id: driverProfile?.driver_id || undefined,
        vehicle_id: vehicleAssignment?.vehicle_info?.id
          ? parseInt(vehicleAssignment.vehicle_info.id)
          : undefined,
        receipt_image_url: receiptImageUrl, // Include receipt URL if uploaded
        purchase_state: formData.purchaseState || undefined, // US State code
        country: "us",
      }

      // Step 2: Call POST API to create fuel purchase
      await createFuelPurchaseMutation.mutateAsync(payload)

      // Also add to local context for UI display (optional - can be removed if not needed)
      const receipt: Omit<FuelReceipt, "id" | "createdAt"> = {
        purchaseDate: now.getTime(),
        location: formData.location,
        gallons,
        pricePerGallon,
        totalAmount,
        receiptImage: formData.receiptImage || undefined,
        odometer: formData.odometer ? parseInt(formData.odometer) : undefined,
        vehicleId: vehicleAssignment?.vehicle_info?.vehicle_unit || "unknown",
        driverId: driverProfile?.driver_id || "unknown",
      }
      await addFuelReceipt(receipt)

      toast.success("Fuel purchase recorded successfully")
      handleCancelAdd()
    } catch (error: any) {
      console.error("Failed to create fuel purchase:", error)
      toast.error(error?.message || "Failed to record fuel purchase")
    }
  }

  const handleDeleteReceipt = (id: string) => {
    deleteFuelReceipt(id)
  }

  const renderReceiptItem = ({ item }: { item: FuelReceipt }) => (
    <ElevatedCard style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <Text style={[styles.receiptLocation, { color: colors.text }]}>{item.location}</Text>
          <Text style={[styles.receiptDate, { color: colors.textDim }]}>
            {new Date(item.purchaseDate).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.receiptAmount, { color: colors.tint }]}>
          ${item.totalAmount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.receiptDetails}>
        <View style={styles.receiptDetailItem}>
          <Text style={[styles.receiptDetailLabel, { color: colors.textDim }]}>Gallons:</Text>
          <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
            {item.gallons.toFixed(2)}
          </Text>
        </View>
        <View style={styles.receiptDetailItem}>
          <Text style={[styles.receiptDetailLabel, { color: colors.textDim }]}>Price/Gal:</Text>
          <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
            ${item.pricePerGallon.toFixed(3)}
          </Text>
        </View>
        {item.odometer && (
          <View style={styles.receiptDetailItem}>
            <Text style={[styles.receiptDetailLabel, { color: colors.textDim }]}>Odometer:</Text>
            <Text style={[styles.receiptDetailValue, { color: colors.text }]}>
              {item.odometer.toLocaleString()} mi
            </Text>
          </View>
        )}
      </View>

      {item.receiptImage && (
        <Image source={{ uri: item.receiptImage }} style={styles.receiptImage} />
      )}

      <Pressable
        onPress={() => handleDeleteReceipt(item.id)}
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </ElevatedCard>
  )

  if (showAddForm) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title={"IFTA Fuel Receipt"}
          titleMode="center"
          backgroundColor={colors.background}
          titleStyle={{
            fontSize: 22,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: 0.3,
            paddingLeft: 20,
          }}
          leftIcon="back"
          leftIconColor={colors.tint}
          onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
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
          rightText="Add"
          onRightPress={handleAddReceipt}
          safeAreaEdges={["top"]}
        />

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              placeholder="Gas station name or location"
              placeholderTextColor={colors.textDim}
              value={formData.location}
              onChangeText={(text: string) => setFormData((prev: FuelFormData) => ({ ...prev, location: text }))}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Gallons *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : "#F3F4F6",
                    color: colors.text,
                    borderColor: isDark ? "transparent" : "#E5E7EB",
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                value={formData.gallons}
                onChangeText={(text: string) => setFormData((prev: FuelFormData) => ({ ...prev, gallons: text }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Price/Gallon *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : "#F3F4F6",
                    color: colors.text,
                    borderColor: isDark ? "transparent" : "#E5E7EB",
                  },
                ]}
                placeholder="0.000"
                placeholderTextColor={colors.textDim}
                value={formData.pricePerGallon}
                onChangeText={(text: string) => setFormData((prev: FuelFormData) => ({ ...prev, pricePerGallon: text }))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Odometer (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              placeholder="Current mileage"
              placeholderTextColor={colors.textDim}
              value={formData.odometer}
              onChangeText={(text: string) => setFormData((prev: FuelFormData) => ({ ...prev, odometer: text }))}
              keyboardType="numeric"
            />
          </View>

          {/* Fuel Grade Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Fuel Grade (optional)</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              onPress={() => setShowFuelGradeModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.fuelGrade ? colors.text : colors.textDim,
                  },
                ]}
              >
                {formData.fuelGrade || "Select fuel grade"}
              </Text>
              <ChevronDown size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* IFTA Fuel Type Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>IFTA Fuel Type (optional)</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              onPress={() => setShowIftaFuelTypeModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.iftaFuelType ? colors.text : colors.textDim,
                  },
                ]}
              >
                {formData.iftaFuelType || "Select fuel type"}
              </Text>
              <ChevronDown size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Purchase State Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Purchase State (optional)</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              onPress={() => setShowStateModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.purchaseState ? colors.text : colors.textDim,
                  },
                ]}
              >
                {formData.purchaseState
                  ? statesHash[formData.purchaseState as keyof typeof statesHash]
                  : "Select state"}
              </Text>
              <ChevronDown size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.imageSection}>
            <Text style={[styles.label, { color: colors.text }]}>Receipt Photo (optional)</Text>

            {formData.receiptImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: formData.receiptImage }} style={styles.previewImage} />
                <Pressable
                  onPress={() => setFormData((prev: FuelFormData) => ({ ...prev, receiptImage: "" }))}
                  style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <LoadingButton
                  title="Take Photo"
                  onPress={handleTakePhoto}
                  variant="outline"
                  icon={<Camera size={18} color={colors.tint} />}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <LoadingButton
                  title="Select Image"
                  onPress={handleSelectImage}
                  variant="outline"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            )}
          </View>

          <View style={styles.formButtons}>
            <LoadingButton
              title="Cancel"
              onPress={handleCancelAdd}
              variant="outline"
              style={{ flex: 1, marginRight: 8 }}
            />
            <LoadingButton
              title="Save Receipt"
              onPress={handleSubmit}
              loading={createFuelPurchaseMutation.isPending || isLoading}
              disabled={createFuelPurchaseMutation.isPending}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={"IFTA Fuel Receipt"}
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
          paddingLeft: 20,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
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
        rightText="Add"
        onRightPress={handleAddReceipt}
        safeAreaEdges={["top"]}
      />

      {receipts.length === 0 ? (
        <ElevatedCard style={styles.emptyContainer}>
          <Fuel size={48} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No fuel receipts recorded</Text>
          <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
            Add your first fuel receipt to get started
          </Text>
        </ElevatedCard>
      ) : (
        <FlatList
          data={receipts.sort((a: FuelReceipt, b: FuelReceipt) => b.purchaseDate - a.purchaseDate)}
          renderItem={renderReceiptItem}
          keyExtractor={(item: FuelReceipt) => item.id}
          style={styles.receiptsList}
          contentContainerStyle={styles.receiptsListContent}
        />
      )}

      {/* Fuel Grade Selection Modal */}
      <Modal
        visible={showFuelGradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFuelGradeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFuelGradeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Fuel Grade</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {fuelGradeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor:
                        formData.fuelGrade === option ? colors.palette.primary500 : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setFormData((prev: FuelFormData) => ({ ...prev, fuelGrade: option }))
                    setShowFuelGradeModal(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color: formData.fuelGrade === option ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFuelGradeModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* IFTA Fuel Type Selection Modal */}
      <Modal
        visible={showIftaFuelTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIftaFuelTypeModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowIftaFuelTypeModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select IFTA Fuel Type</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {iftaFuelTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor:
                        formData.iftaFuelType === option
                          ? colors.palette.primary500
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setFormData((prev: FuelFormData) => ({ ...prev, iftaFuelType: option }))
                    setShowIftaFuelTypeModal(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color: formData.iftaFuelType === option ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowIftaFuelTypeModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Purchase State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStateModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Purchase State</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {usStates.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.modalOption,
                    {
                      backgroundColor:
                        formData.purchaseState === state
                          ? colors.palette.primary500
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setFormData((prev: FuelFormData) => ({ ...prev, purchaseState: state }))
                    setShowStateModal(false)
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color: formData.purchaseState === state ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {statesHash[state as keyof typeof statesHash]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowStateModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  deleteButton: {
    alignSelf: "flex-end",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    padding: 40,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginTop: 16,
    textAlign: "center",
  },
  form: {
    flex: 1,
    padding: 20,
  },
  formButtons: {
    flexDirection: "row",
    marginTop: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 0,
  },
  imageButtons: {
    flexDirection: "row",
  },
  imagePreview: {
    alignItems: "center",
  },
  imageSection: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 50,
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  modalCloseButton: {
    borderRadius: 8,
    marginTop: 16,
    padding: 16,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  modalContent: {
    borderRadius: 12,
    maxWidth: 400,
    padding: 20,
    width: "100%",
  },
  modalOption: {
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 20,
    textAlign: "center",
  },
  previewImage: {
    borderRadius: 8,
    height: 150,
    marginBottom: 12,
    width: 200,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  receiptCard: {
    marginBottom: 16,
  },
  receiptDate: {
    fontSize: 14,
  },
  receiptDetailItem: {
    alignItems: "center",
  },
  receiptDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  receiptDetailValue: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  receiptDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  receiptHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  receiptImage: {
    borderRadius: 8,
    height: 200,
    marginBottom: 12,
    width: "100%",
  },
  receiptInfo: {
    flex: 1,
  },
  receiptLocation: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  receiptsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  receiptsListContent: {
    paddingBottom: 20,
  },
  removeImageButton: {
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeImageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  selector: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  selectorText: {
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
})
