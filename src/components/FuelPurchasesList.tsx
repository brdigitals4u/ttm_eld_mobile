import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native'
import { Calendar, ChevronDown, X, Plus } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { FuelPurchaseCard } from '@/components/FuelPurchaseCard'
import { FuelPurchaseSummary } from '@/components/FuelPurchaseSummary'
import {
  useDriverFuelPurchases,
  DriverFuelPurchasesParams,
  DriverFuelPurchaseListItem,
} from '@/api/fuel-purchase'
import { useAuth } from '@/contexts'
import { toast } from '@/components/Toast'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface FuelPurchasesListProps {
  showFilters?: boolean
  onFilterPress?: () => void
  onAddPress?: () => void
}

// FlatList optimizations
const ITEM_HEIGHT = 100 // Estimated card height
const keyExtractor = (item: DriverFuelPurchaseListItem, index: number) =>
  String(item?.id || `fuel-${index}`)

const getItemLayout = (_: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
})

// Date grouping helper
const groupByDate = (
  items: DriverFuelPurchaseListItem[]
): { [key: string]: DriverFuelPurchaseListItem[] } => {
  const groups: { [key: string]: DriverFuelPurchaseListItem[] } = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  items.forEach((item) => {
    if (!item.transaction_time) return
    const itemDate = new Date(item.transaction_time)
    itemDate.setHours(0, 0, 0, 0)

    let groupKey: string
    if (itemDate.getTime() === today.getTime()) {
      groupKey = 'Today'
    } else if (itemDate.getTime() === yesterday.getTime()) {
      groupKey = 'Yesterday'
    } else {
      groupKey = itemDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: itemDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      })
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
  })

  return groups
}

// Format date for display
const formatDateHeader = (dateStr: string): string => {
  if (dateStr === 'Today' || dateStr === 'Yesterday') return dateStr
  return dateStr
}

