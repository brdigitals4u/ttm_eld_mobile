import React, { useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Clock, CheckCircle, AlertCircle, User, Lock, ArrowLeft } from 'lucide-react-native'
import { useAppTheme } from '@/theme/context'
import { Header } from '@/components/Header'
import ElevatedCard from '@/components/EvevatedCard'
import {
  useDriverChangeRequests,
  ChangeRequest,
} from '@/api/driver-profile'
import { useMarkAsRead } from '@/api/notifications'

export default function ProfileRequestsScreen() {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const params = useLocalSearchParams<{ notificationId?: string }>()
  const { data: changeRequestsData, isLoading, refetch, error } = useDriverChangeRequests()
  const markAsReadMutation = useMarkAsRead()

  // Debug logging
  useEffect(() => {
    console.log('📋 Profile Requests Data:', JSON.stringify(changeRequestsData, null, 2))
    console.log('📋 Profile Requests Error:', error)
    console.log('📋 Profile Requests Loading:', isLoading)
  }, [changeRequestsData, error, isLoading])

  // Mark notification as read if opened from notification
  useEffect(() => {
    if (params.notificationId) {
      const notificationId = Array.isArray(params.notificationId) 
        ? params.notificationId[0] 
        : params.notificationId
      
      if (notificationId) {
        markAsReadMutation.mutate(notificationId, {
          onSuccess: () => {
            console.log('✅ Notification marked as read:', notificationId)
          },
          onError: (error) => {
            console.error('❌ Failed to mark notification as read:', error)
          },
        })
      }
    }
  }, [params.notificationId])

  // Get status badge for change request
  const getStatusBadge = (status: ChangeRequest['status'] | string = 'pending') => {
    const statusConfig = {
      pending: { icon: Clock, color: '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' },
      approved: { icon: CheckCircle, color: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
      rejected: { icon: AlertCircle, color: '#ef4444', bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' },
    }

    const normalizedStatus = (status || 'pending') as keyof typeof statusConfig
    const config = statusConfig[normalizedStatus] || statusConfig.pending
    const Icon = config.icon

    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: config.bg,
            borderColor: config.color,
          },
        ]}
      >
        <Icon size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
        </Text>
      </View>
    )
  }

  const getFieldIcon = (fieldName: string) => {
    if (fieldName.includes('name')) {
      return <User size={20} color={colors.textDim} />
    }
    if (fieldName.includes('license') || fieldName.includes('driver_license')) {
      return <Lock size={20} color={colors.textDim} />
    }
    return <Clock size={20} color={colors.textDim} />
  }

  const getFieldLabel = (fieldName: string) => {
    return fieldName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Profile Change Requests"
        titleMode="center"
        backgroundColor={colors.background}
        titleStyle={{
          fontSize: 22,
          fontWeight: '800',
          color: colors.text,
        }}
        leftIcon="back"
        leftIconColor={colors.tint}
        onLeftPress={() => router.back()}
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
        safeAreaEdges={['top']}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        {isLoading && !changeRequestsData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textDim }]}>
              Loading change requests...
            </Text>
          </View>
        ) : changeRequestsData && changeRequestsData.requests && changeRequestsData.requests.length > 0 ? (
          <>
            {/* Summary Card */}
            <ElevatedCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Total Requests</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {changeRequestsData.count || changeRequestsData.requests.length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Pending</Text>
                  <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                    {changeRequestsData.requests.filter((r) => r.status === 'pending').length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Approved</Text>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                    {changeRequestsData.requests.filter((r) => r.status === 'approved').length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Rejected</Text>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                    {changeRequestsData.requests.filter((r) => r.status === 'rejected').length}
                  </Text>
                </View>
              </View>
            </ElevatedCard>

            {/* Change Requests List */}
            {changeRequestsData.requests.map((request) => (
              <ElevatedCard key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestFieldInfo}>
                    <View style={[styles.fieldIconContainer, { backgroundColor: `${colors.tint}15` }]}>
                      {getFieldIcon(request.field_name || '')}
                    </View>
                    <View style={styles.requestFieldDetails}>
                      <Text style={[styles.fieldNameLabel, { color: colors.textDim }]}>Field</Text>
                      <Text style={[styles.fieldNameValue, { color: colors.text }]}>
                        {getFieldLabel(request.field_name || 'N/A')}
                      </Text>
                    </View>
                  </View>
                  {getStatusBadge(request.status || 'pending')}
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textDim }]}>From:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                      {request.old_value || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textDim }]}>To:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
                      {request.new_value || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textDim }]}>Reason:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={3}>
                      {request.reason || 'N/A'}
                    </Text>
                  </View>

                  {request.admin_notes && (
                    <View style={[styles.adminNotesContainer, { backgroundColor: isDark ? colors.surface : '#F3F4F6' }]}>
                      <Text style={[styles.adminNotesLabel, { color: colors.textDim }]}>Admin Notes:</Text>
                      <Text style={[styles.adminNotesValue, { color: colors.text }]}>
                        {request.admin_notes}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.requestFooter}>
                  <Text style={[styles.requestDate, { color: colors.textDim }]}>
                    Submitted: {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                  {request.reviewed_at && (
                    <Text style={[styles.requestDate, { color: colors.textDim }]}>
                      Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}
                    </Text>
                  )}
                  {request.reviewed_by && (
                    <Text style={[styles.requestDate, { color: colors.textDim }]}>
                      By: {request.reviewed_by}
                    </Text>
                  )}
                </View>
              </ElevatedCard>
            ))}
          </>
        ) : (
          <ElevatedCard style={styles.emptyCard}>
            <View style={styles.emptyContainer}>
              <Clock size={64} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Change Requests
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textDim }]}>
                You haven't submitted any profile change requests yet.
              </Text>
            </View>
          </ElevatedCard>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  requestCard: {
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  requestFieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fieldIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestFieldDetails: {
    flex: 1,
  },
  fieldNameLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldNameValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  adminNotesContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminNotesValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  requestFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 4,
  },
  requestDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})

