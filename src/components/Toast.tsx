import React, { useEffect } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'
import { Card, Text, IconButton } from 'react-native-paper'
import { useAppTheme } from '@/theme/context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export interface ToastProps {
  visible: boolean
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
  onDismiss: () => void
  position?: 'top' | 'bottom'
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type,
  duration = 4000,
  onDismiss,
  position = 'top',
}) => {
  const { theme } = useAppTheme()
  const translateY = React.useRef(new Animated.Value(position === 'top' ? -100 : 100)).current
  const opacity = React.useRef(new Animated.Value(0)).current

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          background: theme.colors.palette.success100,
          border: theme.colors.palette.success500,
          text: theme.colors.palette.success900,
          icon: theme.colors.palette.success500,
        }
      case 'warning':
        return {
          background: theme.colors.palette.warning100,
          border: theme.colors.palette.warning500,
          text: theme.colors.palette.warning900,
          icon: theme.colors.palette.warning500,
        }
      case 'error':
        return {
          background: theme.colors.palette.angry100,
          border: theme.colors.palette.angry500,
          text: theme.colors.palette.neutral900,
          icon: theme.colors.palette.angry500,
        }
      case 'info':
        return {
            background: theme.colors.palette.neutral100,
            border: theme.colors.palette.neutral500,
            text: theme.colors.palette.neutral900,
            icon: theme.colors.palette.neutral500,
        }
      default:
        return {
          background: theme.colors.palette.neutral100,
          border: theme.colors.palette.neutral500,
          text: theme.colors.palette.neutral900,
          icon: theme.colors.palette.neutral500,
        }
    }
  }

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'check-circle'
      case 'warning':
        return 'alert-circle'
      case 'error':
        return 'close-circle'
      case 'info':
        return 'information'
      default:
        return 'information'
    }
  }

  const colors = getToastColors()

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto dismiss
      const timer = setTimeout(() => {
        hideToast()
      }, duration)

      return () => clearTimeout(timer)
    } else {
      hideToast()
      return undefined
    }
  }, [visible])

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss()
    })
  }

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: 50,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Card
        style={[
          styles.toast,
          {
            backgroundColor: colors.background,
            borderLeftColor: colors.border,
            borderLeftWidth: 4,
          },
        ]}
        elevation={3}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <Icon name={getIconName()} size={24} color={colors.icon} />
            <Text
              variant="bodyMedium"
              style={[styles.message, { color: colors.text }]}
            >
              {message}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={20}
            iconColor={colors.icon}
            onPress={hideToast}
            style={styles.closeButton}
          />
        </View>
      </Card>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
})

// Toast Manager for global usage
interface ToastState {
  visible: boolean
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
  position?: 'top' | 'bottom'
}

class ToastManager {
  private static instance: ToastManager
  private listeners: Array<(toast: ToastState) => void> = []
  private currentToast: ToastState | null = null

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager()
    }
    return ToastManager.instance
  }

  subscribe(listener: (toast: ToastState) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      if (this.currentToast) {
        listener(this.currentToast)
      }
    })
  }

  show(toast: Omit<ToastState, 'visible'>) {
    this.currentToast = {
      ...toast,
      visible: true,
    }
    this.notifyListeners()
  }

  hide() {
    if (this.currentToast) {
      this.currentToast.visible = false
      this.notifyListeners()
    }
  }

  success(message: string, duration?: number, position?: 'top' | 'bottom') {
    this.show({ message, type: 'success', duration, position })
  }

  warning(message: string, duration?: number, position?: 'top' | 'bottom') {
    this.show({ message, type: 'warning', duration, position })
  }

  error(message: string, duration?: number, position?: 'top' | 'bottom') {
    this.show({ message, type: 'error', duration, position })
  }

  info(message: string, duration?: number, position?: 'top' | 'bottom') {
    this.show({ message, type: 'info', duration, position })
  }
}

export const toast = ToastManager.getInstance()
