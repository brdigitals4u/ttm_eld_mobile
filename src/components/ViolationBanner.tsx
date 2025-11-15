/**
 * Violation Banner Component
 * 
 * Dismissible banner for high priority violations.
 * Auto-dismisses after 10 seconds.
 */

import React, { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native'
import { AlertCircle, X } from 'lucide-react-native'
import { router } from 'expo-router'
import { useViolationNotifications, ActiveViolation } from '@/contexts/ViolationNotificationContext'

interface ViolationBannerProps {
  violation: ActiveViolation
  onDismiss?: () => void
}

const AUTO_DISMISS_DELAY = 10000 // 10 seconds

export const ViolationBanner: React.FC<ViolationBannerProps> = ({ violation, onDismiss }) => {
  const { removeViolation } = useViolationNotifications()
  const [isVisible, setIsVisible] = useState(true)
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Auto-dismiss after delay
    const timer = setTimeout(() => {
      handleDismiss()
    }, AUTO_DISMISS_DELAY)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false)
      if (onDismiss) {
        onDismiss()
      }
    })
  }

  const handleViewDetails = () => {
    handleDismiss()
    router.push('/violations' as any)
  }

  if (!isVisible || !violation) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertCircle size={24} color="#FFFFFF" strokeWidth={2.5} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {violation.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {violation.message}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F97316', // Orange
    paddingTop: 50, // Account for status bar
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

