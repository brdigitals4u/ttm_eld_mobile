import React, { useRef, useEffect, useState } from "react"
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, View } from "react-native"
import { Text } from "@/components/Text"
import LottieView from "lottie-react-native"

interface AnimatedButtonProps {
  title: string
  onPress: () => Promise<void> | void
  onSuccess?: () => void
  loadingAnimation: any
  successAnimation: any
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  successDuration?: number
}

type ButtonState = "idle" | "loading" | "success"

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  onSuccess,
  loadingAnimation,
  successAnimation,
  disabled = false,
  style,
  textStyle,
  successDuration = 1500,
}) => {
  const [state, setState] = useState<ButtonState>("idle")
  const loadingRef = useRef<LottieView>(null)
  const successRef = useRef<LottieView>(null)

  useEffect(() => {
    if (state === "loading") {
      loadingRef.current?.play()
    } else if (state === "success") {
      successRef.current?.play()

      // Show success animation, then reset and call onSuccess
      const timer = setTimeout(() => {
        setState("idle")
        onSuccess?.()
      }, successDuration)

      return () => clearTimeout(timer)
    }
  }, [state, successDuration, onSuccess])

  const handlePress = async () => {
    if (state !== "idle" || disabled) return

    setState("loading")

    try {
      await onPress()
      setState("success")
    } catch (error) {
      // On error, go back to idle state
      setState("idle")
      throw error
    }
  }

  const isDisabled = disabled || state !== "idle"

  if (state === "success") {
    return (
      <View style={styles.buttonSuccess}>
        <LottieView
          ref={successRef}
          source={successAnimation}
          style={styles.animation}
          loop={false}
        />
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.button, style, isDisabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {state === "idle" && <Text style={[styles.buttonText, textStyle]}>{title}</Text>}

      {state === "loading" && (
        <LottieView
          ref={loadingRef}
          source={loadingAnimation}
          style={styles.animation}
          loop={true}
        />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  buttonSuccess: {
     backgroundColor: "#fff",
    borderRadius: 16,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    backgroundColor: "#5750F1",
    borderRadius: 16,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5750F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  animation: {
    width: 150,
    height: 150,
  },
})
