import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Screen } from '@/components/Screen'
import { Surface } from 'react-native-paper'
import { useAppTheme } from '@/theme/context'
import { RealmService } from '@/database/realm'
import { Icon } from '@/components/Icon'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')

interface LogEntry {
  id: string
  status: 'DRIVING' | 'ON_DUTY' | 'OFF_DUTY' | 'SLEEPER_BERTH'
  time: string
  duration: string
  location: string
  note?: string
}

export const LogsScreen: React.FC = () => {
  const { theme } = useAppTheme()
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Mock log entries - in real app, this would come from Realm
  const logEntries: LogEntry[] = [
    {
      id: '1',
      status: 'DRIVING',
      time: '12:32:16 PM (PST)',
      duration: '5h 42min',
      location: 'Reno, NV 84012'
    },
    {
      id: '2',
      status: 'ON_DUTY',
      time: '12:19:34 PM (PST)',
      duration: '13min',
      location: 'Reno, NV 84012',
      note: 'DVIR'
    },
    {
      id: '3',
      status: 'OFF_DUTY',
      time: '01:51:03 PM (PST)',
      duration: '10h 28min',
      location: 'Mountain View, CA 94012'
    },
    {
      id: '4',
      status: 'DRIVING',
      time: '00:00:00 AM (PST)',
      duration: '1h 51min',
      location: 'Oakland, CA 94502'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRIVING':
        return theme.colors.warning
      case 'ON_DUTY':
        return theme.colors.success
      case 'OFF_DUTY':
        return theme.colors.error
      case 'SLEEPER_BERTH':
        return theme.colors.tint
      default:
        return theme.colors.border
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRIVING':
        return 'D'
      case 'ON_DUTY':
        return 'ON'
      case 'OFF_DUTY':
        return 'OFF'
      case 'SLEEPER_BERTH':
        return 'SB'
      default:
        return '?'
    }
  }

  return (
    <Screen 
      preset="scroll"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Professional Header */}
      <View style={styles.header}>
        <Text style={styles.dateTitle}>
          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <View style={styles.signButton}>
          <Text style={styles.signButtonText}>Sign !</Text>
        </View>
      </View>

      {/* Professional Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Docs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>DVIR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Sign !</Text>
        </TouchableOpacity>
      </View>

      {/* Professional Timeline Graph */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineYAxis}>
            <Text style={styles.yAxisLabel}>OFF</Text>
            <Text style={styles.yAxisLabel}>SB</Text>
            <Text style={styles.yAxisLabel}>D</Text>
            <Text style={styles.yAxisLabel}>ON</Text>
          </View>
          
          <View style={styles.timelineGraph}>
            <View style={styles.timelineBars}>
              <View style={[styles.timelineBar, styles.drivingBar]} />
              <View style={[styles.timelineBar, styles.offDutyBar]} />
              <View style={[styles.timelineBar, styles.onDutyBar]} />
              <View style={[styles.timelineBar, styles.drivingBar]} />
            </View>
            
            <View style={styles.timelineXAxis}>
              <Text style={styles.xAxisLabel}>M</Text>
              <Text style={styles.xAxisLabel}>1</Text>
              <Text style={styles.xAxisLabel}>2</Text>
              <Text style={styles.xAxisLabel}>3</Text>
              <Text style={styles.xAxisLabel}>4</Text>
              <Text style={styles.xAxisLabel}>5</Text>
              <Text style={styles.xAxisLabel}>6</Text>
              <Text style={styles.xAxisLabel}>7</Text>
              <Text style={styles.xAxisLabel}>8</Text>
              <Text style={styles.xAxisLabel}>9</Text>
              <Text style={styles.xAxisLabel}>10</Text>
              <Text style={styles.xAxisLabel}>11</Text>
              <Text style={styles.xAxisLabel}>N</Text>
              <Text style={styles.xAxisLabel}>1</Text>
              <Text style={styles.xAxisLabel}>2</Text>
              <Text style={styles.xAxisLabel}>3</Text>
              <Text style={styles.xAxisLabel}>4</Text>
              <Text style={styles.xAxisLabel}>5</Text>
              <Text style={styles.xAxisLabel}>6</Text>
              <Text style={styles.xAxisLabel}>7</Text>
              <Text style={styles.xAxisLabel}>8</Text>
              <Text style={styles.xAxisLabel}>9</Text>
              <Text style={styles.xAxisLabel}>10</Text>
              <Text style={styles.xAxisLabel}>11</Text>
              <Text style={styles.xAxisLabel}>M</Text>
            </View>
          </View>
          
          <View style={styles.timelineMarkers}>
            <Text style={styles.timelineMarker}>10:04</Text>
            <Text style={styles.timelineMarker}>00:00</Text>
            <Text style={styles.timelineMarker}>07:48</Text>
            <Text style={styles.timelineMarker}>00:13</Text>
          </View>
        </View>
      </View>

      {/* Professional Log Entries */}
      <View style={styles.logEntries}>
        {logEntries.map((entry) => (
          <View key={entry.id} style={styles.logEntry}>
            <View style={styles.logEntryContent}>
              <View style={[styles.statusIcon, { backgroundColor: getStatusColor(entry.status) }]}>
                <Text style={styles.statusIconText}>
                  {getStatusIcon(entry.status)}
                </Text>
              </View>
              
              <View style={styles.logEntryDetails}>
                <View style={styles.logEntryHeader}>
                  <Text style={styles.logTime}>
                    {entry.time}
                  </Text>
                  <Text style={styles.logDuration}>
                    {entry.duration}
                  </Text>
                </View>
                
                {entry.note && (
                  <Text style={styles.logNote}>
                    {entry.note}
                  </Text>
                )}
                
                <TouchableOpacity>
                  <Text style={styles.logLocation}>
                    {entry.location}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.editButton}>
                <Icon icon="more" color="#718096" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    paddingBottom: 20,
  },
  
  // Professional Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3748',
  },
  signButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Professional Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007BFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#007BFF',
    fontWeight: '700',
  },
  
  // Professional Timeline
  timelineCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  timelineContainer: {
    padding: 20,
    position: 'relative',
  },
  timelineYAxis: {
    position: 'absolute',
    left: 0,
    top: 20,
    height: 80,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  yAxisLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    textAlign: 'center',
  },
  timelineGraph: {
    marginLeft: 30,
    position: 'relative',
  },
  timelineBars: {
    height: 80,
    flexDirection: 'row',
    gap: 1,
    marginBottom: 12,
  },
  timelineBar: {
    flex: 1,
    borderRadius: 2,
  },
  drivingBar: {
    backgroundColor: '#FFC107',
    height: 20,
    alignSelf: 'flex-end',
  },
  offDutyBar: {
    backgroundColor: '#DC3545',
    height: 20,
    alignSelf: 'flex-start',
  },
  onDutyBar: {
    backgroundColor: '#28A745',
    height: 20,
    alignSelf: 'center',
  },
  timelineXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#A0AEC0',
    textAlign: 'center',
  },
  timelineMarkers: {
    position: 'absolute',
    right: -40,
    top: 20,
    height: 80,
    justifyContent: 'space-between',
  },
  timelineMarker: {
    fontSize: 10,
    fontWeight: '700',
    color: '#718096',
    textAlign: 'right',
  },
  
  // Professional Log Entries
  logEntries: {
    paddingHorizontal: 20,
    gap: 12,
  },
  logEntry: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  logEntryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  logEntryDetails: {
    flex: 1,
    gap: 6,
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  logDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  logNote: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  logLocation: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
})
