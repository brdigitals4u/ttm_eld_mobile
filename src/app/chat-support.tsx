import { useCallback, useMemo, useState } from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useChatSupport } from "@/contexts/ChatSupportContext"
import { translate } from "@/i18n/translate"
import { showFreshchatConversations } from "@/services/freshchat"
import { useAppTheme } from "@/theme/context"

const ChatSupportScreen = () => {
  const { theme } = useAppTheme()
  const colors = theme.colors
  const { setIsLoading } = useChatSupport()
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const buttonStyle = useMemo(
    () => ({
      backgroundColor: colors.tint,
      opacity: isLaunching ? 0.7 : 1,
    }),
    [colors.tint, isLaunching],
  )

  const openChat = useCallback(() => {
    setLaunchError(null)
    setIsLaunching(true)
    setIsLoading(true)

    const opened = showFreshchatConversations()
    if (!opened) {
      setLaunchError(
        translate("support.chatUnavailable" as any) ||
          "Freshchat is unavailable. Check configuration.",
      )
    }

    setIsLoading(false)
    setIsLaunching(false)
  }, [setIsLoading])

  useFocusEffect(
    useCallback(() => {
      openChat()
    }, [openChat]),
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {translate("support.chatSupport" as any) || "Chat Support"}
        </Text>
        <Text style={[styles.description, { color: colors.textDim }]}>
          {translate("support.chatDescription" as any) ||
            "Need help? Connect with our support team through Freshchat."}
        </Text>
        <TouchableOpacity
          style={[styles.button, buttonStyle]}
          disabled={isLaunching}
          onPress={openChat}
          activeOpacity={0.9}
        >
          <Text style={[styles.buttonText, { color: colors.buttonPrimaryText }]}>
            {isLaunching
              ? translate("support.chatOpening" as any) || "Opening chat..."
              : translate("support.chatCta" as any) || "Open chat"}
          </Text>
        </TouchableOpacity>
        {launchError && (
          <Text style={[styles.errorText, { color: colors.error }]}>{launchError}</Text>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    minWidth: 220,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  container: { flex: 1 },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
})

export default ChatSupportScreen
