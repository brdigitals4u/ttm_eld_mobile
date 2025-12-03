import React, { useState, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native"
import { Check, Moon, Sun } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { useAppStore } from "@/stores/appStore"
import { useAppTheme } from "@/theme/context"
import { translate } from "@/i18n/translate"
import { THEME_OPTIONS } from "@/constants/dashboard"

const themes = [
  { code: "light", nameKey: "settings.themes.lightMode", icon: Sun },
  { code: "dark", nameKey: "settings.themes.darkMode", icon: Moon },
]

interface ThemeSwitcherProps {
  onClose?: () => void
  compact?: boolean // For header icon button
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onClose, compact = false }) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const [isOpen, setIsOpen] = useState(false)
  const { theme: currentTheme, setTheme, triggerThemeTransition } = useAppStore()

  const handleThemeChange = async (themeCode: "light" | "dark") => {
    try {
      // Trigger overlay before theme change
      triggerThemeTransition(true)

      // Update theme in store (this will trigger ThemeProvider update)
      setTheme(themeCode)

      // ThemeProvider will read from appStore automatically

      // Wait for overlay animation
      setTimeout(() => {
        triggerThemeTransition(false)
        setIsOpen(false)
        onClose?.()
        toast.success(translate("settings.themeChanged" as any) || "Theme changed")
      }, 200)
    } catch (error) {
      triggerThemeTransition(false)
      console.error("Failed to change theme:", error)
      toast.error(translate("settings.themeChangeFailed" as any) || "Failed to change theme")
    }
  }

  const currentThemeObj = themes.find((t) => t.code === currentTheme) || themes[1] // Default to dark
  const IconComponent = currentThemeObj.icon
  const currentThemeName = translate(currentThemeObj.nameKey as any) || currentThemeObj.nameKey.replace("settings.themes.", "")

  // Compact mode for header icon button
  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[styles.compactButton, { backgroundColor: colors.sectionBackground }]}
          onPress={() => setIsOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconComponent size={20} color={colors.text} />
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsOpen(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {translate("settings.selectTheme" as any) || "Select Theme"}
                </Text>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                  <Text style={[styles.closeButtonText, { color: colors.tint }]}>
                    {translate("common.close" as any) || "Close"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.themeList}>
                {themes.map((themeOption) => {
                  const isSelected = currentTheme === themeOption.code
                  const ThemeIcon = themeOption.icon
                  return (
                    <TouchableOpacity
                      key={themeOption.code}
                      style={[
                        styles.themeItem,
                        {
                          backgroundColor: isSelected ? `${colors.tint}10` : colors.surface,
                          borderColor: isSelected ? colors.tint : colors.border,
                        },
                      ]}
                      onPress={() => handleThemeChange(themeOption.code as "light" | "dark")}
                    >
                      <View style={styles.themeContent}>
                        <View style={[styles.themeIconContainer, { backgroundColor: `${colors.tint}15` }]}>
                          <ThemeIcon size={24} color={colors.tint} />
                        </View>
                        <View style={styles.themeTextContainer}>
                          <Text style={[styles.themeName, { color: colors.text }]}>
                            {translate(themeOption.nameKey as any) || themeOption.nameKey}
                          </Text>
                        </View>
                      </View>
                      {isSelected && <Check size={20} color={colors.tint} />}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    )
  }

  // Full card mode (for settings screen)
  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.tint}15` }]}>
            <IconComponent size={20} color={colors.tint} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {translate("settings.theme" as any) || "Theme"}
            </Text>
            <Text style={[styles.value, { color: colors.textDim }]}>
              {currentThemeName}
            </Text>
          </View>
        </View>
        <Text style={[styles.chevron, { color: colors.textDim }]}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {translate("settings.selectTheme" as any) || "Select Theme"}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.tint }]}>
                  {translate("common.close" as any) || "Close"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.themeList}>
              {themes.map((themeOption) => {
                const isSelected = currentTheme === themeOption.code
                const ThemeIcon = themeOption.icon
                return (
                  <TouchableOpacity
                    key={themeOption.code}
                    style={[
                      styles.themeItem,
                      {
                        backgroundColor: isSelected ? `${colors.tint}10` : colors.surface,
                        borderColor: isSelected ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => handleThemeChange(themeOption.code as "light" | "dark")}
                  >
                    <View style={styles.themeContent}>
                      <View style={[styles.themeIconContainer, { backgroundColor: `${colors.tint}15` }]}>
                        <ThemeIcon size={24} color={colors.tint} />
                      </View>
                      <View style={styles.themeTextContainer}>
                        <Text style={[styles.themeName, { color: colors.text }]}>
                          {translate(themeOption.nameKey as any) || themeOption.nameKey}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={20} color={colors.tint} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  chevron: {
    fontSize: 24,
    fontWeight: "300",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  compactButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  container: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    padding: 16,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
  },
  themeContent: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  themeIconContainer: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  themeItem: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 16,
  },
  themeList: {
    padding: 16,
  },
  themeName: {
    fontSize: 16,
    fontWeight: "600",
  },
  themeTextContainer: {
    flex: 1,
  },
  value: {
    fontSize: 14,
  },
})

