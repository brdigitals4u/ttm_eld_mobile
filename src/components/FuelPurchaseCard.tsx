import React, { useMemo, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import { Calendar, MapPin, Fuel, Truck, Receipt } from "lucide-react-native"
import Animated, { FadeInUp } from "react-native-reanimated"

import { DriverFuelPurchaseListItem } from "@/api/fuel-purchase"
import { useAppTheme } from "@/theme/context"

const AnimatedView = Animated.createAnimatedComponent(View)

interface FuelPurchaseCardProps {
  purchase: DriverFuelPurchaseListItem
  onPress?: () => void
  onReceiptPress?: () => void
  index?: number
}

// Memoized helper functions
const formatDate = (dateString: string): string => {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

const formatCurrency = (amount: number | string, currency: string = "USD"): string => {
  const num = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
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

// Get fuel grade color - uses theme colors
const getFuelGradeColor = (
  grade: string | null | undefined,
  colors: any,
): string => {
  if (!grade) return colors.textDim
  const gradeLower = grade.toLowerCase()
  if (gradeLower.includes("premium") || gradeLower.includes("93")) {
    return colors.warning // Amber/Gold
  }
  if (gradeLower.includes("mid") || gradeLower.includes("89") || gradeLower.includes("plus")) {
    return colors.tint // Blue
  }
  return colors.textDim // Gray for regular
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
    [purchase.fuel_quantity_liters],
  )

  const price = useMemo(
    () => formatCurrency(purchase.transaction_price_amount, "USD"),
    [purchase.transaction_price_amount],
  )

  const formattedDate = useMemo(
    () => formatDate(purchase.transaction_time),
    [purchase.transaction_time],
  )

  const fuelGradeColor = useMemo(
    () => getFuelGradeColor(purchase.fuel_grade, colors),
    [purchase.fuel_grade, colors],
  )

  const merchantName = purchase.merchant_name || purchase.transaction_location || "Unknown Station"
  const state = purchase.state || ""
  const fuelGrade = purchase.fuel_grade || ""
  const vehicleUnit = purchase.vehicle?.vehicle_unit || ""

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
    [onReceiptPress, purchase.receipt_image_url],
  )

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          alignItems: "center",
          borderRadius: 16,
          borderWidth: 1,
          elevation: 1,
          flexDirection: "row",
          padding: 16,
          position: "relative",
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
        },
        receiptIconContainer: {
          alignItems: "center",
          borderRadius: 14,
          elevation: 2,
          height: 28,
          justifyContent: "center",
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          width: 28,
        },
        logo: {
          backgroundColor: colors.sectionBackground,
          borderRadius: 24,
          height: 48,
          width: 48,
        },
      }),
    [colors],
  )

  return (
    <AnimatedView entering={FadeInUp.duration(300).delay(index * 40)} style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          dynamicStyles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
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
          <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
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
                      backgroundColor: colors.sectionBackground,
                    },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: fuelGradeColor }]} />
                  <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                    {fuelGrade}
                  </Text>
                </View>
              )}
              {vehicleUnit && (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.sectionBackground,
                    },
                  ]}
                >
                  <Truck size={12} color={colors.tint} strokeWidth={2} />
                  <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                    {vehicleUnit}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right: Big Numbers */}
        <View style={styles.rightSection}>
          <Text style={[styles.gallonsText, { color: colors.text }]}>{gallons}</Text>
          <Text style={[styles.gallonsLabel, { color: colors.textDim }]}>gal</Text>
          <Text style={[styles.priceText, { color: colors.text }]}>{price}</Text>
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
            <View style={[dynamicStyles.receiptIconContainer, { backgroundColor: colors.tint }]}>
              <Receipt size={14} color={colors.text} strokeWidth={2.5} />
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
    marginBottom: 12,
    marginHorizontal: 16,
  },
  centerSection: {
    flex: 1,
    gap: 4,
  },
  chip: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chipsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  gallonsLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: -2,
    textTransform: "uppercase",
  },
  gallonsText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  leftSection: {
    marginRight: 12,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  receiptThumbnail: {
    bottom: 12,
    position: "absolute",
    right: 12,
  },
  rightSection: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
  },
})
