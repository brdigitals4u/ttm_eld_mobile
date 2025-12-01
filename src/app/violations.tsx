import React, { useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { router } from "expo-router"
import { AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react-native"

import { useViolations } from "@/api/driver-hooks"
import ElevatedCard from "@/components/EvevatedCard"
import { Header } from "@/components/Header"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"

export default function ViolationsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { isAuthenticated } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const { data: violationsData, isLoading, refetch } = useViolations(isAuthenticated)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getViolationIcon = (type: string) => {
    switch (type) {
      case "shiftHours":
        return <Clock size={20} color="#EF4444" strokeWidth={2.5} />
      case "driveHours":
        return <AlertTriangle size={20} color="#EF4444" strokeWidth={2.5} />
      case "breakRequired":
        return <Clock size={20} color="#F59E0B" strokeWidth={2.5} />
      default:
        return <AlertTriangle size={20} color="#EF4444" strokeWidth={2.5} />
    }
  }

  const getViolationColor = (type: string) => {
    switch (type) {
      case "shiftHours":
      case "driveHours":
        return "#EF4444"
      case "breakRequired":
        return "#F59E0B"
      default:
        return "#EF4444"
    }
  }

  const violations = violationsData?.violations || []

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={translate("violations.title" as any)}
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: 0.3,
          paddingLeft: 20,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => (router.canGoBack() ? router.back() : router.push("/dashboard"))}
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
        style={{
          paddingHorizontal: 16,
        }}
        safeAreaEdges={["top"]}
      />

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {translate("violations.loadingViolations" as any)}
          </Text>
        </View>
      ) : violations.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.PRIMARY}
            />
          }
        >
          <CheckCircle size={64} color="#10B981" strokeWidth={2} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {translate("violations.noViolations" as any)}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textDim }]}>
            You are currently in compliance with all Hours of Service regulations.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.PRIMARY}
            />
          }
        >
          {/* Summary Card */}
          <ElevatedCard style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <AlertTriangle size={24} color="#EF4444" strokeWidth={2.5} />
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Active Violations</Text>
                <Text style={[styles.summaryCount, { color: "#EF4444" }]}>
                  {violations.length} violation{violations.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Text style={[styles.summaryMessage, { color: colors.textDim }]}>
              These violations require immediate attention. Review each violation and take
              appropriate action.
            </Text>
          </ElevatedCard>

          {/* Violations List */}
          {violations.map((violation, index) => {
            const violationColor = getViolationColor(violation.type)
            const isResolved = violation.resolved

            return (
              <ElevatedCard key={violation.id || index} style={styles.violationCard}>
                <View style={styles.violationHeader}>
                  <View
                    style={[
                      styles.violationIconContainer,
                      { backgroundColor: `${violationColor}15` },
                    ]}
                  >
                    {getViolationIcon(violation.type)}
                  </View>
                  <View style={styles.violationHeaderContent}>
                    <View style={styles.violationTitleRow}>
                      <Text style={[styles.violationType, { color: violationColor }]}>
                        {violation.type?.replace(/([A-Z])/g, " $1").trim() || "HOS Violation"}
                      </Text>
                      {isResolved && (
                        <View style={styles.resolvedBadge}>
                          <CheckCircle size={14} color="#10B981" strokeWidth={2.5} />
                          <Text style={styles.resolvedText}>Resolved</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.violationDescription, { color: colors.text }]}>
                      {violation.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.violationDetails}>
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.textDim} strokeWidth={2} />
                    <Text style={[styles.detailLabel, { color: colors.textDim }]}>Start:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(violation.start_time)}
                    </Text>
                  </View>

                  {violation.end_time && (
                    <View style={styles.detailRow}>
                      <Clock size={16} color={colors.textDim} strokeWidth={2} />
                      <Text style={[styles.detailLabel, { color: colors.textDim }]}>End:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {formatDate(violation.end_time)}
                      </Text>
                    </View>
                  )}
                </View>
              </ElevatedCard>
            )
          })}

          {/* Info Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textDim }]}>
              Violations are automatically detected based on Hours of Service regulations. Contact
              your fleet manager if you have questions about any violation.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: 16,
    padding: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  footer: {
    marginTop: 8,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  resolvedBadge: {
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resolvedText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 8,
    padding: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: "800",
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  violationCard: {
    padding: 16,
  },
  violationDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  violationDetails: {
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  violationHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  violationHeaderContent: {
    flex: 1,
  },
  violationIconContainer: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  violationTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  violationType: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
  },
})
