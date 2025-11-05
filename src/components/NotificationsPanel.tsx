import React, { useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Text } from '@/components/Text'
import { AlertTriangle, FileEdit, FileCheck, XCircle, CheckCircle, Bell } from 'lucide-react-native'
import { useNotifications, useMarkAsRead, Notification } from '@/api/notifications'
import { colors } from '@/theme/colors'
import { router } from 'expo-router'
import { NotificationService } from '@/services/NotificationService'

interface NotificationsPanelProps {
  onClose?: () => void
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const { data, isLoading, error, refetch } = useNotifications()
  const markAsReadMutation = useMarkAsRead()

  // Sync badge count with unread notifications
  useEffect(() => {
    if (data?.unread_count !== undefined) {
      NotificationService.setBadgeCount(data.unread_count).catch(console.error)
    }
  }, [data?.unread_count])

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id)
    }

    // Handle profile change notifications
    if (notification.type === 'profile_change_approved' || notification.type === 'profile_change_rejected') {
      router.push({
        pathname: '/profile-requests',
        params: { notificationId: notification.id },
      } as any)
      if (onClose) onClose()
      return
    }

    // Navigate to action if available (but exclude profile requests action)
    if (notification.action && !notification.action.includes('/driver/profile/requests')) {
      router.push(notification.action as any)
    }

    // Close panel
    if (onClose) {
      onClose()
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconSize = 20
    const iconColor = getPriorityColor(priority)

    switch (type) {
      case 'malfunction_alert':
        return <AlertTriangle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case 'pending_edit':
        return <FileEdit size={iconSize} color={iconColor} strokeWidth={2.5} />
      case 'certification_reminder':
        return <FileCheck size={iconSize} color={iconColor} strokeWidth={2.5} />
      case 'violation_warning':
        return <XCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case 'profile_change_approved':
        return <CheckCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case 'profile_change_rejected':
        return <XCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      default:
        return <Bell size={iconSize} color={iconColor} strokeWidth={2.5} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#DC2626'
      case 'high':
        return '#F59E0B'
      case 'medium':
        return colors.PRIMARY
      case 'low':
        return '#6B7280'
      default:
        return '#6B7280'
    }
  }

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#FEE2E2'
      case 'high':
        return '#FEF3C7'
      case 'medium':
        return '#EFF6FF'
      case 'low':
        return '#F3F4F6'
      default:
        return '#F3F4F6'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <XCircle size={48} color="#EF4444" strokeWidth={2} />
          <Text style={styles.emptyTitle}>Failed to Load</Text>
          <Text style={styles.emptyText}>Unable to fetch notifications</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unread_count || 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={20} color={colors.PRIMARY} strokeWidth={2.5} />
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={48} color="#10B981" strokeWidth={2} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>You have no new notifications</Text>
          </View>
        ) : (
          <>
            {/* Critical/High Priority First */}
            {notifications
              .filter((n) => n.priority === 'critical' || n.priority === 'high')
              .map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.notificationItemUnread,
                    { backgroundColor: getPriorityBg(notification.priority) },
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type, notification.priority)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}

            {/* Medium/Low Priority */}
            {notifications
              .filter((n) => n.priority === 'medium' || n.priority === 'low')
              .map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.notificationItemUnread,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type, notification.priority)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatTimestamp(notification.timestamp)}
                    </Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: 500,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  notificationItemUnread: {
    backgroundColor: '#F9FAFB',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.PRIMARY,
    marginLeft: 8,
    marginTop: 6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
