import React, { useState } from "react"
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native"
import { Plus } from "lucide-react-native"

import { Text } from "@/components/Text"
import ElevatedCard from "@/components/EvevatedCard"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import { useShipperStore } from "@/stores/shipperStore"
import { Contact } from "@/api/contacts"
import { toast } from "@/components/Toast"
import { AddShipperDialog } from "./AddShipperDialog"

interface ShipperListProps {
  onShipperSelect?: (shipper: Contact) => void
}

export function ShipperList({ onShipperSelect }: ShipperListProps) {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { shippers, updateShipper, isLoading } = useShipperStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedShipperId, setSelectedShipperId] = useState<string | undefined>()

  const handleToggleActive = async (shipper: Contact) => {
    try {
      await updateShipper(shipper.id, {
        is_active: !shipper.is_active,
      })
      toast.success(
        shipper.is_active
          ? translate("shippers.deactivated" as any) || "Shipper deactivated"
          : translate("shippers.activated" as any) || "Shipper activated",
      )
    } catch (error: any) {
      console.error("Failed to update shipper:", error)
      toast.error(error?.message || "Failed to update shipper")
    }
  }

  const handleAddNew = () => {
    setSelectedShipperId(undefined)
    setShowAddDialog(true)
  }

  const handleActivateExisting = (shipperId: string) => {
    setSelectedShipperId(shipperId)
    setShowAddDialog(true)
  }

  const styles = StyleSheet.create({
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    addButton: {
      alignItems: "center",
      borderRadius: 8,
      borderStyle: "dashed",
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 8,
      padding: 16,
      borderColor: colors.tint,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 8,
      color: colors.tint,
    },
    emptyText: {
      fontSize: 14,
      padding: 16,
      textAlign: "center",
      color: colors.textDim,
    },
    itemCard: {
      marginBottom: 12,
    },
    itemRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    itemDetails: {
      fontSize: 14,
      color: colors.textDim,
    },
    statusBadge: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 12,
    },
    statusBadgeActive: {
      backgroundColor: colors.success || "#10B981",
    },
    statusBadgeInactive: {
      backgroundColor: colors.textDim,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
  })

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {translate("shippers.title" as any) || "Shippers"}
        </Text>
        <TouchableOpacity onPress={handleAddNew} style={{ padding: 4 }}>
          <Text style={{ color: colors.tint, fontSize: 16, fontWeight: "600" }}>
            {translate("shippers.addShipper" as any) || "Add Shipper"}
          </Text>
        </TouchableOpacity>
      </View>

      {shippers.length === 0 ? (
        <Text style={styles.emptyText}>
          {translate("shippers.noShippers" as any) || "No shippers available"}
        </Text>
      ) : (
        shippers.map((shipper) => (
          <ElevatedCard key={shipper.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      shipper.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {shipper.is_active
                        ? translate("shippers.active" as any) || "Active"
                        : translate("shippers.inactive" as any) || "Inactive"}
                    </Text>
                  </View>
                  <Text style={styles.itemName}>
                    {shipper.first_name}
                  </Text>
                </View>
              </View>
              <Switch
                value={shipper.is_active}
                onValueChange={() => handleToggleActive(shipper)}
                disabled={isLoading}
                trackColor={{ false: colors.border, true: colors.tint }}
                thumbColor={shipper.is_active ? "#FFFFFF" : colors.textDim}
              />
            </View>
          </ElevatedCard>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
        <Plus size={20} color={colors.tint} />
        <Text style={styles.addButtonText}>
          {translate("shippers.addShipper" as any) || "Add Shipper"}
        </Text>
      </TouchableOpacity>

      <AddShipperDialog
        visible={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        existingShipperId={selectedShipperId}
      />
    </View>
  )
}
