import { useMemo } from "react"
import { Pressable, StyleSheet, StatusBar, View, ViewStyle, TextStyle } from "react-native"
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui"
import { SafeAreaView, useSafeAreaInsets, Edge } from "react-native-safe-area-context"

import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useLanguage } from "@/hooks/useLanguage"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

interface CustomTabButtonProps {
  isFocused: boolean
  icon: string
  label: string
  colors: any
  isDark: boolean
  styles: {
    tabItem: ViewStyle
    tabActive: ViewStyle
    label: TextStyle
    labelActive: TextStyle
  }
}

interface Styles {
  safeArea: ViewStyle
  tabContentContainer: ViewStyle
  tabBarContainer: ViewStyle
  tabItem: ViewStyle
  tabActive: ViewStyle
  label: TextStyle
  labelActive: TextStyle
}

const TAB_CONFIG = [
  { name: "dashboard", href: "/dashboard", icon: "menu", labelKey: "tabs.home" },
  { name: "fuel", href: "/fuel", icon: "bell", labelKey: "tabs.fuel" },
  { name: "logs", href: "/logs", icon: "view", labelKey: "tabs.logs" },
  { name: "profile", href: "/profile", icon: "user", labelKey: "tabs.profile" },
] as const

const LAYOUT_CONSTANTS = {
  PADDING: 8,
  ICON_SIZE: 22,
  LABEL_SIZE: 12,
  LABEL_MARGIN_TOP: 4,
  TAB_PADDING_VERTICAL: 14,
  TAB_BORDER_RADIUS: 24,
  TAB_MARGIN_HORIZONTAL: 4,
  OPACITY_INACTIVE: "80", // 50% opacity
} as const

function CustomTabButton({ 
  isFocused, 
  icon, 
  label, 
  colors, 
  isDark, 
  styles: tabStyles, 
  ...props 
}: CustomTabButtonProps) {
  // Dark theme: dark background, active uses primary color (tint), inactive uses dim text
  // Light theme: light background, active uses primary color (tint), inactive uses dim text
  const iconColor = isFocused ? colors.tint : colors.textDim
  const labelColor = isFocused ? colors.tint : colors.textDim

  return (
    <Pressable 
      {...props} 
      style={[tabStyles.tabItem, isFocused && tabStyles.tabActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Icon icon={icon} size={LAYOUT_CONSTANTS.ICON_SIZE} color={iconColor} />
      <Text style={[tabStyles.label, { color: labelColor }, isFocused && tabStyles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function Layout() {
  useLanguage()
  const { theme, themeContext } = useAppTheme()
  const { colors } = theme
  const isDark = themeContext === "dark"
  const insets = useSafeAreaInsets()

  const tabBarHeight = useMemo(() => {
    return (
      LAYOUT_CONSTANTS.PADDING +
      LAYOUT_CONSTANTS.ICON_SIZE +
      LAYOUT_CONSTANTS.LABEL_SIZE +
      LAYOUT_CONSTANTS.LABEL_MARGIN_TOP +
      LAYOUT_CONSTANTS.TAB_PADDING_VERTICAL * 2 +
      LAYOUT_CONSTANTS.PADDING +
      insets.bottom
    )
  }, [insets.bottom])

  const styles = useMemo<Styles>(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.background,
        },
        tabContentContainer: {
          flex: 1,
          paddingBottom: tabBarHeight,
        },
        tabBarContainer: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: isDark ? colors.sectionBackground : colors.background,
          padding: LAYOUT_CONSTANTS.PADDING,
          paddingBottom: insets.bottom + LAYOUT_CONSTANTS.PADDING,
          elevation: 0,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        tabItem: {
          flex: 1,
          alignItems: "center",
          backgroundColor: "transparent",
          borderRadius: LAYOUT_CONSTANTS.TAB_BORDER_RADIUS,
          paddingVertical: LAYOUT_CONSTANTS.TAB_PADDING_VERTICAL,
          marginHorizontal: LAYOUT_CONSTANTS.TAB_MARGIN_HORIZONTAL,
        },
        tabActive: {
          backgroundColor: isDark ? colors.cardBackground : colors.white,
        },
        label: {
          fontSize: LAYOUT_CONSTANTS.LABEL_SIZE,
          marginTop: LAYOUT_CONSTANTS.LABEL_MARGIN_TOP,
        },
        labelActive: {
          fontWeight: "500",
        },
      }),
    [colors, insets.bottom, tabBarHeight, isDark],
  )

  const edges: Edge[] = ["top"]

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <StatusBar
        animated
        backgroundColor={colors.background}
        showHideTransition="fade"
        hidden={false}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <Tabs>
        <View style={styles.tabContentContainer}>
          <TabSlot />
        </View>
        <TabList style={styles.tabBarContainer}>
          {TAB_CONFIG.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <CustomTabButton
                icon={tab.icon}
                label={translate(tab.labelKey as any)}
                colors={colors}
                isDark={isDark}
                styles={styles}
              />
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
    </SafeAreaView>
  )
}