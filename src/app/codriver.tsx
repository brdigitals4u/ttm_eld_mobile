import React, { useState } from "react"
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native"
import { router } from "expo-router"
import { ArrowLeft, Mail, Plus, User, UserMinus, UserPlus, Users } from "lucide-react-native"

import { useDrivers, useCreateCoDriverEvent } from "@/api/drivers"
import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { SafeAreaContainer } from "@/components/SafeAreaContainer"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { useCoDriver } from "@/contexts"
import { useLocationData } from "@/hooks/useLocationData"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { CoDriver } from "@/types/codriver"

export default function CoDriverScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { coDrivers, activeCoDriver, addCoDriver, removeCoDriver, setActiveCoDriver, isLoading } =
    useCoDriver()
  const { driverProfile, vehicleAssignment, isAuthenticated } = useAuth()
  const locationData = useLocationData()
  const createCoDriverEventMutation = useCreateCoDriverEvent()
  // GET API: Fetch all drivers for co-driver selection
  const { data: driversList, isLoading: isDriversLoading } = useDrivers({
    enabled: isAuthenticated,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    licenseNumber: "",
  })

  const handleAddCoDriver = () => {
    setShowAddForm(true)
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setFormData({
      name: "",
      email: "",
      licenseNumber: "",
    })
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.licenseNumber) {
      toast.warning("Please fill in all fields.")
      return
    }

    const coDriverData: Omit<CoDriver, "id" | "addedAt"> = {
      ...formData,
      isActive: false,
    }

    await addCoDriver(coDriverData)
    handleCancelAdd()
  }

  const handleRemoveCoDriver = (id: string, name: string) => {
    try {
      removeCoDriver(id as any)
      toast.success(`${name} removed successfully`)
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove co-driver")
    }
  }

  const handleSetActive = async (id: string) => {
    const isCurrentlyActive = activeCoDriver?.id === id
    const coDriver = coDrivers.find((cd) => cd.id === id)

    if (!coDriver) {
      toast.error("Co-driver not found")
      return
    }

    try {
      const vehicleId = vehicleAssignment?.vehicle_info?.id
        ? parseInt(vehicleAssignment.vehicle_info.id)
        : undefined

      if (!vehicleId) {
        toast.error("No vehicle assigned. Cannot activate co-driver.")
        return
      }

      if (!driverProfile?.driver_id) {
        toast.error("Driver information not available")
        return
      }

      if (isCurrentlyActive) {
        // Deactivating: Create co_driver_logout event
        await createCoDriverEventMutation.mutateAsync({
          driver: driverProfile.driver_id,
          vehicle: vehicleId,
          event_type: "co_driver_logout",
          event_time: new Date().toISOString(),
          event_location: locationData.address || undefined,
          remark: `Co-driver ${coDriver.name} logged out`,
          event_data: {
            co_driver_id: id,
            co_driver_name: coDriver.name,
          },
        })

        setActiveCoDriver(null)
        toast.success(`${coDriver.name} has been logged out`)
      } else {
        // Activating: Create co_driver_login event
        await createCoDriverEventMutation.mutateAsync({
          driver: driverProfile.driver_id,
          vehicle: vehicleId,
          event_type: "co_driver_login",
          event_time: new Date().toISOString(),
          event_location: locationData.address || undefined,
          remark: `Co-driver ${coDriver.name} logged in`,
          event_data: {
            co_driver_id: id,
            co_driver_name: coDriver.name,
          },
        })

        setActiveCoDriver(id)
        toast.success(`${coDriver.name} has been logged in`)
      }
    } catch (error: any) {
      console.error("Failed to create co-driver event:", error)
      toast.error(error?.message || "Failed to update co-driver status")
    }
  }

  const renderCoDriverItem = ({ item }: { item: CoDriver }) => (
    <ElevatedCard style={styles.coDriverCard}>
      <View style={styles.coDriverHeader}>
        <View style={styles.coDriverInfo}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: isDark ? colors.surface : "#F3F4F6",
                borderColor: colors.tint,
              },
            ]}
          >
            <User size={24} color={colors.tint} />
          </View>
          <View style={styles.coDriverDetails}>
            <Text style={[styles.coDriverName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.coDriverEmail, { color: colors.textDim }]}>{item.email}</Text>
            <Text style={[styles.coDriverLicense, { color: colors.textDim }]}>
              License: {item.licenseNumber}
            </Text>
          </View>
        </View>

        {activeCoDriver?.id === item.id && (
          <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.coDriverActions}>
        <LoadingButton
          title={activeCoDriver?.id === item.id ? "Deactivate" : "Set Active"}
          onPress={() => handleSetActive(item.id)}
          variant={activeCoDriver?.id === item.id ? "outline" : "primary"}
          icon={
            activeCoDriver?.id === item.id ? (
              <UserMinus size={16} color={colors.tint} />
            ) : (
              <UserPlus size={16} color={isDark ? colors.text : "#fff"} />
            )
          }
          style={{ flex: 1, marginRight: 8 }}
          loading={createCoDriverEventMutation.isPending}
          disabled={createCoDriverEventMutation.isPending}
        />
        <LoadingButton
          title="Remove"
          onPress={() => handleRemoveCoDriver(item.id, item.name)}
          variant="danger"
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>
    </ElevatedCard>
  )

  if (showAddForm) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={handleCancelAdd} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Add Co-Driver</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              placeholder="Enter co-driver's full name"
              placeholderTextColor={colors.textDim}
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              placeholder="Enter email address"
              placeholderTextColor={colors.textDim}
              value={formData.email}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>License Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : "#F3F4F6",
                  color: colors.text,
                  borderColor: isDark ? "transparent" : "#E5E7EB",
                },
              ]}
              placeholder="Enter driver's license number"
              placeholderTextColor={colors.textDim}
              value={formData.licenseNumber}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, licenseNumber: text }))}
              autoCapitalize="characters"
            />
          </View>

          <SafeAreaContainer edges={["bottom"]} bottomPadding={16}>
            <View style={styles.formButtons}>
              <LoadingButton
                title="Cancel"
                onPress={handleCancelAdd}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <LoadingButton
                title="Add Co-Driver"
                onPress={handleSubmit}
                loading={isLoading}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </SafeAreaContainer>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Co-Drivers</Text>
        <LoadingButton
          title="Add"
          onPress={handleAddCoDriver}
          icon={<Plus size={16} color={isDark ? colors.text : "#fff"} />}
        />
      </View>

      {activeCoDriver && (
        <ElevatedCard style={[styles.activeDriverCard, { backgroundColor: colors.success }]}>
          <View style={styles.activeDriverContent}>
            <UserPlus size={24} color="#fff" />
            <View style={styles.activeDriverText}>
              <Text style={styles.activeDriverTitle}>Active Co-Driver</Text>
              <Text style={styles.activeDriverName}>{activeCoDriver.name}</Text>
            </View>
          </View>
        </ElevatedCard>
      )}

      {coDrivers.length === 0 ? (
        <ElevatedCard style={styles.emptyContainer}>
          <Users size={48} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No co-drivers added</Text>
          <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
            Add co-drivers to manage team driving
          </Text>
        </ElevatedCard>
      ) : (
        <FlatList
          data={coDrivers}
          renderItem={renderCoDriverItem}
          keyExtractor={(item) => item.id}
          style={styles.coDriversList}
          contentContainerStyle={styles.coDriversListContent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  activeDriverCard: {
    marginBottom: 16,
    marginHorizontal: 20,
  },
  activeDriverContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  activeDriverName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  activeDriverText: {
    flex: 1,
    marginLeft: 12,
  },
  activeDriverTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  avatarContainer: {
    alignItems: "center",
    borderRadius: 25,
    borderWidth: 2,
    height: 50,
    justifyContent: "center",
    marginRight: 12,
    width: 50,
  },
  backButton: {
    padding: 8,
  },
  coDriverActions: {
    flexDirection: "row",
  },
  coDriverCard: {
    marginBottom: 16,
  },
  coDriverDetails: {
    flex: 1,
  },
  coDriverEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  coDriverHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  coDriverInfo: {
    flexDirection: "row",
    flex: 1,
  },
  coDriverLicense: {
    fontSize: 12,
  },
  coDriverName: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  coDriversList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  coDriversListContent: {
    paddingBottom: 20,
  },
  container: {
    flex: 1,
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
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
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  placeholder: {
    width: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
})
