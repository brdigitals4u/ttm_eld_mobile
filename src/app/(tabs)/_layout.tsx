import { useMemo } from "react"
import { Pressable, StyleSheet, StatusBar, View } from "react-native"
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useLanguage } from "@/hooks/useLanguage"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"
import { COLORS } from "@/constants"

function CustomTabButton({ isFocused, icon, label, colors, styles: tabStyles, ...props }: any) {
  return (
    <Pressable {...props} style={[tabStyles.tabItem, isFocused && tabStyles.tabActive]}>
      <Icon icon={icon} size={22} color={isFocused ? COLORS.white : COLORS.primary} />
      <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>{label}</Text>
    </Pressable>
  )
}

export default function Layout() {
  // Use language hook to trigger re-render when language changes
  useLanguage()
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const insets = useSafeAreaInsets()

  // Calculate tab bar height: padding (8) + icon (22) + label (12 + 4 margin) + paddingVertical (14*2) + bottom padding
  const tabBarHeight = 8 + 22 + 12 + 4 + 14 * 2 + 8 + insets.bottom

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          color: colors.textDim,
          fontSize: 12,
          marginTop: 4,
        },
        labelActive: {
          color: COLORS.white,
          fontWeight: "500",
        },
        safeArea: {
          backgroundColor: colors.background,
          flex: 1,
        },
        tabActive: {
          backgroundColor: colors.cardBackground,
        },
        tabBarContainer: {
          backgroundColor: colors.sectionBackground,
          bottom: 0,
          elevation: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          left: 0,
          padding: 8,
          paddingBottom: insets.bottom + 8,
          position: "absolute",
          right: 0,
          shadowColor: colors.palette.neutral900,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        tabContentContainer: {
          flex: 1,
          paddingBottom: tabBarHeight,
        },
        tabItem: {
          alignItems: "center",
          backgroundColor: "transparent",
          borderRadius: 24,
          flex: 1,
          marginHorizontal: 4,
          paddingVertical: 14,
        },
      }),
    [colors, insets.bottom, tabBarHeight],
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        animated={true}
        backgroundColor={colors.background}
        showHideTransition="fade"
        hidden={false}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <Tabs>
        <View style={styles.tabContentContainer}>
          <TabSlot /> {/* Renders the selected screen */}
        </View>
        <TabList style={styles.tabBarContainer}>
          <TabTrigger name="dashboard" href="/dashboard" asChild>
            <CustomTabButton
              icon="menu"
              label={translate("tabs.home" as any)}
              colors={colors}
              styles={styles}
            />
          </TabTrigger>

          <TabTrigger name="fuel" href="/fuel" asChild>
            <CustomTabButton
              icon="bell"
              label={translate("tabs.fuel" as any)}
              colors={colors}
              styles={styles}
            />
          </TabTrigger>
          <TabTrigger name="logs" href="/logs" asChild>
            <CustomTabButton
              icon="view"
              label={translate("tabs.logs" as any)}
              colors={colors}
              styles={styles}
            />
          </TabTrigger>
          <TabTrigger name="support" href="/support" asChild>
            <CustomTabButton
              icon="bell"
              label={translate("tabs.support" as any)}
              colors={colors}
              styles={styles}
            />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <CustomTabButton
              icon="user"
              label={translate("tabs.profile" as any)}
              colors={colors}
              styles={styles}
            />
          </TabTrigger>
        </TabList>
      </Tabs>
    </SafeAreaView>
  )
}
