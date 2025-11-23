/**
 * Individual DTC (Diagnostic Trouble Code) list item component
 * Memoized for performance optimization
 */

import React, { memo } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { format } from 'date-fns'
import { Text } from './Text'
import { colors } from '@/theme/colors'
import { ObdCodeDetails } from '@/utils/obd-code-decoder'

export interface DtcListItemProps {
  id: string
  code: string
  description: string
  ecuId: string
  ecuIdHex: string
  timestamp: Date
  severity: 'critical' | 'warning' | 'info'
  location?: { latitude: number; longitude: number }
  onPress?: () => void
}

const getSeverityColor = (severity: 'critical' | 'warning' | 'info'): string => {
  switch (severity) {
    case 'critical':
      return colors.error || '#EF4444'
    case 'warning':
      return colors.warning || '#FF9500'
    case 'info':
      return colors.tint || '#5750F1'
    default:
      return colors.palette.neutral500 || '#6B7280'
  }
}

const getSeverityLabel = (severity: 'critical' | 'warning' | 'info'): string => {
  switch (severity) {
    case 'critical':
      return 'Critical'
    case 'warning':
      return 'Warning'
    case 'info':
      return 'Info'
    default:
      return 'Unknown'
  }
}

export const DtcListItem = memo<DtcListItemProps>(
  ({ code, description, ecuId, ecuIdHex, timestamp, severity, location, onPress }) => {
    const severityColor = getSeverityColor(severity)
    const severityLabel = getSeverityLabel(severity)
    const formattedTime = format(timestamp, 'MMM dd, yyyy HH:mm:ss')

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
            <Text style={styles.label}>ECU:</Text>
            <Text style={styles.value}>{ecuIdHex}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{formattedTime}</Text>
          </View>
        </View>

        {location && (
          <View style={styles.locationRow}>
            <Text style={styles.label}>Location:</Text>
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

DtcListItem.displayName = 'DtcListItem'

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.palette.neutral100 || '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.palette.neutral200 || '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  severityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.palette.neutral900 || '#111827',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: colors.palette.neutral700 || '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.palette.neutral500 || '#6B7280',
    marginRight: 4,
  },
  value: {
    fontSize: 12,
    color: colors.palette.neutral700 || '#374151',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.palette.neutral200 || '#E5E7EB',
  },
})

