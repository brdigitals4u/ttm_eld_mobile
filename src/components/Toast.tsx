import React, { useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { useAppTheme } from '@/theme/context'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

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
  
  // Use react-native-reanimated values
  const translateY = useSharedValue(position === 'top' ? -100 : 100)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    }
  })

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

  const getIcon = () => {
    const iconColor = getToastColors().icon
    const iconSize = 24
    
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color={iconColor} />
      case 'warning':
        return <AlertTriangle size={iconSize} color={iconColor} />
      case 'error':
        return <AlertCircle size={iconSize} color={iconColor} />
      case 'info':
        return <Info size={iconSize} color={iconColor} />
      default:
        return <Info size={iconSize} color={iconColor} />
    }
  }

  const colors = getToastColors()

  useEffect(() => {
    if (visible) {
      // Show animation with scale and bounce effect
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
      scale.value = withSequence(
        withTiming(1.1, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 150,
          easing: Easing.in(Easing.cubic),
        })
      )

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
    translateY.value = withTiming(position === 'top' ? -100 : 100, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    })
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    })
    scale.value = withTiming(0.8, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    }, () => {
      runOnJS(onDismiss)()
    })
  }

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: 50,
        },
        animatedStyle,
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
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>
            <Text
              variant="bodyMedium"
              style={[styles.message, { color: colors.text }]}
            >
              {message}
            </Text>
          </View>
          <TouchableOpacity
            onPress={hideToast}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.icon} />
          </TouchableOpacity>
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
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  closeButton: {
    margin: 0,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
