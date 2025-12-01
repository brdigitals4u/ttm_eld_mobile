import React, { useMemo, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Receipt, Fuel, DollarSign } from "lucide-react-native"

import { useAppTheme } from "@/theme/context"

interface FuelPurchaseSummaryProps {
  summary: {
    total_purchases: number
    total_liters: number
    total_amount: number
    currency: string
  }
  onTilePress?: (type: "transactions" | "fuel" | "total") => void
  sortBy?: "transactions" | "fuel" | "total" | null
}

// Memoized formatters
const formatCurrency = (amount: number, currency: string = "USD"): string => {
  const num = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `$${Math.round(num)}`
  }
}

const litersToGallons = (liters: number): string => {
  const num = Number(liters) || 0
  return (num / 3.78541).toFixed(0)
}

interface SummaryTileProps {
  icon: React.ComponentType<{ size: number; color: string }>
  label: string
  value: string
  isSelected: boolean
  onPress: () => void
  colors: any
  isDark: boolean
}

const SummaryTile: React.FC<SummaryTileProps> = ({
  icon: Icon,
  label,
  value,
  isSelected,
  onPress,
  colors,
  isDark,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: isDark ? "#181B20" : "#F9FAFB",
          borderColor: isSelected ? colors.tint : isDark ? "#242830" : "rgba(0,0,0,0.06)",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${colors.tint}15` }]}>
        <Icon size={20} color={colors.tint} strokeWidth={2} />
      </View>
      <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.textDim }]}>{label}</Text>
    </TouchableOpacity>
  )
}

export const FuelPurchaseSummary: React.FC<FuelPurchaseSummaryProps> = ({
  summary,
  onTilePress,
  sortBy = null,
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Memoize computed values
  const gallons = useMemo(() => litersToGallons(summary.total_liters), [summary.total_liters])

  const totalAmount = useMemo(
    () => formatCurrency(summary.total_amount, summary.currency),
    [summary.total_amount, summary.currency],
  )

  const transactions = useMemo(() => summary.total_purchases.toString(), [summary.total_purchases])

  // Handlers
  const handleTransactionsPress = useCallback(() => {
    onTilePress?.("transactions")
  }, [onTilePress])

  const handleFuelPress = useCallback(() => {
    onTilePress?.("fuel")
  }, [onTilePress])

  const handleTotalPress = useCallback(() => {
    onTilePress?.("total")
  }, [onTilePress])

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#101215" : "#F9FAFB",
          borderBottomColor: isDark ? "#242830" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View style={styles.tilesContainer}>
        <SummaryTile
          icon={Receipt}
          label="TRANSACTIONS"
          value={transactions}
          isSelected={sortBy === "transactions"}
          onPress={handleTransactionsPress}
          colors={colors}
          isDark={isDark}
        />
        <SummaryTile
          icon={Fuel}
          label="FUEL"
          value={`${gallons} gal`}
          isSelected={sortBy === "fuel"}
          onPress={handleFuelPress}
          colors={colors}
          isDark={isDark}
        />
        <SummaryTile
          icon={DollarSign}
          label="TOTAL"
          value={totalAmount}
          isSelected={sortBy === "total"}
          onPress={handleTotalPress}
          colors={colors}
          isDark={isDark}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginBottom: 4,
    width: 36,
  },
  tile: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: -2,
    textTransform: "uppercase",
  },
  tileValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  tilesContainer: {
    flexDirection: "row",
    gap: 10,
  },
})
