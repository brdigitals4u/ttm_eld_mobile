import { useMemo } from "react"
import { View, StyleSheet, TouchableOpacity, Text as RNText, Image } from "react-native"
import { Bell, AlertTriangle } from "lucide-react-native"
import { router } from "expo-router"
import * as Haptics from "expo-haptics"

import { Text } from "@/components/Text"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { DtcIndicator } from "@/components/DtcIndicator"
import { useAuth } from "@/stores/authStore"
import { useCoDriver } from "@/contexts"
import { useViolationNotifications } from "@/contexts/ViolationNotificationContext"
import { useNotifications } from "@/api/driver-hooks"
import { useAppTheme } from "@/theme/context"
import { translate } from "@/i18n/translate"

interface DashboardTopHeaderProps {
  onNotificationPress?: () => void
}

/**
 * Dashboard Top Header Component
 * 
 * Matches screenshot layout:
 * - Left: Profile picture + Driver name + Co-driver name (or message)
 * - Right: 3 notification bell icons (with red dot badges)
 * - Language, Theme, Violation, DTC icons accessible via menu or secondary position
 */
export const DashboardTopHeader: React.FC<DashboardTopHeaderProps> = ({
  onNotificationPress,
}) => {
  const { theme, themeContext } = useAppTheme()
  const { colors } = theme
  const isDark = themeContext === "dark"
  const { user, driverProfile } = useAuth()
  const { activeCoDriver } = useCoDriver()
  const { criticalViolations, highPriorityViolations } = useViolationNotifications()

  // Fetch notifications for badge counts
  const { data: notificationsData } = useNotifications({
    status: "unread",
    limit: 50,
    enabled: true,
    refetchInterval: 60000,
  })

  // Get notification count
  const notificationCount = useMemo(() => {
    if (!notificationsData) return 0
    if ("results" in notificationsData && Array.isArray(notificationsData.results)) {
      return notificationsData.results.filter((n: any) => !n.is_read).length
    }
    if ("notifications" in notificationsData && Array.isArray((notificationsData as any).notifications)) {
      return (notificationsData as any).notifications.filter((n: any) => !n.is_read).length
    }
    return 0
  }, [notificationsData])

  // Get violation count
  const violationCount = useMemo(() => {
    return criticalViolations.length + highPriorityViolations.length
  }, [criticalViolations, highPriorityViolations])

  // Driver name
  const driverName = useMemo(() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return driverProfile?.name || translate("dashboard.driverName" as any) || "Driver"
  }, [user, driverProfile])

  // Driver initials for avatar
  const driverInitials = useMemo(() => {
    const name = driverName
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const initials = parts.map((part: string) => part.charAt(0).toUpperCase()).join("")
    return initials || "DR" // Default initials constant could be added if needed
  }, [driverName])

  // Co-driver name or message
  const coDriverDisplay = useMemo(() => {
    if (activeCoDriver) {
      return activeCoDriver.name
    }
    return translate("dashboard.askOrgForCoDriver" as any) || "Ask your organisation to add co-driver"
  }, [activeCoDriver])

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onNotificationPress) {
      onNotificationPress()
    } else {
      router.push("/notifications" as any)
    }
  }

  const handleViolationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/violations" as any)
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.cardBackground,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 20,
        },
        leftSection: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        },
        profileContainer: {
          marginRight: 12,
        },
        avatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.tint,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.border,
        },
        avatarText: {
          color: colors.buttonPrimaryText,
          fontSize: 20,
          fontWeight: "900",
        },
        driverInfo: {
          flex: 1,
        },
        driverName: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 4,
        },
        coDriverName: {
          color: colors.textDim,
          fontSize: 13,
          fontWeight: "500",
        },
        coDriverMessage: {
          color: colors.warning,
          fontSize: 12,
          fontWeight: "500",
          fontStyle: "italic",
        },
        rightSection: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        iconButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.sectionBackground,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderWidth: 1,
          borderColor: colors.border,
        },
        notificationBadge: {
          position: "absolute",
          top: 4,
          right: 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.error,
          borderWidth: 1,
          borderColor: colors.cardBackground,
        },
        violationBadge: {
          position: "absolute",
          top: -2,
          right: -2,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: colors.cardBackground,
        },
        badgeText: {
          color: colors.buttonPrimaryText,
          fontSize: 10,
          fontWeight: "700",
        },
        logoContainer: {
          marginRight: 12,
        },
        logo: {
          width: 120,
          height: 32,
          resizeMode: "contain",
        },
      }),
    [colors, isDark],
  )

  // Logo source based on theme
  const logoSource = useMemo(() => {
    return isDark
      ? require("assets/images/ttm-white-logo.png")
      : require("assets/images/ttm-logo.png")
  }, [isDark])

  return (
    <View style={styles.container}>
      {/* Left Section: Logo + Profile + Driver Info */}
      <View style={styles.leftSection}>
        {/* TTM Konnect Logo */}
        <View style={styles.logoContainer}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.profileContainer}>
          <View style={styles.avatar}>
            <RNText style={styles.avatarText}>{driverInitials}</RNText>
          </View>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{driverName}</Text>
          {activeCoDriver ? (
            <Text style={styles.coDriverName}>{coDriverDisplay}</Text>
          ) : (
            <Text style={styles.coDriverMessage}>{coDriverDisplay}</Text>
          )}
        </View>
      </View>

      {/* Right Section: All Icons - Language, Theme, Violations, DTC, Notifications */}
      <View style={styles.rightSection}>
        {/* Language Switcher */}
        <LanguageSwitcher compact />

        {/* Theme Switcher */}
        <ThemeSwitcher compact />

        {/* Violation Alert */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleViolationPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AlertTriangle
            size={20}
            color={violationCount > 0 ? colors.error : colors.textDim}
          />
          {violationCount > 0 && (
            <View style={styles.violationBadge}>
              <RNText style={styles.badgeText}>
                {violationCount > 9 ? "9+" : violationCount}
              </RNText>
            </View>
          )}
        </TouchableOpacity>

        {/* DTC Indicator */}
        <DtcIndicator />

        {/* Notifications Bell */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleNotificationPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={20} color={notificationCount > 0 ? colors.tint : colors.text} />
          {notificationCount > 0 && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>
    </View>
  )
}

