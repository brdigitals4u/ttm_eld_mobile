/**
 * FlatList component for displaying DTC codes with performance optimizations
 * Uses React.memo, useMemo, useCallback, and FlatList best practices
 */

import React, { useMemo, useCallback } from "react"
import { View, StyleSheet, FlatList, RefreshControl } from "react-native"

import { MalfunctionRecord } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"

import { DtcListItem, DtcListItemProps } from "./DtcListItem"
import { Text } from "./Text"

export interface DtcListProps {
  data: MalfunctionRecord[]
  onRefresh?: () => void
  refreshing?: boolean
  onItemPress?: (item: MalfunctionRecord) => void
  emptyMessage?: string
}

// Fixed item height for getItemLayout optimization
const ITEM_HEIGHT = 140

// Determine severity based on DTC code
const getDtcSeverity = (code: string): "critical" | "warning" | "info" => {
  const upperCode = code.toUpperCase()

  // Critical codes
  if (
    upperCode.startsWith("P0195") || // Engine Oil Temperature
    upperCode.startsWith("P0300") || // Random/Multiple Cylinder Misfire
    upperCode.startsWith("P0301") || // Cylinder 1 Misfire
    upperCode.startsWith("P0302") || // Cylinder 2 Misfire
    upperCode.startsWith("P0303") || // Cylinder 3 Misfire
    upperCode.startsWith("P0304") || // Cylinder 4 Misfire
    upperCode.startsWith("P0420") || // Catalyst System Efficiency
    upperCode.startsWith("P0171") || // System Too Lean
    upperCode.startsWith("P0172") // System Too Rich
  ) {
    return "critical"
  }

  // Warning codes
  if (
    upperCode.startsWith("P0128") || // Coolant Thermostat
    upperCode.startsWith("P0401") || // EGR Flow
    upperCode.startsWith("P0455") // Evaporative Emission Control
  ) {
    return "warning"
  }

  // Default to info
  return "info"
}

// Transform MalfunctionRecord to DtcListItemProps
const transformToListItem = (
  record: MalfunctionRecord,
  onPress?: (item: MalfunctionRecord) => void,
): DtcListItemProps => {
  // Get first code for display (most common case)
  const firstCode = record.codes[0]
  const code = firstCode?.code || "UNKNOWN"
  const description =
    firstCode?.faultDescription || firstCode?.genericDescription || "Unknown fault"

  // Determine severity from code
  const severity = getDtcSeverity(code)

  return {
    id: record.id,
    code,
    description,
    ecuId: record.ecuId,
    ecuIdHex: record.ecuIdHex,
    timestamp: record.timestamp,
    severity,
    onPress: onPress ? () => onPress(record) : undefined,
  }
}

export const DtcList: React.FC<DtcListProps> = ({
  data,
  onRefresh,
  refreshing = false,
  onItemPress,
  emptyMessage = translate("dtc.noCodes" as any),
}) => {
  // Memoize transformed list items
  const listItems = useMemo(() => {
    return data.map((record) => transformToListItem(record, onItemPress))
  }, [data, onItemPress])

  // Memoize render item function
  const renderItem = useCallback(({ item }: { item: DtcListItemProps }) => {
    return <DtcListItem {...item} />
  }, [])

  // Memoize key extractor
  const keyExtractor = useCallback((item: DtcListItemProps) => item.id, [])

  // Memoize getItemLayout for fixed-height items (performance optimization)
  const getItemLayout = useCallback(
    (_data: ArrayLike<DtcListItemProps> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  )

  // Memoize empty component
  const renderEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    ),
    [emptyMessage],
  )

  return (
    <FlatList
      data={listItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={15}
      updateCellsBatchingPeriod={50}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        ) : undefined
      }
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={styles.contentContainer}
      style={styles.list}
    />
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.palette.neutral500 || "#6B7280",
    fontSize: 16,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
})
