import React, { useState, useMemo, useEffect } from 'react'
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
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated'
import { Calendar, ChevronDown, X } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { FuelPurchaseCard } from '@/components/FuelPurchaseCard'
import { FuelPurchaseSummary } from '@/components/FuelPurchaseSummary'
import { useDriverFuelPurchases, DriverFuelPurchasesParams } from '@/api/fuel-purchase'
import { useAuth } from '@/contexts'
import { toast } from '@/components/Toast'

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)
const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface FuelPurchasesListProps {
  showFilters?: boolean
  onFilterPress?: () => void
}

export const FuelPurchasesList: React.FC<FuelPurchasesListProps> = ({
  showFilters: externalShowFilters,
  onFilterPress,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const { vehicleAssignment } = useAuth()

  const [filters, setFilters] = useState<DriverFuelPurchasesParams>({
    limit: 50,
    offset: 0,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>()

  // Get current month dates as default
  const getCurrentMonthDates = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0],
    }
  }

  // Initialize with current month
  const defaultDates = useMemo(() => getCurrentMonthDates(), [])

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
    isPending:isRefreshing,
    refetch,
    error,
  } = useDriverFuelPurchases(queryParams)

  // Animation values
  const scrollY = useSharedValue(0)
  const modalTranslateY = useSharedValue(SCREEN_HEIGHT)
  const modalOpacity = useSharedValue(0)

  // Scroll handler for parallax effect
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    },
  })

  // Modal animations
  useEffect(() => {
    const isVisible = externalShowFilters !== undefined ? externalShowFilters : showFilters
    if (isVisible) {
      modalOpacity.value = withTiming(1, { duration: 300 })
      modalTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      })
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 })
      modalTranslateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 90,
      })
    }
  }, [externalShowFilters, showFilters])

  const modalOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: modalOpacity.value,
    }
  })

  const modalContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: modalTranslateY.value }],
    }
  })

  // Parallax effect for summary
  const summaryAnimatedStyle = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollY.value,
      [0, 200],
      [0, -50],
      Extrapolate.CLAMP
    )
    return {
      transform: [{ translateY: parallax }],
    }
  })

  const handleRefresh = () => {
    refetch()
  }

  const handleLoadMore = () => {
    if (purchasesData && (purchasesData as any)?.has_more && !isLoading) {
      setFilters((prev) => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 50),
      }))
    }
  }

  const applyFilters = () => {
    setFilters({
      ...filters,
      start_date: startDate || defaultDates.start,
      end_date: endDate || defaultDates.end,
      vehicle_id: selectedVehicleId,
      offset: 0,
    })
    setShowFilters(false)
    if (onFilterPress) onFilterPress()
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedVehicleId(undefined)
    setFilters({
      limit: 50,
      offset: 0,
    })
    setShowFilters(false)
    if (onFilterPress) onFilterPress()
  }

  const handleReceiptPress = (receiptUrl: string) => {
    toast.info('Receipt viewer coming soon')
  }

  const renderPurchaseItem = ({ item, index }: { item: any; index: number }) => {
    if (!item || !item.id) {
      console.warn('⚠️ Invalid item in fuel purchases list:', item)
      return null
    }
    
    return (
      <FuelPurchaseCard
        purchase={item}
        index={index}
        onReceiptPress={() => item.receipt_image_url && handleReceiptPress(item.receipt_image_url)}
      />
    )
  }

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.background }]}>
        <Calendar size={56} color={colors.PRIMARY} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyText, { color: colors.text }]}>No fuel purchases found</Text>
      <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
        {filters.start_date || filters.end_date
          ? 'Try adjusting your filters to see more results'
          : 'Your fuel purchase history will appear here'}
      </Text>
    </View>
  )

  const renderFooter = () => {
    if (!isLoading || !purchasesData || !(purchasesData as any)?.has_more) return <View style={{ marginBottom: 140 }} />
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.PRIMARY} />
      </View>
    )
  }

  const isModalVisible = externalShowFilters !== undefined ? externalShowFilters : showFilters
  const handleFilterToggle = () => {
    if (onFilterPress) {
      onFilterPress()
    } else {
      setShowFilters(!showFilters)
    }
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load fuel purchases
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.PRIMARY }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      {/* Always show summary - with zeros if no data */}
      {purchasesData ? (
        <Animated.View style={summaryAnimatedStyle}>
          <FuelPurchaseSummary 
            summary={purchasesData.summary || {
              total_purchases: purchasesData.count || 0,
              total_liters: 0,
              total_amount: 0,
              currency: 'usd',
            }} 
          />
        </Animated.View>
      ) : !isLoading ? (
        <Animated.View style={summaryAnimatedStyle}>
          <FuelPurchaseSummary 
            summary={{
              total_purchases: 0,
              total_liters: 0,
              total_amount: 0,
              currency: 'usd',
            }} 
          />
        </Animated.View>
      ) : null}

      {/* Show loading state */}
      {isLoading && !purchasesData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
          <Text style={[styles.loadingText, { color: colors.textDim }]}>
            Loading fuel purchases...
          </Text>
        </View>
      ) : (
        <AnimatedFlatList
          data={purchasesData?.results || []}
          renderItem={renderPurchaseItem}
          keyExtractor={(item: any, index) => item?.id || `fuel-purchase-${index}`}
          contentContainerStyle={[
            styles.listContent,
            (!purchasesData?.results || purchasesData.results.length === 0) && styles.listContentEmpty,
          ]}
          ListEmptyComponent={!isLoading && purchasesData ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || false}
              onRefresh={handleRefresh}
              tintColor={colors.PRIMARY}
            />
          }
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleFilterToggle}
      >
        <Animated.View style={[styles.modalOverlay, modalOverlayStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleFilterToggle}
          />
          <Animated.View style={[styles.modalContent, { backgroundColor: colors.cardBackground }, modalContentStyle]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Purchases</Text>
              <TouchableOpacity onPress={handleFilterToggle}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Start Date</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                  value={startDate || defaultDates.start}
                  onChangeText={setStartDate}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>End Date</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                  value={endDate || defaultDates.end}
                  onChangeText={setEndDate}
                />
              </View>

              {vehicleAssignment?.vehicle_info && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterLabel, { color: colors.text }]}>Vehicle</Text>
                  <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: colors.background }]}
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
                      {vehicleAssignment.vehicle_info && selectedVehicleId === parseInt(vehicleAssignment.vehicle_info.id)
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
                style={[styles.modalButton, styles.applyButton, { backgroundColor: colors.PRIMARY }]}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 24,
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
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalBody: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 24,
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
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
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
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})

