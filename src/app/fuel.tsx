import React, { useState, useEffect } from "react"
import {
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
  ActivityIndicator,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as Location from "expo-location"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { Camera, ChevronDown, Edit, Fuel, MapPin, Gauge, DollarSign } from "lucide-react-native"

import { useCreateFuelPurchase, fuelPurchaseApi, CreateFuelPurchaseRequest } from "@/api/fuel-purchase"
import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import { FuelPurchasesList } from "@/components/FuelPurchasesList"
import { useLocation } from "@/contexts/location-context"

import { toast } from "@/components/Toast"
import { useFuel, useAuth } from "@/contexts"
import { useLocationData } from "@/hooks/useLocationData"
import { useEldVehicleData } from "@/hooks/useEldVehicleData"
import { useAppTheme } from "@/theme/context"
import { FuelReceipt } from "@/types/fuel"

import { Filter, List, Plus } from 'lucide-react-native'
import { Dimensions } from 'react-native'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

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

interface FormErrors {
  location?: string
  gallons?: string
  pricePerGallon?: string
  fuelGrade?: string
  iftaFuelType?: string
  purchaseState?: string
}

export default function EnhancedFuelScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { receipts, addFuelReceipt, deleteFuelReceipt, isLoading } = useFuel()
  const { user, driverProfile, vehicleAssignment } = useAuth()
  const { odometer: eldOdometer, isConnected: eldConnected } = useEldVehicleData()
  const locationData = useLocationData()
  const { requestLocation, hasPermission } = useLocation()
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list') // 'list' or 'add' - default is 'list'
  const [showFilters, setShowFilters] = useState(false)

  // Request location permission when form is shown
  useEffect(() => {
    if (showAddForm && !hasPermission) {
      // Request location permission when user opens the form
      requestLocation().catch((error) => {
        console.warn("Failed to request location permission:", error)
        // Don't block the user - they can enter location manually
      })
    }
  }, [showAddForm, hasPermission, requestLocation])

  // Auto-populate odometer and location from ELD device (priority) or fallback sources
  useEffect(() => {
    // Priority 1: Get odometer from ELD device using the hook
    if (eldOdometer.source === 'eld' && eldOdometer.value !== null && !formData.odometer && eldConnected) {
      setFormData((prev) => ({ ...prev, odometer: eldOdometer.value!.toString() }))
    }
    
    // Priority 2: Fallback to vehicle assignment odometer if ELD not available
    if (eldOdometer.source !== 'eld' && !formData.odometer && vehicleAssignment?.vehicle_info?.current_odometer) {
      const odometerValue = vehicleAssignment.vehicle_info.current_odometer
      const odometerStr = typeof odometerValue === 'object' && odometerValue?.value
        ? String(odometerValue.value)
        : String(odometerValue || '')
      
      if (odometerStr) {
        setFormData((prev) => ({ ...prev, odometer: odometerStr }))
      }
    }

    // Priority 1: Get location from ELD device (via locationData hook which prioritizes ELD)
    // Priority 2: Fallback to vehicle assignment location
    if (!formData.location) {
      // locationData already prioritizes ELD -> Expo GPS -> fallback
      const locationAddress = locationData.address 
        || vehicleAssignment?.vehicle_info?.current_location?.address
        || (locationData.latitude !== 0 && locationData.longitude !== 0 
          ? `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
          : '')
      
      if (locationAddress) {
        setFormData((prev) => ({ ...prev, location: locationAddress }))
      }
    }
  }, [eldOdometer, vehicleAssignment, locationData, formData.odometer, formData.location])


  // Fuel grade options
  const fuelGradeOptions = ["Unknown", "Regular", "Premium", "Mid-Grade", "Diesel"]

  // IFTA fuel type options - Must match backend IFTA_FUEL_TYPE_CHOICES exactly
  // Format: [backend_value, display_label]
  const iftaFuelTypeOptions: Array<{ value: string; label: string }> = [
    { value: "Unspecified", label: "Unspecified" },
    { value: "A55", label: "A55" },
    { value: "Biodiesel", label: "Biodiesel" },
    { value: "CompressedNaturalGas", label: "Compressed Natural Gas" },
    { value: "Diesel", label: "Diesel" },
    { value: "E85", label: "E85" },
    { value: "Electricity", label: "Electricity" },
    { value: "Ethanol", label: "Ethanol" },
    { value: "Gasohol", label: "Gasohol" },
    { value: "Gasoline", label: "Gasoline" },
    { value: "Hydrogen", label: "Hydrogen" },
    { value: "LiquifiedNaturalGas", label: "Liquified Natural Gas" },
    { value: "M85", label: "M85" },
    { value: "Methanol", label: "Methanol" },
    { value: "Propane", label: "Propane" },
    { value: "Other", label: "Other" },
  ]

  // US States - Get from states_hash.json
  const usStates = Object.keys(statesHash).sort() // Sort alphabetically by state code

  const handleTabChange = (tab: 'list' | 'add') => {
    setActiveTab(tab)
    if (tab === 'add') {
      setShowAddForm(true)
    } else {
      setShowAddForm(false)
    }
  }

  const handleCancelAdd = () => {
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
    setFormErrors({})
  }


  const handleTakePhoto = async () => {
    if (Platform.OS === "web") {
      toast.warning("Camera functionality is not available on web.")
      return
    }

    if (isSubmitting || isProcessingImage) {
      return
    }

    try {
      setIsProcessingImage(true)
      
      // Check current permission status
      let { status } = await ImagePicker.getCameraPermissionsAsync()
      
      // Request permission if not granted
      if (status !== "granted") {
        const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync()
        if (newStatus !== "granted") {
          toast.error("Camera permission is required to take receipt photos. Please enable it in settings.")
          setIsProcessingImage(false)
          return
        }
        status = newStatus
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Lower quality for smaller file size
        exif: false, // Don't include EXIF data for privacy
      })

      if (!result.canceled && result.assets[0]) {
        // Try to optimize image before storing, fallback to original if manipulation fails
        try {
          if (ImageManipulator && ImageManipulator.manipulateAsync) {
            const optimizedImage = await ImageManipulator.manipulateAsync(
              result.assets[0].uri,
              [{ resize: { width: 1200 } }], // Resize to max width 1200px
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            )
            setFormData((prev: FuelFormData) => ({
              ...prev,
              receiptImage: optimizedImage.uri,
            }))
            toast.success("Photo captured and optimized successfully")
          } else {
            // Fallback: use original image if manipulation is not available
            setFormData((prev: FuelFormData) => ({
              ...prev,
              receiptImage: result.assets[0].uri,
            }))
            toast.success("Photo captured successfully")
          }
        } catch (manipError: any) {
          // Fallback: use original image if manipulation fails
          console.warn("Image manipulation failed, using original:", manipError)
          setFormData((prev: FuelFormData) => ({
            ...prev,
            receiptImage: result.assets[0].uri,
          }))
          toast.success("Photo captured successfully")
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to access camera")
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleSelectImage = async () => {
    if (Platform.OS === "web") {
      toast.warning("Image selection is not available on web.")
      return
    }

    if (isSubmitting || isProcessingImage) {
      return
    }

    try {
      setIsProcessingImage(true)
      
      // Check and request media library permission
      let { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
      
      if (status !== "granted") {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (newStatus !== "granted") {
          toast.error("Photo library permission is required to select images. Please enable it in settings.")
          setIsProcessingImage(false)
          return
        }
        status = newStatus
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Lower quality for smaller file size
        exif: false, // Don't include EXIF data for privacy
      })
      
      if (!result.canceled && result.assets[0]) {
        // Try to optimize image before storing, fallback to original if manipulation fails
        try {
          if (ImageManipulator && ImageManipulator.manipulateAsync) {
            const optimizedImage = await ImageManipulator.manipulateAsync(
              result.assets[0].uri,
              [{ resize: { width: 1200 } }], // Resize to max width 1200px
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            )
            setFormData((prev: FuelFormData) => ({
              ...prev,
              receiptImage: optimizedImage.uri,
            }))
            toast.success("Image selected and optimized successfully")
          } else {
            // Fallback: use original image if manipulation is not available
            setFormData((prev: FuelFormData) => ({
              ...prev,
              receiptImage: result.assets[0].uri,
            }))
            toast.success("Image selected successfully")
          }
        } catch (manipError: any) {
          // Fallback: use original image if manipulation fails
          console.warn("Image manipulation failed, using original:", manipError)
          setFormData((prev: FuelFormData) => ({
            ...prev,
            receiptImage: result.assets[0].uri,
          }))
          toast.success("Image selected successfully")
        }
      }
    } catch (error: any) {
      console.error("Image selection error:", error)
      toast.error(error?.message || "Failed to select image")
    } finally {
      setIsProcessingImage(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    // Required fields validation
    if (!formData.location?.trim()) {
      errors.location = "Location is required"
    }

    if (!formData.gallons?.trim()) {
      errors.gallons = "Gallons is required"
    } else {
      const gallons = parseFloat(formData.gallons)
      if (isNaN(gallons) || gallons <= 0) {
        errors.gallons = "Please enter a valid gallons amount"
      }
    }

    if (!formData.pricePerGallon?.trim()) {
      errors.pricePerGallon = "Price per gallon is required"
    } else {
      const price = parseFloat(formData.pricePerGallon)
      if (isNaN(price) || price <= 0) {
        errors.pricePerGallon = "Please enter a valid price"
      }
    }

    // Now mandatory fields
    if (!formData.fuelGrade?.trim()) {
      errors.fuelGrade = "Fuel grade is required"
    }

    if (!formData.iftaFuelType?.trim()) {
      errors.iftaFuelType = "IFTA fuel type is required"
    }

    if (!formData.purchaseState?.trim()) {
      errors.purchaseState = "Purchase state is required"
    }

    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields correctly")
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (isSubmitting) {
      return
    }

    // Validate form
    if (!validateForm()) {
      return
    }

    // Validate vehicle assignment
    if (!vehicleAssignment?.vehicle_info?.id) {
      toast.error("No vehicle assigned. Please assign a vehicle first.")
      return
    }

    setIsSubmitting(true)
    setFormErrors({})

    try {
      const gallons = parseFloat(formData.gallons)
      const pricePerGallon = parseFloat(formData.pricePerGallon)

      // Convert gallons to liters (1 gallon = 3.78541 liters)
      const fuelQuantityLiters = gallons * 3.78541
      const totalAmount = gallons * pricePerGallon

      // Generate transaction reference (RCT- + timestamp for better uniqueness)
      const now = new Date()
      const transactionReference = `RCT-${now.getTime()}`

      // Get location from useLocationData hook (prioritizes ELD -> GPS -> fallback)
      let transactionLocation = formData.location.trim()
      let latitude: number | null = null
      let longitude: number | null = null
      let state: string | null = null
      
      // Request location permission if not granted and try to get location
      if (!hasPermission) {
        try {
          await requestLocation()
        } catch (error) {
          console.warn("Location permission request failed:", error)
          // Continue - user can enter location manually
        }
      }
      
      // If location is empty or fallback, try to get from locationData hook
      if (!transactionLocation || transactionLocation === 'fallback location' || transactionLocation.includes('fallback')) {
        // Priority 1: Use locationData hook (ELD or GPS)
        if (locationData.address && locationData.address !== 'fallback location') {
          transactionLocation = locationData.address
          latitude = locationData.latitude !== 0 ? locationData.latitude : null
          longitude = locationData.longitude !== 0 ? locationData.longitude : null
        } else if (locationData.latitude !== 0 && locationData.longitude !== 0) {
          // Fallback to coordinates if address not available
          latitude = locationData.latitude
          longitude = locationData.longitude
          transactionLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        } else if (vehicleAssignment?.vehicle_info?.current_location?.address) {
          // Priority 2: Use vehicle assignment location
          transactionLocation = vehicleAssignment.vehicle_info.current_location.address
          if (vehicleAssignment.vehicle_info.current_location.latitude) {
            latitude = vehicleAssignment.vehicle_info.current_location.latitude
          }
          if (vehicleAssignment.vehicle_info.current_location.longitude) {
            longitude = vehicleAssignment.vehicle_info.current_location.longitude
          }
          if (vehicleAssignment.vehicle_info.current_location.state) {
            state = vehicleAssignment.vehicle_info.current_location.state
          }
        } else {
          // Location is required - but allow user to enter manually
          // If still empty after all attempts, show warning but allow submission
          if (!transactionLocation || transactionLocation.trim() === '') {
            toast.warning("Location not available. Please enter location manually.")
            // Don't block submission - location field is mandatory in form validation
            // The form validation will catch if it's still empty
          }
        }
      } else {
        // Location was manually entered, try to get coordinates from locationData
        if (locationData.latitude !== 0 && locationData.longitude !== 0) {
          latitude = locationData.latitude
          longitude = locationData.longitude
        }
      }
      
      // Final check: if location is still empty, don't proceed
      if (!transactionLocation || transactionLocation.trim() === '') {
        toast.error("Location is required. Please enter a location.")
        setIsSubmitting(false)
        return
      }

      // Extract state from location using reverse geocoding if we have coordinates
      if (!state && latitude && longitude) {
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          })
          if (reverseGeocode && reverseGeocode.length > 0) {
            const addr = reverseGeocode[0]
            // Use region (state) from reverse geocode
            if (addr.region) {
              // Check if it's a 2-letter code or full name
              if (addr.region.length === 2) {
                state = addr.region.toUpperCase()
              } else {
                // Try to find state code from states_hash.json
                const stateCode = Object.keys(statesHash).find(
                  (code) => statesHash[code as keyof typeof statesHash] === addr.region
                )
                state = stateCode || addr.region
              }
            }
          }
        } catch (geocodeError) {
          console.warn("Reverse geocoding for state extraction failed:", geocodeError)
        }
      }

      // Fallback: Extract state from location string if not already set
      if (!state && transactionLocation) {
        // Try to extract state from address (e.g., "Los Angeles, CA 90001" or "CA")
        const stateMatch = transactionLocation.match(/\b([A-Z]{2})\b/) // Match 2-letter state code
        if (stateMatch) {
          state = stateMatch[1]
        } else {
          // Try to extract from vehicle assignment
          state = vehicleAssignment?.vehicle_info?.current_location?.state || null
        }
      }

      // Get driver and vehicle IDs
      const driverId = driverProfile?.driver_id || (driverProfile as any)?.id || user?.id || null
      // Vehicle ID: Try to get numeric ID, fallback to parsing UUID if needed
      // Backend may expect vehicle_id as number or may extract it from vehicleId UUID
      let vehicleId: number | null = null
      if (vehicleAssignment?.vehicle_info) {
        // Try to find a numeric ID field (some APIs have both UUID and numeric ID)
        const vehicleInfo = vehicleAssignment.vehicle_info as any
        if (vehicleInfo.vehicle_id && typeof vehicleInfo.vehicle_id === 'number') {
          vehicleId = vehicleInfo.vehicle_id
        } else if (vehicleInfo.id) {
          // If ID is numeric string, parse it
          const parsedId = parseInt(vehicleInfo.id)
          if (!isNaN(parsedId)) {
            vehicleId = parsedId
          }
        }
      }

      // Step 1: Create fuel purchase first (to get purchase ID)
      // Backend expects snake_case field names (based on error messages)
      const createPayload: CreateFuelPurchaseRequest = {
        vehicleId: vehicleAssignment.vehicle_info.id, // UUID string
        // Required fields - using snake_case as backend expects
        fuel_quantity_liters: parseFloat(fuelQuantityLiters.toFixed(2)), // Backend may expect number
        fuelQuantityLiters: fuelQuantityLiters.toFixed(2), // Also send as string for API client
        transaction_reference: transactionReference,
        transactionReference: transactionReference,
        transaction_time: now.toISOString(),
        transactionTime: now.toISOString(),
        transaction_location: transactionLocation,
        transactionLocation: transactionLocation,
        transaction_price: {
          amount: totalAmount.toFixed(2),
          currency: "usd",
        },
        transactionPrice: {
          amount: totalAmount.toFixed(2),
          currency: "usd",
        },
        // Location data
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        // State (extracted from location)
        state: state || undefined,
        // Optional fields (but we're sending them as they're now mandatory in our form)
        merchant_name: transactionLocation.split(",")[0]?.trim() || "Unknown",
        merchantName: transactionLocation.split(",")[0]?.trim() || "Unknown",
        ifta_fuel_type: formData.iftaFuelType.trim(),
        iftaFuelType: formData.iftaFuelType.trim(),
        fuel_grade: formData.fuelGrade.trim(),
        fuelGrade: formData.fuelGrade.trim(),
        // Driver and vehicle info
        driver_id: driverId || undefined,
        vehicle_id: vehicleId || undefined,
        // Purchase state (from form)
        purchase_state: formData.purchaseState || undefined,
        source: "mobile_app", // Indicate this came from mobile app
      }

      const createResponse = await createFuelPurchaseMutation.mutateAsync(createPayload)
      console.log("📦 Create fuel purchase response:", JSON.stringify(createResponse, null, 2))
      
      // Handle response structure - API client returns response.data which is the fuel purchase object
      // The fuel purchase object has an 'id' field directly
      const fuelPurchaseId = createResponse?.id
      
      if (!fuelPurchaseId) {
        console.error("❌ Failed to get fuel purchase ID from response:", createResponse)
        toast.error("Failed to create fuel purchase. Please try again.")
        setIsSubmitting(false)
        return
      }

      console.log("✅ Fuel purchase created with ID:", fuelPurchaseId)

      // Step 2: Upload receipt image if available (using 3-step S3 flow)
      // Only upload after purchase is created successfully
      console.log("📸 Checking for receipt image...", {
        hasImage: !!formData.receiptImage,
        imageUri: formData.receiptImage ? formData.receiptImage.substring(0, 50) + '...' : 'none'
      })
      
      if (formData.receiptImage && formData.receiptImage.trim() !== '') {
        console.log("📸 Starting receipt image upload for purchase ID:", fuelPurchaseId)
        try {
          let imageUri = formData.receiptImage
          console.log("📸 Image URI:", imageUri.substring(0, 100) + '...')
          
          // Try to further optimize image before upload (ensure it's under 2MB)
          // If ImageManipulator is not available, continue with original image
          try {
            if (ImageManipulator && typeof ImageManipulator.manipulateAsync === 'function') {
              console.log("📸 Attempting to optimize image...")
              const optimizedImage = await ImageManipulator.manipulateAsync(
                formData.receiptImage,
                [{ resize: { width: 1200 } }], // Max width 1200px
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Further compression for upload
              )
              imageUri = optimizedImage.uri
              console.log("✅ Image optimized successfully")
            } else {
              console.warn("⚠️ ImageManipulator not available, using original image")
            }
          } catch (manipError: any) {
            console.warn("⚠️ Image optimization failed, using original image:", manipError.message)
            // Continue with original image - don't block upload
          }

          const dateStr = now.toISOString().split("T")[0].replace(/-/g, "")
          const filename = `receipt_${dateStr}_${Date.now()}.jpg`
          
          console.log("📸 Uploading image with params:", {
            fuelPurchaseId,
            filename,
            contentType: "image/jpeg"
          })

          const uploadResponse = await fuelPurchaseApi.uploadReceiptImage(
            fuelPurchaseId,
            imageUri,
            filename,
            "image/jpeg"
          )
          
          console.log("📸 Upload response:", uploadResponse)

          // Update fuel purchase with receipt URL after successful upload
          // The backend should handle this in confirmReceiptUpload, but we can also send it here if needed
          if (uploadResponse.receiptUrl) {
            // Note: The backend should automatically update receipt_image_url in confirmReceiptUpload
            // If not, we may need to add a PATCH endpoint to update the fuel purchase
            console.log("✅ Receipt uploaded, URL:", uploadResponse.receiptUrl)
          }

          toast.success("Receipt uploaded successfully")
          console.log("✅ Receipt upload completed successfully")
        } catch (uploadError: any) {
          console.error("❌ Receipt upload error:", uploadError)
          toast.warning("Receipt upload failed, but purchase was recorded.")
          // Don't block the flow - purchase was created successfully
        }
      } else {
        console.log("ℹ️ No receipt image to upload")
      }

      // Also add to local context for UI display
      const receipt: Omit<FuelReceipt, "id" | "createdAt"> = {
        purchaseDate: now.getTime(),
        location: formData.location,
        gallons,
        pricePerGallon,
        totalAmount,
        receiptImage: formData.receiptImage || undefined,
        odometer: formData.odometer ? parseInt(formData.odometer) : undefined,
        vehicleId: vehicleAssignment.vehicle_info.vehicle_unit || "unknown",
        driverId: driverProfile?.driver_id || "unknown",
      }
      await addFuelReceipt(receipt)

      toast.success("Fuel purchase recorded successfully")
      handleCancelAdd()
    } catch (error: any) {
      console.error("❌ Failed to create fuel purchase:", error)
      toast.error(error?.message || "Failed to record fuel purchase")
    } finally {
      setIsSubmitting(false)
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
        RightActionComponent={
          activeTab === 'list' ? (
            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              style={[styles.filterButton, { backgroundColor: colors.PRIMARY + '20' }]}
            >
              <Filter size={20} color={colors.PRIMARY} />
            </TouchableOpacity>
          ) : undefined
        }
        safeAreaEdges={["top"]}
      />

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'list' && [styles.tabButtonActive, { backgroundColor: colors.PRIMARY }],
          ]}
          onPress={() => handleTabChange('list')}
        >
          <List size={20} color={activeTab === 'list' ? '#FFFFFF' : colors.textDim} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'list' ? '#FFFFFF' : colors.textDim },
            activeTab === 'list' && styles.tabButtonTextActive
          ]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'add' && [styles.tabButtonActive, { backgroundColor: colors.PRIMARY }],
          ]}
          onPress={() => handleTabChange('add')}
        >
          <Plus size={20} color={activeTab === 'add' ? '#FFFFFF' : colors.textDim} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'add' ? '#FFFFFF' : colors.textDim },
            activeTab === 'add' && styles.tabButtonTextActive
          ]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Show Add Form View */}
      {activeTab === 'add' && (
        <ScrollView 
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Header Card */}
          <LinearGradient
            colors={[colors.PRIMARY, `${colors.PRIMARY}DD`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.headerCardContent}>
              <View style={styles.headerIconContainer}>
                <Fuel size={32} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Record Fuel Purchase</Text>
                <Text style={styles.headerSubtitle}>
                  {vehicleAssignment?.vehicle_info?.vehicle_unit || 'Vehicle'} • IFTA Compliant
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Location Input with Icon */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <MapPin size={18} color={colors.PRIMARY} />
              <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
            </View>
            <TextInput
              editable={!isSubmitting}
              style={[
                styles.premiumInput,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  color: colors.text,
                  borderColor: formErrors.location 
                    ? colors.error 
                    : (formData.location ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              placeholder="Gas station name or location"
              placeholderTextColor={colors.textDim}
              value={formData.location}
              onChangeText={(text: string) => {
                setFormData((prev: FuelFormData) => ({ ...prev, location: text }))
                if (formErrors.location) {
                  setFormErrors((prev) => ({ ...prev, location: undefined }))
                }
              }}
              autoCapitalize="words"
            />
            {formErrors.location && (
              <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.location}</Text>
            )}
            {locationData.source === 'eld' && (
              <Text style={[styles.helperText, { color: colors.PRIMARY }]}>
                📍 Auto-filled from ELD device location
              </Text>
            )}
            {locationData.source === 'expo' && locationData.address && (
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                📍 Auto-filled from device GPS
              </Text>
            )}
          </ElevatedCard>

          {/* Gallons and Price Row */}
          <View style={styles.inputRow}>
            <ElevatedCard style={[styles.inputCard, { flex: 1, marginRight: 8 }]}>
              <View style={styles.inputHeader}>
                <Fuel size={18} color={colors.PRIMARY} />
                <Text style={[styles.label, { color: colors.text }]}>Gallons *</Text>
              </View>
              <TextInput
                editable={!isSubmitting}
                style={[
                  styles.premiumInput,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    color: colors.text,
                    borderColor: formErrors.gallons 
                      ? colors.error 
                      : (formData.gallons ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                    opacity: isSubmitting ? 0.6 : 1,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                value={formData.gallons}
                onChangeText={(text: string) => {
                  setFormData((prev: FuelFormData) => ({ ...prev, gallons: text }))
                  if (formErrors.gallons) {
                    setFormErrors((prev) => ({ ...prev, gallons: undefined }))
                  }
                }}
                keyboardType="decimal-pad"
              />
              {formErrors.gallons && (
                <Text style={[styles.errorText, { color: colors.error, marginTop: 4 }]}>{formErrors.gallons}</Text>
              )}
            </ElevatedCard>

            <ElevatedCard style={[styles.inputCard, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.inputHeader}>
                <DollarSign size={18} color={colors.PRIMARY} />
                <Text style={[styles.label, { color: colors.text }]}>Price/Gallon *</Text>
              </View>
              <TextInput
                editable={!isSubmitting}
                style={[
                  styles.premiumInput,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    color: colors.text,
                    borderColor: formErrors.pricePerGallon 
                      ? colors.error 
                      : (formData.pricePerGallon ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                    opacity: isSubmitting ? 0.6 : 1,
                  },
                ]}
                placeholder="0.000"
                placeholderTextColor={colors.textDim}
                value={formData.pricePerGallon}
                onChangeText={(text: string) => {
                  setFormData((prev: FuelFormData) => ({ ...prev, pricePerGallon: text }))
                  if (formErrors.pricePerGallon) {
                    setFormErrors((prev) => ({ ...prev, pricePerGallon: undefined }))
                  }
                }}
                keyboardType="decimal-pad"
              />
              {formErrors.pricePerGallon && (
                <Text style={[styles.errorText, { color: colors.error, marginTop: 4 }]}>{formErrors.pricePerGallon}</Text>
              )}
            </ElevatedCard>
          </View>

          {/* Total Amount Display */}
          {formData.gallons && formData.pricePerGallon && 
           !isNaN(parseFloat(formData.gallons)) && !isNaN(parseFloat(formData.pricePerGallon)) && (
            <ElevatedCard style={[styles.totalCard, { backgroundColor: `${colors.PRIMARY}15` }]}>
              <Text style={[styles.totalLabel, { color: colors.textDim }]}>Total Amount</Text>
              <Text style={[styles.totalValue, { color: colors.PRIMARY }]}>
                ${(parseFloat(formData.gallons) * parseFloat(formData.pricePerGallon)).toFixed(2)}
              </Text>
            </ElevatedCard>
          )}

          {/* Odometer Input with Icon */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Gauge size={18} color={colors.PRIMARY} />
              <Text style={[styles.label, { color: colors.text }]}>Odometer (optional)</Text>
            </View>
            <TextInput
              editable={!isSubmitting}
              style={[
                styles.premiumInput,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  color: colors.text,
                  borderColor: formData.odometer ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB"),
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              placeholder="Current mileage"
              placeholderTextColor={colors.textDim}
              value={formData.odometer}
              onChangeText={(text: string) => setFormData((prev: FuelFormData) => ({ ...prev, odometer: text }))}
              keyboardType="numeric"
            />
            {eldOdometer.source === 'eld' && eldOdometer.value !== null && (
              <Text style={[styles.helperText, { color: colors.PRIMARY }]}>
                📊 Auto-filled from ELD device ({eldOdometer.value.toLocaleString()} {eldOdometer.unit})
              </Text>
            )}
            {eldOdometer.source !== 'eld' && vehicleAssignment?.vehicle_info?.current_odometer && (
              <Text style={[styles.helperText, { color: colors.textDim }]}>
                📊 Auto-filled from vehicle assignment
              </Text>
            )}
          </ElevatedCard>

          {/* Fuel Grade Selector - Now Required */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Fuel Grade *</Text>
              {formErrors.fuelGrade && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.fuelGrade}</Text>
              )}
            </View>
            <TouchableOpacity
              disabled={isSubmitting}
              style={[
                styles.premiumSelector,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: formErrors.fuelGrade 
                    ? colors.error 
                    : (formData.fuelGrade ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onPress={() => !isSubmitting && setShowFuelGradeModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.fuelGrade ? colors.text : colors.textDim,
                    fontWeight: formData.fuelGrade ? '600' : '400',
                  },
                ]}
              >
                {formData.fuelGrade || "Select fuel grade"}
              </Text>
              <ChevronDown size={20} color={formData.fuelGrade ? colors.PRIMARY : colors.textDim} />
            </TouchableOpacity>
          </ElevatedCard>

          {/* IFTA Fuel Type Selector - Now Required */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={[styles.label, { color: colors.text }]}>IFTA Fuel Type *</Text>
              {formErrors.iftaFuelType && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.iftaFuelType}</Text>
              )}
            </View>
            <TouchableOpacity
              disabled={isSubmitting}
              style={[
                styles.premiumSelector,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: formErrors.iftaFuelType 
                    ? colors.error 
                    : (formData.iftaFuelType ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onPress={() => !isSubmitting && setShowIftaFuelTypeModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.iftaFuelType ? colors.text : colors.textDim,
                    fontWeight: formData.iftaFuelType ? '600' : '400',
                  },
                ]}
              >
                {formData.iftaFuelType 
                  ? iftaFuelTypeOptions.find(opt => opt.value === formData.iftaFuelType)?.label || formData.iftaFuelType
                  : "Select fuel type"}
              </Text>
              <ChevronDown size={20} color={formData.iftaFuelType ? colors.PRIMARY : colors.textDim} />
            </TouchableOpacity>
          </ElevatedCard>

          {/* Purchase State Selector - Now Required */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={[styles.label, { color: colors.text }]}>Purchase State *</Text>
              {formErrors.purchaseState && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formErrors.purchaseState}</Text>
              )}
            </View>
            <TouchableOpacity
              disabled={isSubmitting}
              style={[
                styles.premiumSelector,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: formErrors.purchaseState 
                    ? colors.error 
                    : (formData.purchaseState ? colors.PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB")),
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onPress={() => !isSubmitting && setShowStateModal(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: formData.purchaseState ? colors.text : colors.textDim,
                    fontWeight: formData.purchaseState ? '600' : '400',
                  },
                ]}
              >
                {formData.purchaseState
                  ? statesHash[formData.purchaseState as keyof typeof statesHash]
                  : "Select state"}
              </Text>
              <ChevronDown size={20} color={formData.purchaseState ? colors.PRIMARY : colors.textDim} />
            </TouchableOpacity>
          </ElevatedCard>

          {/* Receipt Photo Section */}
          <ElevatedCard style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Camera size={18} color={colors.PRIMARY} />
              <Text style={[styles.label, { color: colors.text }]}>Receipt Photo (optional)</Text>
            </View>

            {formData.receiptImage ? (
              <View style={styles.imagePreview}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: formData.receiptImage }} style={styles.previewImage} />
                  <Pressable
                    onPress={() => setFormData((prev: FuelFormData) => ({ ...prev, receiptImage: "" }))}
                    style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                  >
                    <Text style={styles.removeImageText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  disabled={isSubmitting || isProcessingImage}
                  style={[
                    styles.imageButton,
                    {
                      backgroundColor: `${colors.PRIMARY}15`,
                      borderColor: colors.PRIMARY,
                      opacity: (isSubmitting || isProcessingImage) ? 0.6 : 1,
                    },
                  ]}
                >
                  {isProcessingImage ? (
                    <ActivityIndicator size="small" color={colors.PRIMARY} />
                  ) : (
                    <Camera size={24} color={colors.PRIMARY} />
                  )}
                  <Text style={[styles.imageButtonText, { color: colors.PRIMARY }]}>
                    {isProcessingImage ? "Processing..." : "Take Photo"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSelectImage}
                  disabled={isSubmitting || isProcessingImage}
                  style={[
                    styles.imageButton,
                    {
                      backgroundColor: isDark ? colors.surface : "#F9FAFB",
                      borderColor: colors.PRIMARY,
                      opacity: (isSubmitting || isProcessingImage) ? 0.6 : 1,
                    },
                  ]}
                >
                  {isProcessingImage ? (
                    <ActivityIndicator size="small" color={colors.PRIMARY} />
                  ) : (
                    <Edit size={24} color={colors.PRIMARY} />
                  )}
                  <Text style={[styles.imageButtonText, { color: colors.PRIMARY }]}>
                    {isProcessingImage ? "Processing..." : "Select Image"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ElevatedCard>

          {/* Action Buttons */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              onPress={handleCancelAdd}
              disabled={isSubmitting}
              style={[
                styles.cancelButton,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  borderColor: colors.border,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.PRIMARY,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Show Listing View */}
      {activeTab === 'list' && (
        <FuelPurchasesList
          showFilters={showFilters}
          onFilterPress={() => setShowFilters(false)}
        />
      )}

      {/* Modals - Always rendered when form is shown */}
        {/* Fuel Grade Selection Modal */}
        <Modal
          visible={showFuelGradeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFuelGradeModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowFuelGradeModal(false)}>
            <View 
              style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
              onStartShouldSetResponder={() => true}
            >
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
            <View 
              style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select IFTA Fuel Type</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {iftaFuelTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.modalOption,
                      {
                        backgroundColor:
                          formData.iftaFuelType === option.value
                            ? colors.palette.primary500
                            : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setFormData((prev: FuelFormData) => ({ ...prev, iftaFuelType: option.value }))
                      setShowIftaFuelTypeModal(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        {
                          color: formData.iftaFuelType === option.value ? "#fff" : colors.text,
                        },
                      ]}
                    >
                      {option.label}
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
            <View 
              style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}
              onStartShouldSetResponder={() => true}
            >
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
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 113, 206, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "700" as const,
    marginTop: 16,
    textAlign: "center",
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formButtons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
    marginBottom: 140
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#0071ce",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "rgba(255, 255, 255, 0.9)",
  },
  inputCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500" as const,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500" as const,
  },
  totalCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "rgba(0, 113, 206, 0.2)",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "800" as const,
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
    gap: 12,
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  imageContainer: {
    width: "100%",
    alignItems: "center",
  },
  imagePreview: {
    alignItems: "center",
    marginTop: 8,
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
  premiumInput: {
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 16,
    height: 56,
    paddingHorizontal: 16,
    fontWeight: "500" as const,
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
    borderRadius: 16,
    height: 200,
    marginBottom: 12,
    width: "100%",
    maxWidth: 300,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  receiptCard: {
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
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
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  premiumSelector: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    borderWidth: 1,
  },
  applyButton: {
    // backgroundColor set inline
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectorText: {
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0071ce",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    // backgroundColor set inline
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontWeight: '700',
  },
})
