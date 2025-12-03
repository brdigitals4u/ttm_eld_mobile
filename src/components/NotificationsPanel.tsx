import React, { useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { router } from "expo-router"
import { AlertTriangle, FileEdit, FileCheck, XCircle, CheckCircle, Bell } from "lucide-react-native"

import { useNotifications, useMarkNotificationRead, Notification } from "@/api/driver-hooks"
import { Text } from "@/components/Text"
import { NotificationService } from "@/services/NotificationService"
import { useAuth } from "@/stores/authStore"
import { useAppTheme } from "@/theme/context"
import { translate } from "@/i18n/translate"
import { useObdData } from "@/contexts/obd-data-context"
import { useViolations } from "@/api/driver-hooks"

interface NotificationsPanelProps {
  onClose?: () => void
  violationCount?: number
  dtcCount?: number
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  onClose,
  violationCount = 0,
  dtcCount = 0,
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const { isAuthenticated } = useAuth()
  const { data, isLoading, error, refetch } = useNotifications({
    status: "all",
    limit: 50,
    enabled: isAuthenticated,
    refetchInterval: 60000,
  })
  const markAsReadMutation = useMarkNotificationRead()

  // Calculate unread count from results
  const unreadCount = data?.results?.filter((n: Notification) => !n.is_read).length || 0

  const handleViolationsPress = () => {
    if (onClose) onClose()
    router.push("/violations" as any)
  }

  const handleDtcPress = () => {
    if (onClose) onClose()
    router.push("/dtc-history" as any)
  }

  // Sync badge count with unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      NotificationService.setBadgeCount(unreadCount).catch(console.error)
    }
  }, [unreadCount])

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id)
    }

    // Handle profile change notifications
    if (
      notification.notification_type === "profile_change_approved" ||
      notification.notification_type === "profile_change_rejected"
    ) {
      router.push({
        pathname: "/profile-requests",
        params: { notificationId: notification.id },
      } as any)
      if (onClose) onClose()
      return
    }

    // Navigate to action if available (check data.action)
    if (
      notification.data?.action &&
      !notification.data.action.includes("/driver/profile/requests")
    ) {
      router.push(notification.data.action as any)
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
      case "malfunction_alert":
        return <AlertTriangle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case "pending_edit":
        return <FileEdit size={iconSize} color={iconColor} strokeWidth={2.5} />
      case "certification_reminder":
        return <FileCheck size={iconSize} color={iconColor} strokeWidth={2.5} />
      case "violation_warning":
        return <XCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case "profile_change_approved":
        return <CheckCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      case "profile_change_rejected":
        return <XCircle size={iconSize} color={iconColor} strokeWidth={2.5} />
      default:
        return <Bell size={iconSize} color={iconColor} strokeWidth={2.5} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return colors.error
      case "high":
        return colors.warning
      case "medium":
        return colors.tint
      case "low":
        return colors.textDim
      default:
        return colors.textDim
    }
  }

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case "critical":
        return colors.errorBackground
      case "high":
        return colors.warningBackground
      case "medium":
        return colors.infoBackground
      case "low":
        return colors.sectionBackground
      default:
        return colors.sectionBackground
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Dynamic styles based on theme
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        closeButton: {
          padding: 8,
        },
        closeButtonText: {
          color: colors.textDim,
          fontSize: 24,
          fontWeight: "300",
        },
        container: {
          backgroundColor: colors.cardBackground,
          borderRadius: 20,
          maxHeight: 500,
          overflow: "hidden",
        },
        emptyContainer: {
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        },
        emptyText: {
          color: colors.textDim,
          fontSize: 14,
          textAlign: "center",
        },
        emptyTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 8,
          marginTop: 16,
        },
        header: {
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
        },
        headerLeft: {
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
        },
        headerTitle: {
          color: colors.text,
          fontSize: 18,
          fontWeight: "800",
        },
        loadingContainer: {
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        },
        loadingText: {
          color: colors.textDim,
          fontSize: 14,
          marginTop: 12,
        },
        notificationContent: {
          flex: 1,
        },
        notificationIcon: {
          alignItems: "center",
          backgroundColor: colors.sectionBackground,
          borderRadius: 20,
          height: 40,
          justifyContent: "center",
          marginRight: 12,
          width: 40,
        },
        notificationItem: {
          alignItems: "flex-start",
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.sectionBackground,
          borderBottomWidth: 1,
          flexDirection: "row",
          padding: 16,
        },
        notificationItemUnread: {
          backgroundColor: colors.background,
        },
        notificationMessage: {
          color: colors.textDim,
          fontSize: 14,
          lineHeight: 20,
          marginBottom: 6,
        },
        notificationTime: {
          color: colors.textDim,
          fontSize: 12,
          fontWeight: "500",
        },
        notificationTitle: {
          color: colors.text,
          fontSize: 15,
          fontWeight: "700",
          marginBottom: 4,
        },
        notificationsList: {
          maxHeight: 400,
        },
        retryButton: {
          backgroundColor: colors.tint,
          borderRadius: 12,
          marginTop: 16,
          paddingHorizontal: 24,
          paddingVertical: 12,
        },
        retryButtonText: {
          color: colors.cardBackground,
          fontSize: 14,
          fontWeight: "700",
        },
        unreadBadge: {
          alignItems: "center",
          backgroundColor: colors.error,
          borderRadius: 12,
          minWidth: 24,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
        unreadBadgeText: {
          color: colors.cardBackground,
          fontSize: 12,
          fontWeight: "700",
        },
        unreadDot: {
          backgroundColor: colors.tint,
          borderRadius: 4,
          height: 8,
          marginLeft: 8,
          marginTop: 6,
          width: 8,
        },
        viewAllText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: "700",
        }, 
        row: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }
      }),
    [colors, isDark],
  )

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={styles.loadingText}>
            {translate("notifications.loading" as any) || "Loading notifications..."}
          </Text>
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
          <XCircle size={48} color={colors.error} strokeWidth={2} />
          <Text style={styles.emptyTitle}>
            {translate("notifications.failedToLoad" as any) || "Failed to Load"}
          </Text>
          <Text style={styles.emptyText}>
            {translate("notifications.unableToFetch" as any) || "Unable to fetch notifications"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>
              {translate("notifications.tryAgain" as any) || "Try Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const notifications = data?.results || []

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
              .filter((n) => n.priority === "critical" || n.priority === "high")
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
                    {getNotificationIcon(notification.notification_type, notification.priority)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatTimestamp(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}

            {/* Medium/Low Priority */}
            {notifications
              .filter((n) => n.priority === "medium" || n.priority === "low")
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
                    {getNotificationIcon(notification.notification_type, notification.priority)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {formatTimestamp(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
          </>
        )}
        <View style={styles.row}>
          <TouchableOpacity onPress={handleViolationsPress}>  
            <Text style={styles.viewAllText}>View All Violations</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDtcPress}>
            <Text style={styles.viewAllText}>View All DTCs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
