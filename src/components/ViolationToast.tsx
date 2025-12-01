/**
 * Violation Toast Component
 *
 * Toast notification for medium priority violations.
 * Auto-dismisses after 5 seconds.
 */

import React, { useEffect, useState, useRef, useCallback } from "react"
import { View, StyleSheet, Text, Animated } from "react-native"
import { AlertCircle } from "lucide-react-native"

import { useViolationNotifications, ActiveViolation } from "@/contexts/ViolationNotificationContext"

interface ViolationToastProps {
  violation: ActiveViolation
  onDismiss?: () => void
}

const AUTO_DISMISS_DELAY = 5000 // 5 seconds

export const ViolationToast: React.FC<ViolationToastProps> = ({ violation, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(-100)).current

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false)
      if (onDismiss) {
        onDismiss()
      }
    })
  }, [fadeAnim, slideAnim, onDismiss])

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto-dismiss after delay
    const timer = setTimeout(() => {
      handleDismiss()
    }, AUTO_DISMISS_DELAY)

    return () => clearTimeout(timer)
  }, [fadeAnim, slideAnim, handleDismiss])

  if (!isVisible || !violation) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {violation.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {violation.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "#EAB308", // Yellow
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  message: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
})
