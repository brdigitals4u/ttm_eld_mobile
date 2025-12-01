import React, { useState, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native"
import { Check, Globe } from "lucide-react-native"

import ElevatedCard from "@/components/EvevatedCard"
import { Text } from "@/components/Text"
import { toast } from "@/components/Toast"
import { useLanguage } from "@/hooks/useLanguage"
import { changeLanguage, getCurrentLanguage } from "@/i18n"
import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

// Only include languages that are actually imported and supported
const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
]

interface LanguageSwitcherProps {
  onClose?: () => void
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ onClose }) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme
  const [isOpen, setIsOpen] = useState(false)
  // Use hook to get current language and trigger re-renders
  const currentLangFromHook = useLanguage()
  const [currentLang, setCurrentLang] = useState(() => {
    const lang = getCurrentLanguage()
    // Extract primary tag if needed
    return lang.split("-")[0]
  })

  // Update local state when language changes from hook
  useEffect(() => {
    const primaryTag = currentLangFromHook.split("-")[0]
    setCurrentLang(primaryTag)
  }, [currentLangFromHook])

  const handleLanguageChange = async (languageCode: string) => {
    const success = await changeLanguage(languageCode)
    if (success) {
      // Update local state with primary tag
      const primaryTag = languageCode.split("-")[0]
      setCurrentLang(primaryTag)
      toast.success(translate("settings.languageChanged" as any))
      setIsOpen(false)
      onClose?.()
      // Trigger a re-render by forcing React to update
      // The i18next changeLanguage should trigger updates via react-i18next hooks
    } else {
      toast.error(translate("settings.languageChangeFailed" as any))
    }
  }

  const currentLanguage =
    languages.find((lang) => {
      const langPrimary = currentLang.split("-")[0]
      return langPrimary === lang.code
    }) || languages[0]

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.tint}15` }]}>
            <Globe size={20} color={colors.tint} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {translate("settings.language" as any)}
            </Text>
            <Text style={[styles.value, { color: colors.textDim }]}>
              {currentLanguage.nativeName}
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
                {translate("settings.selectLanguage" as any)}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.tint }]}>
                  {translate("common.close" as any)}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.languageList}>
              {languages.map((language) => {
                const isSelected = currentLang.startsWith(language.code)
                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageItem,
                      {
                        backgroundColor: isSelected ? `${colors.tint}10` : colors.surface,
                        borderColor: isSelected ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => handleLanguageChange(language.code)}
                  >
                    <View style={styles.languageContent}>
                      <Text style={[styles.languageName, { color: colors.text }]}>
                        {language.nativeName}
                      </Text>
                      <Text style={[styles.languageCode, { color: colors.textDim }]}>
                        {language.name}
                      </Text>
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
  languageCode: {
    fontSize: 14,
  },
  languageContent: {
    flex: 1,
  },
  languageItem: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 16,
  },
  languageList: {
    padding: 16,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
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
  value: {
    fontSize: 14,
  },
})
