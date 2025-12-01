/**
 * Mandatory Setup Screen
 *
 * Full-screen overlay that blocks HOS/ELD features until
 * vehicle and trip are assigned.
 */

import React, { useMemo } from "react"
import { View, StyleSheet, Text, TouchableOpacity } from "react-native"
import { AlertTriangle, Truck, FileText } from "lucide-react-native"

import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

interface MandatorySetupScreenProps {
  hasVehicle: boolean
  hasTrip?: boolean
  hasShipperId: boolean
  onAddVehicle?: () => void
  onAddShipperId?: () => void
  onContactManager?: () => void
}

export const MandatorySetupScreen: React.FC<MandatorySetupScreenProps> = ({
  hasVehicle,
  hasTrip = false,
  hasShipperId,
  onAddVehicle,
  onAddShipperId,
  onContactManager,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme

  const missingItems = []
  if (!hasVehicle && !hasTrip) missingItems.push("vehicle_or_trip")
  if (!hasShipperId) missingItems.push("shipper_id")

  // Dynamic styles based on theme
  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionContainer: {
          gap: 12,
          marginBottom: 16,
          width: "100%",
        },
        contactButton: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderRadius: 16,
          paddingHorizontal: 32,
          paddingVertical: 16,
        },
        contactButtonText: {
          color: colors.cardBackground,
          fontSize: 18,
          fontWeight: "800",
        },
        container: {
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          bottom: 0,
          justifyContent: "center",
          left: 0,
          padding: 24,
          position: "absolute",
          right: 0,
          top: 0,
          zIndex: 9999,
        },
        content: {
          alignItems: "center",
          backgroundColor: colors.cardBackground,
          borderRadius: 24,
          elevation: 12,
          maxWidth: 400,
          padding: 32,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          width: "100%",
        },
        iconContainer: {
          alignItems: "center",
          backgroundColor: colors.warningBackground,
          borderRadius: 60,
          height: 120,
          justifyContent: "center",
          marginBottom: 24,
          width: 120,
        },
        infoText: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
          lineHeight: 20,
          textAlign: "center",
        },
        message: {
          color: colors.textDim,
          fontSize: 16,
          fontWeight: "600",
          lineHeight: 24,
          marginBottom: 32,
          textAlign: "center",
        },
        missingContainer: {
          gap: 16,
          marginBottom: 32,
          width: "100%",
        },
        missingItem: {
          alignItems: "center",
          backgroundColor: colors.errorBackground,
          borderRadius: 16,
          flexDirection: "row",
          gap: 16,
          padding: 16,
        },
        missingSubtitle: {
          color: colors.error,
          fontSize: 14,
          fontWeight: "600",
        },
        missingTextContainer: {
          flex: 1,
        },
        missingTitle: {
          color: colors.error,
          fontSize: 16,
          fontWeight: "800",
          marginBottom: 4,
        },
        primaryButton: {
          alignItems: "center",
          backgroundColor: colors.tint,
          borderRadius: 16,
          paddingHorizontal: 32,
          paddingVertical: 16,
        },
        primaryButtonText: {
          color: colors.cardBackground,
          fontSize: 18,
          fontWeight: "800",
        },
        secondaryButton: {
          alignItems: "center",
          backgroundColor: colors.palette.primary100,
          borderColor: colors.palette.primary400,
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 32,
          paddingVertical: 16,
        },
        secondaryButtonText: {
          color: colors.palette.primary800,
          fontSize: 16,
          fontWeight: "700",
        },
        title: {
          color: colors.text,
          fontSize: 28,
          fontWeight: "900",
          marginBottom: 16,
          textAlign: "center",
        },
      }),
    [colors],
  )

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={64} color={colors.warning} strokeWidth={2.5} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{translate("vehicleTrip.mandatorySetup" as any)}</Text>

        {/* Message */}
        <Text style={styles.message}>{translate("vehicleTrip.mandatoryMessage" as any)}</Text>

        {/* Missing Items */}
        <View style={styles.missingContainer}>
          {!hasVehicle && !hasTrip && (
            <View style={styles.missingItem}>
              <Truck size={24} color={colors.error} />
              <View style={styles.missingTextContainer}>
                <Text style={styles.missingTitle}>
                  {translate("vehicleTrip.vehicleOrTripRequired" as any)}
                </Text>
                <Text style={styles.missingSubtitle}>
                  {translate("vehicleTrip.vehicleOrTripMissing" as any)}
                </Text>
              </View>
            </View>
          )}

          {!hasShipperId && (
            <View style={styles.missingItem}>
              <FileText size={24} color={colors.error} />
              <View style={styles.missingTextContainer}>
                <Text style={styles.missingTitle}>
                  {translate("vehicleTrip.shipperIdRequired" as any)}
                </Text>
                <Text style={styles.missingSubtitle}>
                  {translate("vehicleTrip.shipperIdMissing" as any)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {!hasVehicle && !hasTrip && onAddVehicle && (
            <TouchableOpacity style={styles.primaryButton} onPress={onAddVehicle}>
              <Text style={styles.primaryButtonText}>Pick Assigned Vehicle or Trip</Text>
            </TouchableOpacity>
          )}

          {!hasShipperId && onAddShipperId && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onAddShipperId}>
              <Text style={styles.secondaryButtonText}>Add Shipping / BOL ID</Text>
            </TouchableOpacity>
          )}

          {onContactManager && (
            <TouchableOpacity style={styles.contactButton} onPress={onContactManager}>
              <Text style={styles.contactButtonText}>
                {translate("vehicleTrip.contactManager" as any)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          For quick setup: sign in, pick your vehicle, then enter the Shipping / BOL number provided
          in your route paperwork. Contact your dispatcher if you need help.
        </Text>
      </View>
    </View>
  )
}
