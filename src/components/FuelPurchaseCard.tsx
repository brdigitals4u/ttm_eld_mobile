import React, { useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Calendar, MapPin, Fuel, Truck, Receipt } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useAppTheme } from '@/theme/context'
import { DriverFuelPurchaseListItem } from '@/api/fuel-purchase'

const AnimatedView = Animated.createAnimatedComponent(View)

interface FuelPurchaseCardProps {
  purchase: DriverFuelPurchaseListItem
  onPress?: () => void
  onReceiptPress?: () => void
  index?: number
}

// Memoized helper functions
const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const formatCurrency = (amount: number | string, currency: string = 'USD'): string => {
  const num = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(num)
  } catch {
    return `$${num.toFixed(2)}`
  }
}

const litersToGallons = (liters: number | string): string => {
  const num = Number(liters) || 0
  return (num / 3.78541).toFixed(2)
}

// Get fuel grade color
const getFuelGradeColor = (grade: string | null | undefined, isDark: boolean): string => {
  if (!grade) return isDark ? '#6B7280' : '#9CA3AF'
  const gradeLower = grade.toLowerCase()
  if (gradeLower.includes('premium') || gradeLower.includes('93')) {
    return '#F59E0B' // Amber/Gold
  }
  if (gradeLower.includes('mid') || gradeLower.includes('89') || gradeLower.includes('plus')) {
    return '#3B82F6' // Blue
  }
  return isDark ? '#6B7280' : '#9CA3AF' // Gray for regular
}

const _FuelPurchaseCard: React.FC<FuelPurchaseCardProps> = ({
  purchase,
  onPress,
  onReceiptPress,
  index = 0,
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Guard against invalid purchase
  if (!purchase || !purchase.id) {
    return null
  }

  // Memoize computed values
  const gallons = useMemo(
    () => litersToGallons(purchase.fuel_quantity_liters),
    [purchase.fuel_quantity_liters]
  )

  const price = useMemo(
    () => formatCurrency(purchase.transaction_price_amount, 'USD'),
    [purchase.transaction_price_amount]
  )

  const formattedDate = useMemo(
    () => formatDate(purchase.transaction_time),
    [purchase.transaction_time]
  )

  const fuelGradeColor = useMemo(
    () => getFuelGradeColor(purchase.fuel_grade, isDark),
    [purchase.fuel_grade, isDark]
  )

  const merchantName = purchase.merchant_name || purchase.transaction_location || 'Unknown Station'
  const state = purchase.state || ''
  const fuelGrade = purchase.fuel_grade || ''
  const vehicleUnit = purchase.vehicle?.vehicle_unit || ''

  // Handlers
  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress()
    } else if (onReceiptPress && purchase.receipt_image_url) {
      onReceiptPress()
    }
  }, [onPress, onReceiptPress, purchase.receipt_image_url])

  const handleReceiptPress = useCallback(
    (e: any) => {
      e?.stopPropagation()
      if (onReceiptPress && purchase.receipt_image_url) {
        onReceiptPress()
      }
    },
    [onReceiptPress, purchase.receipt_image_url]
  )

  return (
    <AnimatedView
      entering={FadeInUp.duration(300).delay(index * 40)}
      style={styles.cardContainer}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#181B20' : '#FFFFFF',
            borderColor: isDark ? '#242830' : 'rgba(0,0,0,0.06)',
          },
        ]}
        onPress={handleCardPress}
        activeOpacity={0.95}
        accessibilityRole="button"
        accessibilityLabel={`Fuel purchase at ${merchantName}, ${gallons} gallons, ${price}`}
      >
        {/* Left: Fuel Icon/Logo */}
        <View style={styles.leftSection}>
        <View style={[styles.iconCircle, { backgroundColor: `${fuelGradeColor}20` }]}>
              <Fuel size={24} color={fuelGradeColor} strokeWidth={2} />
            </View>
        </View>

        {/* Center: Merchant + Time + Chips */}
        <View style={styles.centerSection}>
          <Text
            style={[styles.merchantName, { color: colors.text }]}
            numberOfLines={1}
          >
            {merchantName}
          </Text>
          <View style={styles.timeRow}>
            <Calendar size={12} color={colors.textDim} strokeWidth={2} />
            <Text style={[styles.timeText, { color: colors.textDim }]}>
              {formattedDate} {state && `• ${state}`}
            </Text>
          </View>
          {(fuelGrade || vehicleUnit) && (
            <View style={styles.chipsRow}>
              {fuelGrade && (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isDark
                        ? `${fuelGradeColor}20`
                        : `${fuelGradeColor}15`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: fuelGradeColor },
                    ]}
                  />
                  <Text
                    style={[styles.chipText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {fuelGrade}
                  </Text>
                </View>
              )}
              {vehicleUnit && (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                >
                  <Truck size={12} color={colors.tint} strokeWidth={2} />
                  <Text
                    style={[styles.chipText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {vehicleUnit}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right: Big Numbers */}
        <View style={styles.rightSection}>
          <Text style={[styles.gallonsText, { color: colors.text }]}>
            {gallons}
          </Text>
          <Text style={[styles.gallonsLabel, { color: colors.textDim }]}>
            gal
          </Text>
          <Text style={[styles.priceText, { color: colors.text }]}>
            {price}
          </Text>
        </View>

        {/* Receipt Thumbnail (corner overlay) */}
        {purchase.receipt_image_url && (
          <TouchableOpacity
            style={styles.receiptThumbnail}
            onPress={handleReceiptPress}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View receipt"
          >
            <View style={[styles.receiptIconContainer, { backgroundColor: colors.tint }]}>
              <Receipt size={14} color="#fff" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </AnimatedView>
  )
}

// Memoize with custom comparison
export const FuelPurchaseCard = React.memo(_FuelPurchaseCard, (prev, next) => {
  return (
    prev.purchase?.id === next.purchase?.id &&
    prev.index === next.index &&
    prev.onPress === next.onPress &&
    prev.onReceiptPress === next.onReceiptPress
  )
})

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  leftSection: {
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  centerSection: {
    flex: 1,
    gap: 4,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  gallonsText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  gallonsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  receiptThumbnail: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  receiptIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
})