export const FuelPurchasesList: React.FC<FuelPurchasesListProps> = ({
  showFilters: externalShowFilters,
  onFilterPress,
  onAddPress,
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { vehicleAssignment } = useAuth()
  const insets = useSafeAreaInsets()

  const [filters, setFilters] = useState<DriverFuelPurchasesParams>({
    limit: 50,
    offset: 0,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>()
  const [selectedPreset, setSelectedPreset] = useState<string>('thisMonth')
  const [sortBy, setSortBy] = useState<'transactions' | 'fuel' | 'total' | null>(null)
  const [showCustomRange, setShowCustomRange] = useState(false)

  // Get date presets
  const getDatePreset = useCallback((preset: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start: Date, end: Date

    switch (preset) {
      case 'today':
        start = new Date(today)
        end = new Date(today)
        break
      case 'yesterday':
        start = new Date(today)
        start.setDate(start.getDate() - 1)
        end = new Date(start)
        break
      case 'last7Days':
        start = new Date(today)
        start.setDate(start.getDate() - 7)
        end = new Date(today)
        break
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }, [])

  // Initialize with current month
  const defaultDates = useMemo(() => getDatePreset('thisMonth'), [getDatePreset])

  const queryParams: DriverFuelPurchasesParams = useMemo(() => {
    const params: DriverFuelPurchasesParams = {
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    }

    if (startDate || filters.start_date) {
      params.start_date = startDate || filters.start_date
    } else {
      params.start_date = defaultDates.start
    }

    if (endDate || filters.end_date) {
      params.end_date = endDate || filters.end_date
    } else {
      params.end_date = defaultDates.end
    }

    if (selectedVehicleId !== undefined) {
      params.vehicle_id = selectedVehicleId
    } else if (filters.vehicle_id) {
      params.vehicle_id = filters.vehicle_id
    }

    return params
  }, [filters, startDate, endDate, selectedVehicleId, defaultDates])

  const {
    data: purchasesData,
    isLoading,
    isPending: isRefreshing,
    refetch,
    error,
  } = useDriverFuelPurchases(queryParams)

  // Memoize sorted and grouped data
  const sortedAndGroupedData = useMemo(() => {
    if (!purchasesData?.results) return []

    let sorted = [...purchasesData.results]

    // Sort based on selected tile
    if (sortBy === 'fuel') {
      sorted.sort((a, b) => {
        const aGal = Number(a.fuel_quantity_liters) / 3.78541
        const bGal = Number(b.fuel_quantity_liters) / 3.78541
        return bGal - aGal
      })
    } else if (sortBy === 'total') {
      sorted.sort((a, b) => {
        const aAmount = Number(a.transaction_price_amount) || 0
        const bAmount = Number(b.transaction_price_amount) || 0
        return bAmount - aAmount
      })
    }
    // Default: sort by date (newest first)
    else {
      sorted.sort((a, b) => {
        const aDate = new Date(a.transaction_time).getTime()
        const bDate = new Date(b.transaction_time).getTime()
        return bDate - aDate
      })
    }

    const grouped = groupByDate(sorted)
    // Convert to array format for FlatList
    const sections: Array<{ type: 'header' | 'item'; data: any }> = []
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Today') return -1
      if (b === 'Today') return 1
      if (a === 'Yesterday') return -1
      if (b === 'Yesterday') return 1
      return b.localeCompare(a)
    })

    sortedKeys.forEach((key) => {
      sections.push({ type: 'header', data: key })
      grouped[key].forEach((item) => {
        sections.push({ type: 'item', data: item })
      })
    })

    return sections
  }, [purchasesData?.results, sortBy])

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleLoadMore = useCallback(() => {
    if (purchasesData && (purchasesData as any)?.has_more && !isLoading) {
      setFilters((prev) => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 50),
      }))
    }
  }, [purchasesData, isLoading])

  const handlePresetSelect = useCallback(
    (preset: string) => {
      setSelectedPreset(preset)
      if (preset === 'custom') {
        setShowCustomRange(true)
      } else {
        const dates = getDatePreset(preset)
        setStartDate(dates.start)
        setEndDate(dates.end)
        setShowCustomRange(false)
      }
    },
    [getDatePreset]
  )

  const applyFilters = useCallback(() => {
    setFilters({
      ...filters,
      start_date: startDate || defaultDates.start,
      end_date: endDate || defaultDates.end,
      vehicle_id: selectedVehicleId,
      offset: 0,
    })
    setShowFilters(false)
    if (onFilterPress) onFilterPress()
  }, [filters, startDate, endDate, selectedVehicleId, defaultDates, onFilterPress])

  const clearFilters = useCallback(() => {
    setStartDate('')
    setEndDate('')
    setSelectedVehicleId(undefined)
    setSelectedPreset('thisMonth')
    setShowCustomRange(false)
    setFilters({
      limit: 50,
      offset: 0,
    })
    setShowFilters(false)
    if (onFilterPress) onFilterPress()
  }, [onFilterPress])

  const handleReceiptPress = useCallback((receiptUrl: string) => {
    toast.info('Receipt viewer coming soon')
  }, [])

  const handleSummaryTilePress = useCallback(
    (type: 'transactions' | 'fuel' | 'total') => {
      setSortBy(type === 'transactions' ? null : type)
    },
    []
  )

  const handleAddPress = useCallback(() => {
    if (onAddPress) {
      onAddPress()
    } else {
      toast.info('Add fuel purchase feature coming soon')
    }
  }, [onAddPress])

  // Memoized render functions
  const renderItem = useCallback(
    ({ item }: { item: { type: string; data: any } }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: colors.text }]}>
              {formatDateHeader(item.data)}
            </Text>
          </View>
        )
      }

      return (
        <FuelPurchaseCard
          purchase={item.data}
          onReceiptPress={() =>
            item.data.receipt_image_url && handleReceiptPress(item.data.receipt_image_url)
          }
        />
      )
    },
    [colors, handleReceiptPress]
  )

  const renderEmptyState = useCallback(() => {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.background }]}>
          <Calendar size={56} color={colors.tint} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>No fuel purchases found</Text>
        <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
          {filters.start_date || filters.end_date
            ? 'Try adjusting your filters to see more results'
            : 'Your fuel purchase history will appear here'}
        </Text>
      </View>
    )
  }, [colors, filters])

  const renderFooter = useCallback(() => {
    if (!isLoading || !purchasesData || !(purchasesData as any)?.has_more)
      return <View style={{ marginBottom: 100 }} />
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    )
  }, [isLoading, purchasesData, colors])

  const isModalVisible = externalShowFilters !== undefined ? externalShowFilters : showFilters
  const handleFilterToggle = useCallback(() => {
    if (onFilterPress) {
      onFilterPress()
    } else {
      setShowFilters(!showFilters)
    }
  }, [onFilterPress, showFilters])

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load fuel purchases
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      {/* Sticky Summary */}
      {purchasesData && (
        <View style={styles.stickySummary}>
          <FuelPurchaseSummary
            summary={
              purchasesData.summary || {
                total_purchases: purchasesData.count || 0,
                total_liters: 0,
                total_amount: 0,
                currency: 'usd',
              }
            }
            onTilePress={handleSummaryTilePress}
            sortBy={sortBy}
          />
        </View>
      )}

      {/* Loading State */}
      {isLoading && !purchasesData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textDim }]}>
            Loading fuel purchases...
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedAndGroupedData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.data}` : keyExtractor(item.data, index)
          }
          contentContainerStyle={[
            styles.listContent,
            (!purchasesData?.results || purchasesData.results.length === 0) &&
              styles.listContentEmpty,
          ]}
          ListEmptyComponent={!isLoading && purchasesData ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || false}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={11}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          getItemLayout={getItemLayout}
        />
      )}

      {/* Filters Modal with Quick Presets */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleFilterToggle}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleFilterToggle}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground },
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Purchases</Text>
              <TouchableOpacity onPress={handleFilterToggle}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.presetSection}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Show me fuel from...
                </Text>
                <View style={styles.presetButtons}>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'last7Days', label: 'Last 7 Days' },
                    { key: 'thisMonth', label: 'This Month' },
                    { key: 'lastMonth', label: 'Last Month' },
                    { key: 'custom', label: 'Custom Range 📅' },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.key}
                      style={[
                        styles.presetButton,
                        {
                          backgroundColor:
                            selectedPreset === preset.key
                              ? colors.tint
                              : isDark
                              ? '#242830'
                              : '#F3F4F6',
                          borderColor:
                            selectedPreset === preset.key
                              ? colors.tint
                              : isDark
                              ? '#242830'
                              : '#E5E7EB',
                        },
                      ]}
                      onPress={() => handlePresetSelect(preset.key)}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          {
                            color:
                              selectedPreset === preset.key
                                ? '#fff'
                                : colors.text,
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {showCustomRange && (
                <View style={styles.customRangeSection}>
                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>Start Date</Text>
                    <TextInput
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.background, color: colors.text },
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textDim}
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                  </View>

                  <View style={styles.filterSection}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>End Date</Text>
                    <TextInput
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.background, color: colors.text },
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textDim}
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  </View>
                </View>
              )}

              {vehicleAssignment?.vehicle_info && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Vehicle</Text>
                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          selectedVehicleId === parseInt(vehicleAssignment.vehicle_info.id)
                            ? colors.tint
                            : isDark
                            ? '#242830'
                            : '#E5E7EB',
                      },
                    ]}
                    onPress={() => {
                      const vehicleId = vehicleAssignment.vehicle_info?.id
                      if (vehicleId) {
                        setSelectedVehicleId(
                          selectedVehicleId === parseInt(vehicleId)
                            ? undefined
                            : parseInt(vehicleId)
                        )
                      }
                    }}
                  >
                    <Text style={[styles.selectButtonText, { color: colors.text }]}>
                      {vehicleAssignment.vehicle_info &&
                      selectedVehicleId === parseInt(vehicleAssignment.vehicle_info.id)
                        ? vehicleAssignment.vehicle_info.vehicle_unit
                        : 'All Vehicles'}
                    </Text>
                    <ChevronDown size={20} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.clearButton, { borderColor: colors.border }]}
                onPress={clearFilters}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton, { backgroundColor: colors.tint }]}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  stickySummary: {
    zIndex: 10,
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    margin: 20,
    borderRadius: 24,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 17,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalBody: {
    padding: 24,
  },
  presetSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customRangeSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clearButton: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  applyButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
