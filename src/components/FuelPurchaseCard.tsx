import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Calendar, MapPin, Fuel, Truck, Receipt, TrendingDown, Zap } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useAppTheme } from '@/theme/context'
import { DriverFuelPurchaseListItem } from '@/api/fuel-purchase'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '@/constants'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

interface FuelPurchaseCardProps {
  purchase: DriverFuelPurchaseListItem
  onPress?: () => void
  onReceiptPress?: () => void
  index?: number
}

export const FuelPurchaseCard: React.FC<FuelPurchaseCardProps> = ({
  purchase,
  onPress,
  onReceiptPress,
  index = 0,
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Animation values
  const translateY = useSharedValue(50)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.9)
  const pressScale = useSharedValue(1)
  const shimmer = useSharedValue(0)
  const iconRotate = useSharedValue(0)
  const pulseScale = useSharedValue(1)

  useEffect(() => {
    // Staggered entrance animation
    const delay = index * 100
    
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      })
    )
    
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }))
    
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 15,
        stiffness: 100,
      })
    )

    // Fuel icon rotation on entrance
    iconRotate.value = withDelay(
      delay + 200,
      withSpring(360, {
        damping: 10,
        stiffness: 80,
      })
    )

    // Shimmer effect
    shimmer.value = withDelay(
      delay + 400,
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      )
    )

    // Pulse effect for amount
    pulseScale.value = withDelay(
      delay + 300,
      withSequence(
        withSpring(1.1, { damping: 8, stiffness: 100 }),
        withSpring(1, { damping: 8, stiffness: 100 })
      )
    )
  }, [index])

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value * pressScale.value },
      ],
      opacity: opacity.value,
    }
  })

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${iconRotate.value}deg` }],
    }
  })

  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: shimmer.value * 0.3,
      transform: [{ translateX: shimmer.value * 300 }],
    }
  })

  const animatedAmountStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    }
  })

  const handlePressIn = () => {
    pressScale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 400,
    })
  }

  const handlePressOut = () => {
    pressScale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    })
  }

  const handlePress = () => {
    // Add haptic feedback feel
    iconRotate.value = withSpring(iconRotate.value + 360, {
      damping: 10,
      stiffness: 80,
    })
    
    if (onPress) {
      onPress()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: string, currency: string = 'usd') => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(num)
  }

  const litersToGallons = (liters: string) => {
    const num = parseFloat(liters)
    return (num / 3.78541).toFixed(2)
  }

  const getPricePerGallon = () => {
    const amount = parseFloat(purchase.transaction_price_amount)
    const gallons = parseFloat(litersToGallons(purchase.fuel_quantity_liters))
    return (amount / gallons).toFixed(3)
  }

  // Determine card gradient colors based on theme
  const gradientColors = isDark 
    ? ['#1a1f2e', '#252d3f', '#1a1f2e']
    : ['#ffffff', '#f8f9fb', '#ffffff']

  const accentGradient = isDark
    ? [colors.PRIMARY + '40', colors.PRIMARY + '20']
    : [colors.PRIMARY + '15', colors.PRIMARY + '08']

  return (
    <AnimatedTouchableOpacity
      style={[styles.cardContainer, animatedCardStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <AnimatedLinearGradient
          colors={['#ffffff', '#ffffff' + 'dd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Shimmer overlay effect */}
        <Animated.View style={[styles.shimmer, animatedShimmerStyle]} />

        {/* Accent gradient bar on left */}
        <LinearGradient
            colors={['#ffffff', '#ffffff' + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        {/* Header Row with Enhanced Visual Hierarchy */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Animated Fuel Icon Badge */}
            <Animated.View style={[styles.iconBadgeContainer, animatedIconStyle]}>
              <LinearGradient
                colors={[colors.PRIMARY, colors.PRIMARY + 'dd']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBadge}
              >
                <Fuel size={24} color="#fff" strokeWidth={2.5} />
                {/* Glow effect */}
                <View style={[styles.iconGlow, { backgroundColor: colors.PRIMARY }]} />
              </LinearGradient>
            </Animated.View>

            <View style={styles.headerInfo}>
              <Text style={[styles.merchantText, { color: colors.text }]} numberOfLines={1}>
                {purchase.merchant_name || purchase.transaction_location}
              </Text>
              <View style={styles.timeRow}>
                <Calendar size={13} color={colors.textDim} strokeWidth={2} />
                <Text style={[styles.timeText, { color: colors.textDim }]}>
                  {formatDate(purchase.transaction_time)}
                </Text>
              </View>
            </View>
          </View>

          {/* Enhanced Amount Display */}
          <Animated.View style={[styles.amountContainer, animatedAmountStyle]}>
            <View style={styles.gallonRow}>
              <Zap size={12} color={colors.PRIMARY} strokeWidth={2.5} fill={colors.PRIMARY} />
              <Text style={[styles.fuelAmount, { color: colors.text }]}>
                {litersToGallons(purchase.fuel_quantity_liters)} gal
              </Text>
            </View>
          </Animated.View>
        </View>



        {/* Enhanced Details Row with Icons */}
        <View style={styles.detailsRow}>
          {purchase.state && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <MapPin size={13} color={colors.PRIMARY} strokeWidth={2.5} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                {purchase.state}
              </Text>
            </View>
          )}
          
          {purchase.fuel_grade && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.gradeIndicator, { backgroundColor: colors.PRIMARY }]} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {purchase.fuel_grade}
              </Text>
            </View>
          )}
          
          {purchase.vehicle && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Truck size={13} color={colors.PRIMARY} strokeWidth={2.5} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                {purchase.vehicle.vehicle_unit}
              </Text>
            </View>
          )}
        </View>

        {/* Receipt Button */}
        {purchase.receipt_image_url && (
          <TouchableOpacity 
            onPress={onReceiptPress} 
            style={[styles.receiptButton, { backgroundColor: colors.PRIMARY }]}
            activeOpacity={0.8}
          >
            <Receipt size={16} color="#fff" strokeWidth={2.5} />
            <Text style={styles.receiptText}>View Receipt</Text>
          </TouchableOpacity>
        )}
      </AnimatedLinearGradient>
    </AnimatedTouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    backgroundColor: '#fff',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadgeContainer: {
    position: 'relative',
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  headerInfo: {
    flex: 1,
    gap: 5,
  },
  merchantText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gallonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fuelAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  pricePerGallon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  ppgLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ppgAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  gradeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  receiptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})