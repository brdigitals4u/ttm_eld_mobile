/**
 * History Progress Indicator Component
 *
 * Shows progress for history fetches with record counts and chunk progress
 * Supports cancellation
 */

import React from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { X, Clock } from "lucide-react-native"

import { translate } from "@/i18n/translate"
import { colors } from "@/theme/colors"

import { Text } from "./Text"

export interface HistoryProgressIndicatorProps {
  stage?: "5min" | "4hr" | "24hr" | "custom"
  currentChunk: number
  totalChunks: number
  recordsReceived: number
  estimatedTotal?: number
  onCancel?: () => void
}

export const HistoryProgressIndicator: React.FC<HistoryProgressIndicatorProps> = ({
  stage,
  currentChunk,
  totalChunks,
  recordsReceived,
  estimatedTotal,
  onCancel,
}) => {
  const getStageLabel = () => {
    switch (stage) {
      case "5min":
        return translate("eld.history.last5Minutes" as any)
      case "4hr":
        return translate("eld.history.last4Hours" as any)
      case "24hr":
        return translate("eld.history.last24Hours" as any)
      default:
        return translate("eld.history.title" as any)
    }
  }

  const stageLabel = getStageLabel()
  const progress = totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0
  const recordProgress = estimatedTotal ? (recordsReceived / estimatedTotal) * 100 : null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clock size={16} color={colors.tint} />
          <Text style={styles.title}>
            {translate("eld.history.downloading" as any, { stage: stageLabel })}
          </Text>
        </View>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <X size={16} color={colors.light?.textSecondary || colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chunk Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {translate("eld.history.hour" as any, { current: currentChunk, total: totalChunks })}
        </Text>
      </View>

      {/* Record Count */}
      <View style={styles.recordContainer}>
        <Text style={styles.recordText}>
          {translate("eld.history.records" as any, {
            count: recordsReceived,
            total: estimatedTotal || 0,
          })}
        </Text>
        {recordProgress !== null && (
          <View style={styles.recordProgressBar}>
            <View style={[styles.recordProgressFill, { width: `${recordProgress}%` }]} />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cancelButton: {
    padding: 4,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  progressBar: {
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressFill: {
    backgroundColor: colors.tint,
    borderRadius: 4,
    height: "100%",
  },
  progressText: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
  },
  recordContainer: {
    marginTop: 4,
  },
  recordProgressBar: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    overflow: "hidden",
  },
  recordProgressFill: {
    backgroundColor: colors.tint,
    borderRadius: 2,
    height: "100%",
    opacity: 0.6,
  },
  recordText: {
    color: colors.light?.textSecondary || colors.text,
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
})
