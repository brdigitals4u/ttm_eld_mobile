/**
 * Individual DTC (Diagnostic Trouble Code) list item component
 * Memoized for performance optimization
 */

import React, { memo } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { format } from "date-fns"

import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"
import { ObdCodeDetails } from "@/utils/obd-code-decoder"

import { Text } from "./Text"

export interface DtcListItemProps {
  id: string
  code: string
  description: string
  ecuId: string
  ecuIdHex: string
  timestamp: Date
  severity: "critical" | "warning" | "info"
  location?: { latitude: number; longitude: number }
  onPress?: () => void
}

const getSeverityColor = (severity: "critical" | "warning" | "info"): string => {
  switch (severity) {
    case "critical":
      return colors.error || "#EF4444"
    case "warning":
      return colors.warning || "#FF9500"
    case "info":
      return colors.tint || "#5750F1"
    default:
      return colors.palette.neutral500 || "#6B7280"
  }
}

const getSeverityLabel = (severity: "critical" | "warning" | "info"): string => {
  switch (severity) {
    case "critical":
      return translate("dtc.critical" as any)
    case "warning":
      return translate("dtc.warning" as any)
    case "info":
      return translate("dtc.info" as any)
    default:
      return translate("dtc.unknown" as any)
  }
}

export const DtcListItem = memo<DtcListItemProps>(
  ({ code, description, ecuId, ecuIdHex, timestamp, severity, location, onPress }) => {
    const severityColor = getSeverityColor(severity)
    const severityLabel = getSeverityLabel(severity)
    const formattedTime = format(timestamp, "MMM dd, yyyy HH:mm:ss")

    const content = (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.codeContainer}>
            <View style={[styles.severityIndicator, { backgroundColor: severityColor }]} />
            <Text style={styles.code}>{code}</Text>
            <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
              <Text style={styles.severityText}>{severityLabel}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{translate("dtc.ecu" as any)}</Text>
            <Text style={styles.value}>{ecuIdHex}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{translate("dtc.time" as any)}</Text>
            <Text style={styles.value}>{formattedTime}</Text>
          </View>
        </View>

        {location && (
          <View style={styles.locationRow}>
            <Text style={styles.label}>{translate("dtc.location" as any)}</Text>
            <Text style={styles.value}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    )

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      )
    }

    return content
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo optimization
    return (
      prevProps.id === nextProps.id &&
      prevProps.code === nextProps.code &&
      prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
      prevProps.severity === nextProps.severity
    )
  },
)

DtcListItem.displayName = "DtcListItem"

const styles = StyleSheet.create({
  code: {
    color: colors.palette.neutral900 || "#111827",
    fontFamily: "System",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  codeContainer: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  container: {
    backgroundColor: colors.palette.neutral100 || "#F9FAFB",
    borderColor: colors.palette.neutral200 || "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
  },
  description: {
    color: colors.palette.neutral700 || "#374151",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  label: {
    color: colors.palette.neutral500 || "#6B7280",
    fontSize: 12,
    marginRight: 4,
  },
  locationRow: {
    alignItems: "center",
    borderTopColor: colors.palette.neutral200 || "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
  },
  severityBadge: {
    borderRadius: 6,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityIndicator: {
    borderRadius: 2,
    height: 40,
    marginRight: 12,
    width: 4,
  },
  severityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  value: {
    color: colors.palette.neutral700 || "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
})
