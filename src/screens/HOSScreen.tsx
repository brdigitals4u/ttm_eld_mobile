import React, { useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Pressable, Linking } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { Header } from '@/components/Header'
import { Surface } from 'react-native-paper'
import { useAppTheme } from '@/theme/context'
import { Icon } from '@/components/Icon'
import { useHOSCurrentStatus, useHOSClocks, useViolations } from '@/api/driver-hooks'
import { useAuth } from '@/stores/authStore'
import { useStatusStore } from '@/stores/statusStore'
import { router } from 'expo-router'
import { AlertTriangle, Clock } from 'lucide-react-native'

export const HOSScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { isAuthenticated, driverProfile } = useAuth()
  const { currentStatus } = useStatusStore()

  // Get HOS data from API
  const { data: currentHOSStatus, isLoading: isStatusLoading } = useHOSCurrentStatus({
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })
  const { data: hosClocks, isLoading: isClocksLoading } = useHOSClocks(isAuthenticated)
  const { data: violationsData } = useViolations(isAuthenticated)

  // Filter to only unresolved violations
  const unresolvedViolations = useMemo(() => {
    if (!violationsData?.violations) return []
    return violationsData.violations.filter((v: any) => v.resolved === false)
  }, [violationsData])

  const isLoading = isStatusLoading || isClocksLoading
  const currentHOS = currentHOSStatus || {} as any
  const clocks = hosClocks || {} as any
  const currentDriver = driverProfile || {} as any

  const handleLogoPress = useCallback(() => {
    Linking.openURL('https://ttmkonnect.com').catch((error) => console.warn('Failed to open ttmkonnect.com', error))
  }, [])

  const formatTime = (minutes: number) => {
    if (!minutes && minutes !== 0) return '00:00'
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (remaining: number, max: number) => {
    if (!remaining && remaining !== 0) return 0
    return Math.min((Math.abs(remaining) / max) * 100, 100)
  }

  const formatStatus = (status: string) => {
    if (!status) return 'OFF DUTY'
    return status.replace(/_/g, ' ').toUpperCase()
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header
          title="Hours of Service"
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
          RightActionComponent={
            <View style={{ paddingRight: 4 }}>
              <Pressable onPress={handleLogoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Image
                source={require('assets/images/ttm-logo.png')}
                style={{ width: 120, height: 32, resizeMode: 'contain' }}
              />
              </Pressable>
            </View>}
        />



        <Screen preset="fixed" style={styles.screen}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text preset="default" style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading HOS data...
            </Text>
          </View>
        </Screen>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
             <Header
          title="Hours of Service"
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
          RightActionComponent={
            <View style={{ paddingRight: 4 }}>
              <Pressable onPress={handleLogoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Image
                source={require('assets/images/ttm-logo.png')}
                style={{ width: 120, height: 32, resizeMode: 'contain' }}
              />
              </Pressable>
            </View>}
        />
      <Screen
        preset="scroll"
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        {/* HOS Rule */}
        <View style={styles.hosRule}>
          <Text preset="default" style={[styles.hosRuleText, { color: theme.colors.text }]}>
            {clocks.cycle_60_70hr?.cycle_type === '70_8' ? 'USA 70 hours / 8 days' : 'USA 60 hours / 7 days'}
          </Text>
        </View>

        {/* Main Timer */}
        <Surface style={[styles.mainTimerCard, { backgroundColor: theme.colors.background }]} elevation={3}>
          <View style={styles.mainTimer}>
            <View style={[styles.circularTimer, { borderColor: theme.colors.tint }]}>
              <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
                {formatTime(currentHOS.clocks?.drive?.remaining_minutes ?? clocks.driving_11hr?.remaining_minutes ?? 0)}
              </Text>

            </View>
          </View>
          <Text preset="default" style={[styles.timerLabel, { color: theme.colors.textDim }]}>
            Drive Time Remaining
          </Text>
        </Surface>

        {/* HOS Timers */}
        <View style={styles.timersSection}>
          <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
            <View style={styles.timerHeader}>
              <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
                11-Hour Drive Limit
              </Text>
              <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
                {formatTime(currentHOS.clocks?.drive?.remaining_minutes ?? clocks.driving_11hr?.remaining_minutes ?? 0)}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.progressFill, {
                backgroundColor: clocks.driving_11hr?.violation ? '#EF4444' : theme.colors.tint,
                width: `${getProgressPercentage(
                  currentHOS.clocks?.drive?.remaining_minutes ?? clocks.driving_11hr?.remaining_minutes ?? 0,
                  660
                )}%`
              }]} />
            </View>
            {clocks.driving_11hr?.regulation && (
              <Text preset="default" style={[styles.regulationText, { color: theme.colors.textDim }]}>
                {clocks.driving_11hr.regulation}
              </Text>
            )}
          </Surface>

          <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
            <View style={styles.timerHeader}>
              <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
                14-Hour Shift Limit
              </Text>
              <Text preset="heading" style={[styles.timerValue, {
                color: clocks.shift_14hr?.violation ? '#EF4444' : theme.colors.text
              }]}>
                {formatTime(currentHOS.clocks?.shift?.remaining_minutes ?? clocks.shift_14hr?.remaining_minutes ?? 0)}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.progressFill, {
                backgroundColor: clocks.shift_14hr?.violation ? '#EF4444' : theme.colors.tint,
                width: `${getProgressPercentage(
                  currentHOS.clocks?.shift?.remaining_minutes ?? clocks.shift_14hr?.remaining_minutes ?? 0,
                  840
                )}%`
              }]} />
            </View>
            {clocks.shift_14hr?.regulation && (
              <Text preset="default" style={[styles.regulationText, { color: theme.colors.textDim }]}>
                {clocks.shift_14hr.regulation}
              </Text>
            )}
          </Surface>

          <Surface style={[styles.timerCard, { backgroundColor: theme.colors.background }]} elevation={2}>
            <View style={styles.timerHeader}>
              <Text preset="subheading" style={[styles.timerTitle, { color: theme.colors.text }]}>
                {clocks.cycle_60_70hr?.cycle_type === '70_8' ? '70-Hour / 8-Day' : '60-Hour / 7-Day'} Cycle
              </Text>
              <Text preset="heading" style={[styles.timerValue, { color: theme.colors.text }]}>
                {formatTime(currentHOS.clocks?.cycle?.remaining_minutes ?? clocks.cycle_60_70hr?.remaining_minutes ?? 0)}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.progressFill, {
                backgroundColor: clocks.cycle_60_70hr?.violation ? '#EF4444' : theme.colors.tint,
                width: `${getProgressPercentage(
                  currentHOS.clocks?.cycle?.remaining_minutes ?? clocks.cycle_60_70hr?.remaining_minutes ?? 0,
                  clocks.cycle_60_70hr?.limit_minutes ?? 4200
                )}%`
              }]} />
            </View>
            {clocks.cycle_60_70hr?.regulation && (
              <Text preset="default" style={[styles.regulationText, { color: theme.colors.textDim }]}>
                {clocks.cycle_60_70hr.regulation}
              </Text>
            )}
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

          <View style={[styles.currentStatus, {
            backgroundColor: currentHOS.can_drive === false ? '#FEE2E2' : theme.colors.warning
          }]}>
            <Text preset="heading" style={[styles.statusText, { color: '#000' }]}>
              {formatStatus(currentHOS.current_status || currentStatus)}
            </Text>
            {currentHOS.can_drive === false && currentHOS.cannot_drive_reasons && (
              <View style={styles.cannotDriveReasons}>
                {currentHOS.cannot_drive_reasons.map((reason: string, idx: number) => (
                  <Text key={idx} preset="default" style={[styles.reasonText, { color: '#DC2626' }]}>
                    • {reason}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Surface>

        {/* HOS Violations */}
        {(unresolvedViolations.length > 0 ||
          (clocks.violations && clocks.violations.length > 0)) && (
            <Surface style={[styles.violationsCard, { backgroundColor: theme.colors.background }]} elevation={2}>
              <View style={styles.violationsHeader}>
                <Text preset="subheading" style={[styles.violationsTitle, { color: theme.colors.error }]}>
                  Active Violations
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/violations' as any)}
                  style={styles.viewAllButton}
                >
                  <Text style={[styles.viewAllText, { color: theme.colors.tint }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {(unresolvedViolations || clocks.violations || []).slice(0, 3).map((violation: any, index: number) => (
                <TouchableOpacity
                  key={violation.id || index}
                  style={styles.violationItem}
                  onPress={() => router.push('/violations' as any)}
                >
                  <View style={[styles.violationIcon, { backgroundColor: theme.colors.error }]}>
                    <AlertTriangle size={16} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.violationDetails}>
                    <Text preset="default" style={[styles.violationType, { color: theme.colors.text }]}>
                      {violation.type || 'HOS Violation'}
                    </Text>
                    <Text preset="default" style={[styles.violationDescription, { color: theme.colors.textDim }]}>
                      {violation.description || 'Hours of Service violation detected'}
                    </Text>
                    {violation.regulation && (
                      <Text preset="default" style={[styles.regulationText, { color: theme.colors.textDim }]}>
                        {violation.regulation}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </Surface>
          )}

        {/* Action Buttons */}

      </Screen>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  regulationText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  violationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cannotDriveReasons: {
    marginTop: 8,
    gap: 4,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '500',
  },
})
