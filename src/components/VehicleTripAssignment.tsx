/**
 * Vehicle & Trip Assignment Component
 * 
 * Displays vehicle and trip assignment information in clean, modern UI.
 * Allows editing/updating assignments.
 */

import React, { useState, useMemo } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Truck, Package, Edit2, CheckCircle2, AlertCircle } from 'lucide-react-native'
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useMyVehicle, useMyTrips, useAvailableVehicles } from '@/api/driver-hooks'
import { VehicleInfo, Trip } from '@/api/driver'
import { translate } from '@/i18n/translate'
import { colors } from '@/theme/colors'
import { useAuth } from '@/stores/authStore'
import { format } from 'date-fns'

interface VehicleTripAssignmentProps {
  onEditVehicle?: () => void
  onEditTrip?: () => void
}

export const VehicleTripAssignment: React.FC<VehicleTripAssignmentProps> = ({
  onEditVehicle,
  onEditTrip,
}) => {
  const { isAuthenticated } = useAuth()
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [showTripSelector, setShowTripSelector] = useState(false)

  // Fetch data
  const { data: vehicleData, isLoading: vehicleLoading, refetch: refetchVehicle } = useMyVehicle(isAuthenticated)
  const { data: tripsData, isLoading: tripsLoading, refetch: refetchTrips } = useMyTrips({ status: 'active' }, isAuthenticated)
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehicles({ status: 'active' }, isAuthenticated && showVehicleSelector)

  const vehicle = vehicleData?.vehicle
  const activeTrip = useMemo(() => {
    if (!tripsData?.trips) return null
    // Get the most recent active trip, or first active trip
    const activeTrips = tripsData.trips.filter(t => t.status === 'active' || t.status === 'assigned')
    return activeTrips.length > 0 ? activeTrips[0] : tripsData.trips[0]
  }, [tripsData])

  const hasVehicle = !!vehicle
  const hasTrip = !!activeTrip

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'assigned':
        return '#10B981'
      case 'pending':
        return '#F59E0B'
      case 'completed':
        return '#3B82F6'
      case 'cancelled':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  if (vehicleLoading || tripsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.PRIMARY} />
        <Text style={styles.loadingText}>
          {translate('vehicleTrip.loading' as any)}
        </Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Vehicle Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: hasVehicle ? '#D1FAE5' : '#FEE2E2' }]}>
                <Truck size={24} color={hasVehicle ? '#10B981' : '#EF4444'} />
              </View>
              <View>
                <Text style={styles.cardTitle}>
                  {translate('vehicleTrip.vehicleInfo' as any)}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {hasVehicle
                    ? translate('vehicleTrip.vehicleAssigned' as any)
                    : translate('vehicleTrip.notAssigned' as any)}
                </Text>
              </View>
            </View>
            {hasVehicle && onEditVehicle && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditVehicle}
              >
                <Edit2 size={18} color={colors.PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          {hasVehicle ? (
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.vehicleUnit' as any)}:
                </Text>
                <Text style={styles.infoValue}>{vehicle.vehicle_unit}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.make' as any)}:
                </Text>
                <Text style={styles.infoValue}>{vehicle.make}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.model' as any)}:
                </Text>
                <Text style={styles.infoValue}>{vehicle.model}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.year' as any)}:
                </Text>
                <Text style={styles.infoValue}>{vehicle.year}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.licensePlate' as any)}:
                </Text>
                <Text style={styles.infoValue}>{vehicle.license_plate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.vin' as any)}:
                </Text>
                <Text style={[styles.infoValue, styles.vinText]}>{vehicle.vin}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {translate('vehicleTrip.vehicleMissing' as any)}
              </Text>
            </View>
          )}
        </View>

        {/* Trip Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: hasTrip ? '#D1FAE5' : '#FEE2E2' }]}>
                <Package size={24} color={hasTrip ? '#10B981' : '#EF4444'} />
              </View>
              <View>
                <Text style={styles.cardTitle}>
                  {translate('vehicleTrip.tripInfo' as any)}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {hasTrip
                    ? translate('vehicleTrip.tripAssigned' as any)
                    : translate('vehicleTrip.notAssigned' as any)}
                </Text>
              </View>
            </View>
            {hasTrip && onEditTrip && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditTrip}
              >
                <Edit2 size={18} color={colors.PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          {hasTrip ? (
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.shippingId' as any)}:
                </Text>
                <Text style={styles.infoValue}>{activeTrip.shipping_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.status' as any)}:
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(activeTrip.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(activeTrip.status) }]}>
                    {activeTrip.status}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.startLocation' as any)}:
                </Text>
                <Text style={[styles.infoValue, styles.locationText]}>
                  {activeTrip.start_location.address}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.endLocation' as any)}:
                </Text>
                <Text style={[styles.infoValue, styles.locationText]}>
                  {activeTrip.end_location.address}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {translate('vehicleTrip.tripStartTime' as any)}:
                </Text>
                <Text style={styles.infoValue}>
                  {formatDate(activeTrip.trip_start_time)}
                </Text>
              </View>
              {activeTrip.trip_end_time && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {translate('vehicleTrip.tripEndTime' as any)}:
                  </Text>
                  <Text style={styles.infoValue}>
                    {formatDate(activeTrip.trip_end_time)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {translate('vehicleTrip.tripMissing' as any)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },
  vinText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
})

