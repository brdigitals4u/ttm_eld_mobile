/**
 * Unidentified Drivers Screen
 *
 * Displays and allows reassignment of unidentified driver records
 * Records created when ELD was powered on without a driver logged in
 */

import React, { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native"
import { router } from "expo-router"
import { format } from "date-fns"
import { ArrowLeft, User, AlertCircle, CheckCircle } from "lucide-react-native"

import { getUnidentifiedRecords, reassignUnidentifiedRecords } from "@/api/unidentified-drivers"
import ElevatedCard from "@/components/EvevatedCard"
import LoadingButton from "@/components/LoadingButton"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { UnidentifiedDriverReassignment } from "@/components/UnidentifiedDriverReassignment"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

export default function UnidentifiedDriversScreen() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { driverProfile } = useAuth()

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showReassignmentModal, setShowReassignmentModal] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<any[]>([])

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      setIsLoading(true)
      const response = await getUnidentifiedRecords()
      setRecords(response.records || [])
    } catch (error: any) {
      console.error("Failed to load unidentified records:", error)
      toast.error(error?.message || "Failed to load records")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadRecords()
  }

  const handleReassign = async (recordIds: string[], annotation: string) => {
    if (!driverProfile?.driver_id) {
      toast.error("Driver information not available")
      return
    }

    try {
      await reassignUnidentifiedRecords({
        record_ids: recordIds,
        driver_id: driverProfile.driver_id,
        annotation,
      })

      toast.success(`Successfully reassigned ${recordIds.length} record(s)`)
      setShowReassignmentModal(false)
      setSelectedRecords([])
      loadRecords() // Refresh list
    } catch (error: any) {
      console.error("Failed to reassign records:", error)
      toast.error(error?.message || "Failed to reassign records")
    }
  }

  const handleOpenReassignment = () => {
    if (records.length === 0) {
      toast.warning("No unidentified records to reassign")
      return
    }
    setSelectedRecords(records)
    setShowReassignmentModal(true)
  }

  if (isLoading && records.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Unidentified Drivers</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading records...
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Unidentified Drivers</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {records.length === 0 ? (
          <ElevatedCard style={styles.emptyCard}>
            <User size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Unidentified Records</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              All records have been assigned to drivers.
            </Text>
          </ElevatedCard>
        ) : (
          <>
            <ElevatedCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <AlertCircle size={20} color={colors.tint} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>
                    {records.length} Unidentified Record{records.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    These records were created when the ELD was powered on without a driver logged
                    in. Review and assume them to assign to your account.
                  </Text>
                </View>
              </View>
            </ElevatedCard>

            {records.map((record) => (
              <ElevatedCard key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordIcon}>
                    <User size={20} color={colors.tint} />
                  </View>
                  <View style={styles.recordContent}>
                    <Text style={[styles.recordTime, { color: colors.text }]}>
                      {format(new Date(record.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </Text>
                    <Text style={[styles.recordType, { color: colors.textSecondary }]}>
                      Event: {record.event_type}
                    </Text>
                    {record.missing_fields && record.missing_fields.length > 0 && (
                      <View style={styles.missingFields}>
                        <Text style={[styles.missingFieldsLabel, { color: colors.textSecondary }]}>
                          Missing: {record.missing_fields.join(", ")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ElevatedCard>
            ))}
          </>
        )}
      </ScrollView>

      {records.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <LoadingButton
            title={`Reassign ${records.length} Record${records.length !== 1 ? "s" : ""}`}
            onPress={handleOpenReassignment}
            icon={<CheckCircle size={18} color="#fff" />}
            fullWidth
          />
        </View>
      )}

      {/* Reassignment Modal */}
      <UnidentifiedDriverReassignment
        visible={showReassignmentModal}
        records={selectedRecords.map((r) => ({
          id: r.id,
          timestamp: new Date(r.timestamp),
          eventType: r.event_type,
          location:
            r.latitude && r.longitude
              ? { latitude: r.latitude, longitude: r.longitude }
              : undefined,
          vehicleId: r.vehicle_id,
          missingFields: r.missing_fields || [],
          rawData: r.raw_data || {},
        }))}
        onDismiss={() => {
          setShowReassignmentModal(false)
          setSelectedRecords([])
        }}
        onReassign={handleReassign}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  container: {
    flex: 1,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  footer: {
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: 16,
    paddingBottom: 32,
    position: "absolute",
    right: 0,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    padding: 16,
    paddingTop: 60,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
  missingFields: {
    marginTop: 4,
  },
  missingFieldsLabel: {
    fontSize: 11,
  },
  recordCard: {
    marginBottom: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: "row",
    gap: 12,
  },
  recordIcon: {
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  recordTime: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  recordType: {
    fontSize: 12,
    marginBottom: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
})
