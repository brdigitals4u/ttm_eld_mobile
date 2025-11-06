import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { TrendingUp, Fuel, DollarSign, Receipt } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { useAppTheme } from '@/theme/context'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '@/constants'

interface FuelPurchaseSummaryProps {
  summary: {
    total_purchases: number
    total_liters: number
    total_amount: number
    currency: string
  }
}

interface AnimatedStatItemProps {
  stat: {
    icon: React.ComponentType<{ size: number; color: string }>
    label: string
    value: string
    subtext: string
    color: string
  }
  index: number
  Icon: React.ComponentType<{ size: number; color: string }>
}

const AnimatedStatItem: React.FC<AnimatedStatItemProps> = ({ stat, index, Icon }) => {
  const translateX = useSharedValue(-30)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)

  useEffect(() => {
    const delay = index * 150
    translateX.value = withDelay(
      delay,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    )
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }))
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 15,
        stiffness: 100,
      })
    )
  }, [index])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    }
  })

  return (
    <Animated.View style={[styles.statItem, animatedStyle]}>
      <View style={styles.iconContainer}>
        <Icon size={24} color="#fff"  />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statSubtext}>{stat.subtext}</Text>
      </View>
    </Animated.View>
  )
}

export const FuelPurchaseSummary: React.FC<FuelPurchaseSummaryProps> = ({ summary }) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Animation values
  const scale = useSharedValue(0.8)
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(-20)

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    })
    opacity.value = withTiming(1, { duration: 600 })
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    })
  }, [])

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    }
  })

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const litersToGallons = (liters: number) => {
    return (liters / 3.78541).toFixed(2)
  }

  const stats = [
    {
      icon: Receipt,
      label: 'Total Purchases',
      value: summary.total_purchases.toString(),
      subtext: 'transactions',
      color: colors.PRIMARY,
    },
    {
      icon: Fuel,
      label: 'Total Fuel',
      value: litersToGallons(summary.total_liters),
      subtext: `${summary.total_liters.toFixed(2)} L`,
      color: '#10B981',
    },
    {
      icon: DollarSign,
      label: 'Total Amount',
      value: formatCurrency(summary.total_amount, summary.currency),
      subtext: summary.currency.toUpperCase(),
      color: '#F59E0B',
    },
  ]

  return (
    <Animated.View style={animatedContainerStyle}>
      <LinearGradient
        colors={isDark ? ['#004a99', '#003366'] : ['#0071ce', '#0056a3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <AnimatedStatItem key={index} stat={stat} index={index} Icon={Icon} />
            )
          })}
        </View>
      </View>
    </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    padding: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
})

