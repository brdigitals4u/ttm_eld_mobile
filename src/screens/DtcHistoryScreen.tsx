/**
 * DTC History Screen - Full screen displaying all DTC codes with filtering and search
 * Uses FlatList with performance optimizations
 */

import React, { useState, useMemo, useCallback } from "react"
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { Search, Filter, X } from "lucide-react-native"

import { DtcList } from "@/components/DtcList"
import { Header } from "@/components/Header"
import { Text } from "@/components/Text"
import { useObdData } from "@/contexts/obd-data-context"
import { MalfunctionRecord } from "@/contexts/obd-data-context"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

type SortOption = "date" | "code" | "severity"
type FilterSeverity = "all" | "critical" | "warning" | "info"

export const DtcHistoryScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors: themeColors, isDark } = theme
  const { recentMalfunctions, refreshConnectionStatus } = useObdData()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("date")
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all")
  const [showFilters, setShowFilters] = useState(false)

  // Get severity for a DTC code
  const getDtcSeverity = useCallback((code: string): "critical" | "warning" | "info" => {
    const upperCode = code.toUpperCase()

    if (
      upperCode.startsWith("P0195") ||
      upperCode.startsWith("P0300") ||
      upperCode.startsWith("P0301") ||
      upperCode.startsWith("P0302") ||
      upperCode.startsWith("P0303") ||
      upperCode.startsWith("P0304") ||
      upperCode.startsWith("P0420") ||
      upperCode.startsWith("P0171") ||
      upperCode.startsWith("P0172")
    ) {
      return "critical"
    }

    if (
      upperCode.startsWith("P0128") ||
      upperCode.startsWith("P0401") ||
      upperCode.startsWith("P0455")
    ) {
      return "warning"
    }

    return "info"
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
          const descStr = (code.faultDescription || code.genericDescription || "").toLowerCase()
          return codeStr.includes(query) || descStr.includes(query)
        })
      })
    }

    // Filter by severity
    if (filterSeverity !== "all") {
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
        case "date":
          return b.timestamp.getTime() - a.timestamp.getTime() // Newest first
        case "code":
          const codeA = a.codes[0]?.code || ""
          const codeB = b.codes[0]?.code || ""
          return codeA.localeCompare(codeB)
        case "severity":
          const severityA = getDtcSeverity(a.codes[0]?.code || "")
          const severityB = getDtcSeverity(b.codes[0]?.code || "")
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
    console.log("DTC item pressed:", item)
  }, [])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        clearButton: {
          padding: 4,
        },
        container: {
          backgroundColor: themeColors.background || "#FFFFFF",
          flex: 1,
        },
        filterButton: {
          backgroundColor: themeColors.palette.neutral200 || "#E5E7EB",
          borderColor: themeColors.palette.neutral300 || "#D1D5DB",
          borderRadius: 8,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 6,
        },
        filterButtonActive: {
          backgroundColor: themeColors.tint || "#5750F1",
          borderColor: themeColors.tint || "#5750F1",
        },
        filterButtonText: {
          color: themeColors.palette.neutral700 || "#374151",
          fontSize: 12,
          fontWeight: "500",
        },
        filterButtonTextActive: {
          color: "#FFFFFF",
        },
        filterButtons: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        },
        filterLabel: {
          color: themeColors.palette.neutral700 || "#374151",
          fontSize: 14,
          fontWeight: "600",
          marginBottom: 8,
        },
        filterRow: {
          marginBottom: 12,
        },
        filtersContainer: {
          backgroundColor: themeColors.palette.neutral100 || "#FAFAFA",
          borderBottomColor: themeColors.palette.neutral200 || "#E5E7EB",
          borderBottomWidth: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        headerFilterButton: {
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
        },
        resultsContainer: {
          backgroundColor: themeColors.background || "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        resultsText: {
          color: themeColors.palette.neutral600 || "#4B5563",
          fontSize: 14,
        },
        searchContainer: {
          alignItems: "center",
          backgroundColor: themeColors.palette.neutral100 || "#F9FAFB",
          borderColor: themeColors.palette.neutral200 || "#E5E7EB",
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          marginBottom: 8,
          marginHorizontal: 16,
          marginTop: 12,
          paddingHorizontal: 12,
        },
        searchIcon: {
          marginRight: 8,
        },
        searchInput: {
          color: themeColors.palette.neutral900 || "#111827",
          flex: 1,
          fontSize: 16,
          paddingVertical: 12,
        },
      }),
    [themeColors],
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        titleTx="dtc.title"
        titleMode="center"
        backgroundColor={themeColors.background}
        leftIcon="back"
        leftIconColor={themeColors.tint}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/(tabs)/dashboard"))}
        RightActionComponent={
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.headerFilterButton}
          >
            <Filter size={24} color={themeColors.text} />
          </TouchableOpacity>
        }
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
        style={{
          paddingHorizontal: 16,
        }}
        safeAreaEdges={["top"]}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search
          size={20}
          color={themeColors.palette.neutral500 || "#6B7280"}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={translate("dtc.searchPlaceholder" as any)}
          placeholderTextColor={themeColors.palette.neutral500 || "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <X size={20} color={themeColors.palette.neutral500 || "#6B7280"} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{translate("dtc.sortBy" as any)}</Text>
            <View style={styles.filterButtons}>
              {(["date", "code", "severity"] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSortBy(option)}
                  style={[styles.filterButton, sortBy === option && styles.filterButtonActive]}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      sortBy === option && styles.filterButtonTextActive,
                    ]}
                  >
                    {option === "date"
                      ? translate("dtc.date" as any)
                      : option === "code"
                        ? translate("dtc.code" as any)
                        : translate("dtc.severityLabel" as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{translate("dtc.severity" as any)}</Text>
            <View style={styles.filterButtons}>
              {(["all", "critical", "warning", "info"] as FilterSeverity[]).map((severity) => (
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
                    {severity === "all"
                      ? translate("dtc.all" as any)
                      : severity === "critical"
                        ? translate("dtc.critical" as any)
                        : severity === "warning"
                          ? translate("dtc.warning" as any)
                          : translate("dtc.info" as any)}
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
          {translate("dtc.found" as any, {
            count: filteredAndSortedData.length,
            plural: filteredAndSortedData.length !== 1 ? "s" : "",
          })}
        </Text>
      </View>

      {/* DTC List */}
      <DtcList
        data={filteredAndSortedData}
        onRefresh={handleRefresh}
        onItemPress={handleItemPress}
        emptyMessage={translate("dtc.noMatch" as any)}
      />
    </View>
  )
}
