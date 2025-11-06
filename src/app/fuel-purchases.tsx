import React, { useEffect, useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Filter } from 'lucide-react-native'
import { router } from 'expo-router'
import { useAppTheme } from '@/theme/context'
import { Header } from '@/components/Header'
import { FuelPurchasesList } from '@/components/FuelPurchasesList'

export default function FuelPurchasesScreen() {
  const { theme } = useAppTheme()
  const { colors } = theme
  const [showFilters, setShowFilters] = useState(false)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Fuel Purchases"
        titleMode="center"
        leftIcon="back"
        onLeftPress={() => router.back()}
        RightActionComponent={
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[styles.filterButton, { backgroundColor: colors.PRIMARY + '20' }]}
          >
            <Filter size={20} color={colors.PRIMARY} />
          </TouchableOpacity>
        }
      />

      <FuelPurchasesList
        showFilters={showFilters}
        onFilterPress={() => setShowFilters(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

