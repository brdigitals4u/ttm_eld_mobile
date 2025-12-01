/**
 * Vehicle & Trip Assignment Component
 *
 * Displays vehicle and trip assignment information in clean, modern UI.
 * Allows editing/updating assignments.
 */

import React, { useState, useMemo } from "react"
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native"
import { format } from "date-fns"
import { Package, Edit2, AlertCircle } from "lucide-react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"

import { useMyVehicle, useMyTrips, useAvailableVehicles } from "@/api/driver-hooks"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

interface VehicleTripAssignmentProps {
  onEditVehicle?: () => void
  onEditTrip?: () => void
}

export const VehicleTripAssignment: React.FC<VehicleTripAssignmentProps> = ({
  onEditVehicle,
  onEditTrip,
}) => {
  // Get theme colors - supports both light and dark themes
  const { theme } = useAppTheme()
  const { colors } = theme

  const { isAuthenticated, vehicleAssignment, user } = useAuth()
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [showTripSelector, setShowTripSelector] = useState(false)

  // Fetch data from API (as fallback/refresh)
  const {
    data: vehicleData,
    isLoading: vehicleLoading,
    refetch: refetchVehicle,
  } = useMyVehicle(isAuthenticated)
  const {
    data: tripsData,
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useMyTrips({ status: "active" }, isAuthenticated)
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehicles(
    { status: "active" },
    isAuthenticated && showVehicleSelector,
  )

  // Use auth store vehicle assignment first (from login), fallback to API data
  const vehicle = useMemo(() => {
    // Priority 1: Vehicle from auth store (login data)
    if (vehicleAssignment?.vehicle_info && vehicleAssignment.has_vehicle_assigned) {
      return vehicleAssignment.vehicle_info
    }
    // Priority 2: Vehicle from API
    return vehicleData?.vehicle || null
  }, [vehicleAssignment, vehicleData])

  // Use API trips data (trips are not in auth store typically)
  const activeTrip = useMemo(() => {
    if (!tripsData?.trips) return null
    // Get the most recent active trip, or first active trip
    const activeTrips = tripsData.trips.filter(
      (t) => t.status === "active" || t.status === "assigned",
    )
    return activeTrips.length > 0 ? activeTrips[0] : tripsData.trips[0]
  }, [tripsData])

  // If no trip from API but user.id exists, create a synthetic trip for display
  const displayTrip = useMemo(() => {
    if (activeTrip) return activeTrip
    // If user.id exists (shipping ID), show it as trip info
    if (user?.id) {
      return {
        shipping_id: user.id,
        status: "active",
        start_location: { address: "N/A" },
        end_location: { address: "N/A" },
        trip_start_time: new Date().toISOString(),
      } as any
    }
    return null
  }, [activeTrip, user?.id])

  const hasVehicle = !!vehicle
  const hasTrip = !!displayTrip

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "assigned":
        return colors.success
      case "pending":
        return colors.warning
      case "completed":
        return colors.tint
      case "cancelled":
        return colors.error
      default:
        return colors.textDim
    }
  }

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          elevation: 3,
          marginHorizontal: 20,
          marginTop: 16,
          padding: 20,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        cardContent: {
          boxShadow: "none",
          elevation: 0,
          gap: 12,
        },
        cardHeader: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        },
        cardHeaderLeft: {
          alignItems: "center",
          flexDirection: "row",
          flex: 1,
          gap: 12,
        },
        cardSubtitle: {
          color: colors.textDim,
          fontSize: 14,
          fontWeight: "600",
        },
        cardTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
          marginBottom: 4,
        },
        container: {
          flex: 1,
        },
        editButton: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 18,
          height: 36,
          justifyContent: "center",
          width: 36,
        },
        emptyState: {
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
          paddingVertical: 32,
        },
        emptyStateText: {
          color: colors.textDim,
          fontSize: 14,
          fontWeight: "600",
          textAlign: "center",
        },
        iconCircle: {
          alignItems: "center",
          borderRadius: 24,
          height: 48,
          justifyContent: "center",
          width: 48,
        },
        infoLabel: {
          color: colors.textDim,
          flex: 1,
          fontSize: 14,
          fontWeight: "600",
        },
        infoRow: {
          alignItems: "flex-start",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: 8,
        },
        infoValue: {
          color: colors.text,
          flex: 2,
          fontSize: 14,
          fontWeight: "700",
          textAlign: "right",
        },
        loadingContainer: {
          alignItems: "center",
          flex: 1,
          justifyContent: "center",
          padding: 32,
        },
        loadingText: {
          color: colors.textDim,
          fontSize: 16,
          fontWeight: "600",
          marginTop: 16,
        },
        locationText: {
          fontSize: 13,
          lineHeight: 18,
        },
        scrollView: {
          flex: 1,
        },
        statusBadge: {
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 4,
        },
        statusText: {
          fontSize: 12,
          fontWeight: "800",
          textTransform: "uppercase",
        },
        vinText: {
          fontFamily: "monospace",
          fontSize: 12,
        },
      }),
    [colors],
  )

  // Show loading state if data is being fetched

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Trip Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: hasTrip ? colors.success + "20" : colors.error + "20",
                  },
                ]}
              >
                <Package size={24} color={hasTrip ? colors.success : colors.error} />
              </View>
              <View>
                <Text style={styles.cardTitle}>{translate("vehicleTrip.tripInfo" as any)}</Text>
                <Text style={styles.cardSubtitle}>
                  {hasTrip
                    ? translate("vehicleTrip.tripAssigned" as any)
                    : translate("vehicleTrip.notAssigned" as any)}
                </Text>
              </View>
            </View>
            {hasTrip && onEditTrip && (
              <TouchableOpacity style={styles.editButton} onPress={onEditTrip}>
                <Edit2 size={18} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>

          {hasTrip && displayTrip ? (
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{translate("vehicleTrip.shippingId" as any)}:</Text>
                <Text style={styles.infoValue}>{displayTrip.shipping_id}</Text>
              </View>
              {displayTrip.status && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{translate("vehicleTrip.status" as any)}:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(displayTrip.status)}20` },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: getStatusColor(displayTrip.status) }]}
                    >
                      {displayTrip.status}
                    </Text>
                  </View>
                </View>
              )}
              {displayTrip.start_location?.address &&
                displayTrip.start_location.address !== "N/A" && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {translate("vehicleTrip.startLocation" as any)}:
                    </Text>
                    <Text style={[styles.infoValue, styles.locationText]}>
                      {displayTrip.start_location.address}
                    </Text>
                  </View>
                )}
              {displayTrip.end_location?.address && displayTrip.end_location.address !== "N/A" && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {translate("vehicleTrip.endLocation" as any)}:
                  </Text>
                  <Text style={[styles.infoValue, styles.locationText]}>
                    {displayTrip.end_location.address}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={32} color={colors.textDim} />
              <Text style={styles.emptyStateText}>
                {translate("vehicleTrip.tripMissing" as any)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  )
}
