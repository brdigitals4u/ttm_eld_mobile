import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { Surface } from 'react-native-paper'
import { useAppTheme } from '@/theme/context'
import { RealmService } from '@/database/realm'
import { Icon } from '@/components/Icon'

export const HOSScreen: React.FC = () => {
  const { theme } = useAppTheme()
  
  // Get HOS data from Realm
  const hosStatus = RealmService.getHOSStatus() as any
  const driverProfile = RealmService.getDriverProfile() as any

  const currentHOS = hosStatus || {}
  const currentDriver = driverProfile || {}

  const formatTime = (minutes: number) => {
    if (!minutes) return '00:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (remaining: number, max: number) => {
    return Math.min((remaining / max) * 100, 100)
  }

  return (
    <Screen 
      preset="scroll"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <Text preset="heading" style={[styles.driverName, { color: theme.colors.text }]}>
            {currentDriver.name || 'Driver Name'}
          </Text>
          <View style={styles.connectionStatus}>
            <View style={[styles.connectionIndicator, { backgroundColor: theme.colors.success }]} />
            <Text preset="default" style={[styles.connectionText, { color: theme.colors.success }]}>
              CONNECTED
            </Text>
          </View>
        </View>
      </View>

      {/* HOS Rule */}
      <View style={styles.hosRule}>
        <Text preset="default" style={[styles.hosRuleText, { color: theme.colors.text }]}>
          USA 70 hours / 8 days
        </Text>
      </View>

      {/* Main Timer */}
      <Surface style={[styles.mainTimerCard, { backgroundColor: theme.colors.background }]} elevation={3}>
        <View style={styles.mainTimer}>
          <View style={[styles.circularTimer, { borderColor: theme.colors.tint }]}>
            <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
              {formatTime(currentHOS.driving_time_remaining || 0)}
            </Text>
            <Text preset="default" style={[styles.timerLabel, { color: theme.colors.textDim }]}>
              Stop In
            </Text>
          </View>
        </View>
      </Surface>

      {/* HOS Timers */}
      <View style={styles.timersSection}>
        <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
          <View style={styles.timerHeader}>
            <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
              Drive Left
            </Text>
            <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
              {formatTime(currentHOS.driving_time_remaining || 0)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { 
              backgroundColor: theme.colors.tint,
              width: `${getProgressPercentage(currentHOS.driving_time_remaining || 0, 660)}%` // 11 hours max
            }]} />
          </View>
        </Surface>

        <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
          <View style={styles.timerHeader}>
            <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
              Shift Left
            </Text>
            <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
              {formatTime(currentHOS.on_duty_time_remaining || 0)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { 
              backgroundColor: theme.colors.tint,
              width: `${getProgressPercentage(currentHOS.on_duty_time_remaining || 0, 840)}%` // 14 hours max
            }]} />
          </View>
        </Surface>

        <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
          <View style={styles.timerHeader}>
            <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
              Cycle Left
            </Text>
            <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
              {formatTime(currentHOS.cycle_time_remaining || 0)}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.progressFill, { 
              backgroundColor: theme.colors.tint,
              width: `${getProgressPercentage(currentHOS.cycle_time_remaining || 0, 4200)}%` // 70 hours max
            }]} />
          </View>
        </Surface>
      </View>

      {/* Current Status */}
      <Surface style={[styles.statusCard, { backgroundColor: theme.colors.background }]} elevation={2}>
        <View style={styles.statusHeader}>
          <Text preset="subheading" style={[styles.statusLabel, { color: theme.colors.text }]}>
            Current Status
          </Text>
          <TouchableOpacity style={[styles.statusButton, { borderColor: theme.colors.tint }]}>
            <Icon icon="more" color={theme.colors.tint} size={20} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.currentStatus, { backgroundColor: theme.colors.warning }]}>
          <Text preset="heading" style={[styles.statusText, { color: '#000' }]}>
            {currentHOS.current_status || 'OFF DUTY'}
          </Text>
        </View>
      </Surface>

      {/* HOS Violations */}
      {currentHOS.active_violations && currentHOS.active_violations.length > 0 && (
        <Surface style={[styles.violationsCard, { backgroundColor: theme.colors.background }]} elevation={2}>
          <Text preset="subheading" style={[styles.violationsTitle, { color: theme.colors.error }]}>
            Active Violations
          </Text>
          {currentHOS.active_violations.map((violation: any, index: number) => (
            <View key={index} style={styles.violationItem}>
              <View style={[styles.violationIcon, { backgroundColor: theme.colors.error }]}>
                <Text style={styles.violationIconText}>!</Text>
              </View>
              <View style={styles.violationDetails}>
                <Text preset="default" style={[styles.violationType, { color: theme.colors.text }]}>
                  {violation.type || 'HOS Violation'}
                </Text>
                <Text preset="default" style={[styles.violationDescription, { color: theme.colors.textDim }]}>
                  {violation.description || 'Hours of Service violation detected'}
                </Text>
              </View>
            </View>
          ))}
        </Surface>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          preset="reversed"
          text="Change Status"
          onPress={() => {}}
          style={[styles.actionButton, { borderColor: theme.colors.tint }]}
          textStyle={{ color: theme.colors.tint }}
        />
        <Button
          preset="filled"
          text="View Logs"
          onPress={() => {}}
          style={styles.actionButton}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 12,
  },
  driverInfo: {
    gap: 8,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontWeight: '600',
    fontSize: 12,
  },
  hosRule: {
    alignItems: 'center',
  },
  hosRuleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mainTimerCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  mainTimer: {
    alignItems: 'center',
  },
  circularTimer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: 16,
    marginTop: 8,
  },
  timersSection: {
    gap: 12,
  },
  timerCard: {
    padding: 16,
    borderRadius: 12,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentStatus: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  violationsCard: {
    padding: 16,
    borderRadius: 12,
  },
  violationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  violationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  violationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  violationIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  violationDetails: {
    flex: 1,
    gap: 4,
  },
  violationType: {
    fontSize: 14,
    fontWeight: '600',
  },
  violationDescription: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
})
