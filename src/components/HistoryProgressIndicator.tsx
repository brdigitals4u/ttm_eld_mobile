/**
 * History Progress Indicator Component
 * 
 * Shows progress for history fetches with record counts and chunk progress
 * Supports cancellation
 */

import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { X, Clock } from 'lucide-react-native'
import { Text } from './Text'
import { colors } from '@/theme/colors'
import { translate } from '@/i18n/translate'

export interface HistoryProgressIndicatorProps {
  stage?: '5min' | '4hr' | '24hr' | 'custom'
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
      case '5min':
        return translate('eld.history.last5Minutes' as any)
      case '4hr':
        return translate('eld.history.last4Hours' as any)
      case '24hr':
        return translate('eld.history.last24Hours' as any)
      default:
        return translate('eld.history.title' as any)
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
            {translate('eld.history.downloading' as any, { stage: stageLabel })}
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
          {translate('eld.history.hour' as any, { current: currentChunk, total: totalChunks })}
        </Text>
      </View>

      {/* Record Count */}
      <View style={styles.recordContainer}>
        <Text style={styles.recordText}>
          {translate('eld.history.records' as any, { count: recordsReceived, total: estimatedTotal || 0 })}
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
  container: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cancelButton: {
    padding: 4,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.tint,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.light?.textSecondary || colors.text,
  },
  recordContainer: {
    marginTop: 4,
  },
  recordText: {
    fontSize: 12,
    color: colors.light?.textSecondary || colors.text,
    marginBottom: 4,
  },
  recordProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  recordProgressFill: {
    height: '100%',
    backgroundColor: colors.tint,
    borderRadius: 2,
    opacity: 0.6,
  },
})

