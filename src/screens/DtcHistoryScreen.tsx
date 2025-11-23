/**
 * DTC History Screen - Full screen displaying all DTC codes with filtering and search
 * Uses FlatList with performance optimizations
 */

import React, { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Search, Filter, X } from 'lucide-react-native'
import { Text } from '@/components/Text'
import { DtcList } from '@/components/DtcList'
import { useObdData } from '@/contexts/obd-data-context'
import { colors } from '@/theme/colors'
import { MalfunctionRecord } from '@/contexts/obd-data-context'

type SortOption = 'date' | 'code' | 'severity'
type FilterSeverity = 'all' | 'critical' | 'warning' | 'info'

export const DtcHistoryScreen: React.FC = () => {
  const { recentMalfunctions, refreshConnectionStatus } = useObdData()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Get severity for a DTC code
  const getDtcSeverity = useCallback((code: string): 'critical' | 'warning' | 'info' => {
    const upperCode = code.toUpperCase()
    
    if (
      upperCode.startsWith('P0195') ||
      upperCode.startsWith('P0300') ||
      upperCode.startsWith('P0301') ||
      upperCode.startsWith('P0302') ||
      upperCode.startsWith('P0303') ||
      upperCode.startsWith('P0304') ||
      upperCode.startsWith('P0420') ||
      upperCode.startsWith('P0171') ||
      upperCode.startsWith('P0172')
    ) {
      return 'critical'
    }
    
    if (
      upperCode.startsWith('P0128') ||
      upperCode.startsWith('P0401') ||
      upperCode.startsWith('P0455')
    ) {
      return 'warning'
    }
    
    return 'info'
  }, [])

  // Filter and sort DTC records
  const filteredAndSortedData = useMemo(() => {
    let filtered: MalfunctionRecord[] = [...recentMalfunctions]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((record) => {
        return record.codes.some((code) => {
          const codeStr = code.code.toLowerCase()
          const descStr = (code.faultDescription || code.genericDescription || '').toLowerCase()
          return codeStr.includes(query) || descStr.includes(query)
        })
      })
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter((record) => {
        return record.codes.some((code) => {
          const severity = getDtcSeverity(code.code)
          return severity === filterSeverity
        })
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.timestamp.getTime() - a.timestamp.getTime() // Newest first
        case 'code':
          const codeA = a.codes[0]?.code || ''
          const codeB = b.codes[0]?.code || ''
          return codeA.localeCompare(codeB)
        case 'severity':
          const severityA = getDtcSeverity(a.codes[0]?.code || '')
          const severityB = getDtcSeverity(b.codes[0]?.code || '')
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          return severityOrder[severityA] - severityOrder[severityB]
        default:
          return 0
      }
    })

    return filtered
  }, [recentMalfunctions, searchQuery, filterSeverity, sortBy, getDtcSeverity])

  const handleRefresh = useCallback(async () => {
    await refreshConnectionStatus()
  }, [refreshConnectionStatus])

  const handleItemPress = useCallback((item: MalfunctionRecord) => {
    // Could navigate to detail screen in future
    console.log('DTC item pressed:', item)
  }, [])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.palette.neutral900 || '#111827'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostic Trouble Codes</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Filter size={24} color={colors.palette.neutral900 || '#111827'} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.palette.neutral500 || '#6B7280'} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search DTC codes or descriptions..."
          placeholderTextColor={colors.palette.neutral500 || '#6B7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <X size={20} color={colors.palette.neutral500 || '#6B7280'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Sort by:</Text>
            <View style={styles.filterButtons}>
              {(['date', 'code', 'severity'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSortBy(option)}
                  style={[
                    styles.filterButton,
                    sortBy === option && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      sortBy === option && styles.filterButtonTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Severity:</Text>
            <View style={styles.filterButtons}>
              {(['all', 'critical', 'warning', 'info'] as FilterSeverity[]).map((severity) => (
                <TouchableOpacity
                  key={severity}
                  onPress={() => setFilterSeverity(severity)}
                  style={[
                    styles.filterButton,
                    filterSeverity === severity && styles.filterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterSeverity === severity && styles.filterButtonTextActive,
                    ]}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredAndSortedData.length} DTC{filteredAndSortedData.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* DTC List */}
      <DtcList
        data={filteredAndSortedData}
        onRefresh={handleRefresh}
        onItemPress={handleItemPress}
        emptyMessage="No diagnostic trouble codes match your filters"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.neutral200 || '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.palette.neutral900 || '#111827',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral100 || '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.palette.neutral200 || '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.palette.neutral900 || '#111827',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: colors.palette.neutral50 || '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.neutral200 || '#E5E7EB',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.palette.neutral700 || '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.palette.neutral200 || '#E5E7EB',
    borderWidth: 1,
    borderColor: colors.palette.neutral300 || '#D1D5DB',
  },
  filterButtonActive: {
    backgroundColor: colors.tint || '#5750F1',
    borderColor: colors.tint || '#5750F1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.palette.neutral700 || '#374151',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background || '#FFFFFF',
  },
  resultsText: {
    fontSize: 14,
    color: colors.palette.neutral600 || '#4B5563',
  },
})

