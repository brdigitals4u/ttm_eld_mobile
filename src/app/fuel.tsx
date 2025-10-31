import React, { useState } from "react"
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { router } from "expo-router"
import { ArrowLeft, Camera, Edit, Fuel, Plus } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { toast } from "@/components/Toast"
import { useFuel, useAuth } from "@/contexts"
import { useAppTheme } from "@/theme/context"
import { FuelReceipt } from "@/types/fuel"
import { Header } from "@/components/Header"

export default function EnhancedFuelScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { receipts, addFuelReceipt, deleteFuelReceipt, isLoading } = useFuel()
  const { user, vehicleInfo } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    location: "",
    gallons: "",
    pricePerGallon: "",
    odometer: "",
    receiptImage: "",
  })

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
    })
  }

  const handleTakePhoto = async () => {
    if (Platform.OS === "web") {
      toast.warning("Camera functionality is not available on web.")
      return
    }

    // const { status } = await ImagePicker.requestCameraPermissionsAsync();
    // if (status !== 'granted') {
    //   toast.error('Camera permission is required to take photos.');
    //   return;
    // }

    // const result = await ImagePicker.launchCameraAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [4, 3],
    //   quality: 0.8,
    // });

    // if (!result.canceled && result.assets[0]) {
    //   setFormData(prev => ({
    //     ...prev,
    //     receiptImage: result.assets[0].uri,
    //   }));
    // }
  }

  const handleSelectImage = async () => {
    // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // if (status !== 'granted') {
    //   toast.error('Photo library permission is required to select images.');
    //   return;
    // }
    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [4, 3],
    //   quality: 0.8,
    // });
    // if (!result.canceled && result.assets[0]) {
    //   setFormData(prev => ({
    //     ...prev,
    //     receiptImage: result.assets[0].uri,
    //   }));
    // }
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

    const receipt: Omit<FuelReceipt, "id" | "createdAt"> = {
      purchaseDate: Date.now(),
      location: formData.location,
      gallons,
      pricePerGallon,
      totalAmount: gallons * pricePerGallon,
      receiptImage: formData.receiptImage || undefined,
      odometer: formData.odometer ? parseInt(formData.odometer) : undefined,
      vehicleId: vehicleInfo?.vehicle_unit || "unknown",
      driverId: user?.id || "unknown",
    }

    await addFuelReceipt(receipt)
    handleCancelAdd()
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
              onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
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
                onChangeText={(text) => setFormData((prev) => ({ ...prev, gallons: text }))}
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
                onChangeText={(text) => setFormData((prev) => ({ ...prev, pricePerGallon: text }))}
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
              onChangeText={(text) => setFormData((prev) => ({ ...prev, odometer: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.imageSection}>
            <Text style={[styles.label, { color: colors.text }]}>Receipt Photo (optional)</Text>

            {formData.receiptImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: formData.receiptImage }} style={styles.previewImage} />
                <Pressable
                  onPress={() => setFormData((prev) => ({ ...prev, receiptImage: "" }))}
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
              loading={isLoading}
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
               paddingLeft: 20
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
          data={receipts.sort((a: any, b: any) => b.purchaseDate - a.purchaseDate)}
          renderItem={renderReceiptItem}
          keyExtractor={(item) => item.id}
          style={styles.receiptsList}
          contentContainerStyle={styles.receiptsListContent}
        />
      )}
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
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
})
