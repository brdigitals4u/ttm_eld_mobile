import React, { useCallback } from "react"
import { TouchableOpacity, StyleSheet, View, Text } from "react-native"
import { useRouter } from "expo-router"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { showFreshchatConversations } from "@/services/freshchat"

import { useChatSupport } from "../contexts/ChatSupportContext"

interface ChatSupportButtonProps {
  variant?: "icon" | "button" | "fab"
  size?: "small" | "medium" | "large"
  label?: string
  userId?: string
  userName?: string
  userEmail?: string
  customAttributes?: Record<string, any>
}

/**
 * Chat Support Button Component
 * Can be used in header, tab bar, or as FAB
 */
export const ChatSupportButton: React.FC<ChatSupportButtonProps> = ({
  variant = "icon",
  size = "medium",
  label = "Support",
  userId,
  userName,
  userEmail,
  customAttributes,
}) => {
  const router = useRouter()
  const chatSupport = useChatSupport()

  const handlePress = useCallback(() => {
    if (userId) {
      chatSupport.setUser({
        identifier: userId,
        name: userName,
        email: userEmail,
        customAttributes,
      })
    }

    const opened = showFreshchatConversations()
    if (!opened) {
      router.push("/chat-support")
    }
  }, [router, userId, userName, userEmail, customAttributes, chatSupport])

  // Size configurations
  const sizeConfig = {
    small: { iconSize: 20, padding: 8 },
    medium: { iconSize: 24, padding: 12 },
    large: { iconSize: 32, padding: 16 },
  }

  const config = sizeConfig[size]

  // Icon variant (for header or tab bar)
  if (variant === "icon") {
    return (
      <TouchableOpacity
        style={[styles.iconButton, { padding: config.padding }]}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="chat-outline" size={config.iconSize} color="#4338CA" />
          {chatSupport.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {chatSupport.unreadCount > 9 ? "9+" : chatSupport.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Button variant (for normal buttons)
  if (variant === "button") {
    return (
      <TouchableOpacity
        style={[styles.button, { paddingVertical: config.padding }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chat-outline"
          size={config.iconSize}
          color="#fff"
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>{label}</Text>
        {chatSupport.unreadCount > 0 && (
          <View style={styles.buttonBadge}>
            <Text style={styles.badgeText}>
              {chatSupport.unreadCount > 9 ? "9+" : chatSupport.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // FAB variant (floating action button)
  return (
    <TouchableOpacity
      style={[styles.fab, { width: 56 + config.padding, height: 56 + config.padding }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.fabContent}>
        <MaterialCommunityIcons name="chat-outline" size={config.iconSize} color="#fff" />
        {chatSupport.unreadCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.badgeText}>
              {chatSupport.unreadCount > 9 ? "9+" : chatSupport.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -5,
    top: -5,
    width: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#4338CA",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonBadge: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    marginLeft: 8,
    width: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    alignItems: "center",
    backgroundColor: "#4338CA",
    borderRadius: 28,
    bottom: 16,
    elevation: 5,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  fabBadge: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -5,
    top: -5,
    width: 20,
  },
  fabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
  },
})

export default ChatSupportButton
