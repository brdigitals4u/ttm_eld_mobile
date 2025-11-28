import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChatSupport } from '../contexts/ChatSupportContext';
import { showFreshchatConversations } from '@/services/freshchat';

interface ChatSupportButtonProps {
  variant?: 'icon' | 'button' | 'fab';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  customAttributes?: Record<string, any>;
}

/**
 * Chat Support Button Component
 * Can be used in header, tab bar, or as FAB
 */
export const ChatSupportButton: React.FC<ChatSupportButtonProps> = ({
  variant = 'icon',
  size = 'medium',
  label = 'Support',
  userId,
  userName,
  userEmail,
  customAttributes,
}) => {
  const router = useRouter();
  const chatSupport = useChatSupport();

  const handlePress = useCallback(() => {
    if (userId) {
      chatSupport.setUser({
        identifier: userId,
        name: userName,
        email: userEmail,
        customAttributes,
      });
    }

    const opened = showFreshchatConversations();
    if (!opened) {
      router.push('/chat-support');
    }
  }, [router, userId, userName, userEmail, customAttributes, chatSupport]);

  // Size configurations
  const sizeConfig = {
    small: { iconSize: 20, padding: 8 },
    medium: { iconSize: 24, padding: 12 },
    large: { iconSize: 32, padding: 16 },
  };

  const config = sizeConfig[size];

  // Icon variant (for header or tab bar)
  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={[styles.iconButton, { padding: config.padding }]}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="chat-outline"
            size={config.iconSize}
            color="#4338CA"
          />
          {chatSupport.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {chatSupport.unreadCount > 9 ? '9+' : chatSupport.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Button variant (for normal buttons)
  if (variant === 'button') {
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
              {chatSupport.unreadCount > 9 ? '9+' : chatSupport.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // FAB variant (floating action button)
  return (
    <TouchableOpacity
      style={[styles.fab, { width: 56 + config.padding, height: 56 + config.padding }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.fabContent}>
        <MaterialCommunityIcons
          name="chat-outline"
          size={config.iconSize}
          color="#fff"
        />
        {chatSupport.unreadCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.badgeText}>
              {chatSupport.unreadCount > 9 ? '9+' : chatSupport.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4338CA',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 28,
    backgroundColor: '#4338CA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  fabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonBadge: {
    marginLeft: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ChatSupportButton;
