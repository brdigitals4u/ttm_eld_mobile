import React, { useState, useMemo } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { router, Stack } from "expo-router"
import { ArrowLeft } from "lucide-react-native"

import { TrailerList } from "@/components/TrailerList"
import { useVehicles } from "@/api/vehicles"
import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { ShipperList } from "@/components/ShipperList"
import { toast } from "@/components/Toast"
import { useLocationData } from "@/hooks/useLocationData"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { Header } from "@/components/Header"

export default function AssignmentsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { driverProfile, vehicleAssignment, isAuthenticated } = useAuth()
  const locationData = useLocationData()

  // GET API: Get vehicles - show only vehicle assigned to driver (from vehicleAssignment)
  // Note: Vehicle assignment is managed by organization admin, driver can only view assigned vehicle
  const assignedVehicleId = vehicleAssignment?.vehicle_info?.id
    ? parseInt(vehicleAssignment.vehicle_info.id)
    : null
  const { data: allVehicles, isLoading: vehiclesLoading } = useVehicles({
    enabled: isAuthenticated,
  })

  // Filter to show only assigned vehicle
  const vehicles = useMemo(() => {
    if (!allVehicles || !assignedVehicleId) return []
    return allVehicles.filter((v) => v.id === assignedVehicleId)
  }, [allVehicles, assignedVehicleId])

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(
    vehicleAssignment?.vehicle_info?.vehicle_unit || null,
  )



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
      <Header
        title={translate("assignments.title" as any)}
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
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Vehicle Section - Show assigned vehicle */}
        {vehicles.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {translate("assignments.vehicle" as any)}
            </Text>
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
        <TrailerList />

        {/* Shipping IDs Section */}
        <View style={styles.section}>
          <ShipperList />
        </View>

        <LoadingButton
          title="Done"
          onPress={() => router.back()}
          fullWidth
          style={styles.doneButton}
        />
      </ScrollView>
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
  emptyText: {
    fontSize: 14,
    padding: 16,
    textAlign: "center",
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
