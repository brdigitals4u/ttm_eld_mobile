import { useEffect, useRef, useMemo } from "react"
import { View, StyleSheet, Modal, TouchableOpacity, Animated } from "react-native"
import LottieView from "lottie-react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

const successAnimation = require("assets/animations/success.json")

interface LoginSuccessModalProps {
  visible: boolean
  onContinue: () => void
}

export const LoginSuccessModal: React.FC<LoginSuccessModalProps> = ({
  visible,
  onContinue,
}) => {
  const { theme } = useAppTheme()
  const { colors } = theme
  const lottieRef = useRef<LottieView>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      // Play Lottie animation
      lottieRef.current?.play()
    } else {
      fadeAnim.setValue(0)
      lottieRef.current?.reset()
    }
  }, [visible, fadeAnim])

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: {
          backgroundColor: `${colors.palette.neutral900}E6`,
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        modalContent: {
          alignItems: "center",
          backgroundColor: colors.background,
          borderRadius: 24,
          paddingHorizontal: 32,
          paddingTop: 48,
          paddingBottom: 32,
          width: "90%",
          maxWidth: 400,
        },
        animationContainer: {
          alignItems: "center",
          height: 200,
          justifyContent: "center",
          marginBottom: 24,
          width: 200,
        },
        animation: {
          height: 200,
          width: 200,
        },
        title: {
          color: colors.text,
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 12,
          textAlign: "center",
        },
        subtitle: {
          color: colors.textDim,
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 32,
          textAlign: "center",
        },
        continueButton: {
          alignItems: "center",
          backgroundColor: colors.buttonPrimary,
          borderRadius: 16,
          elevation: 4,
          justifyContent: "center",
          minHeight: 56,
          paddingHorizontal: 32,
          paddingVertical: 16,
          shadowColor: `${colors.tint}66`,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          width: "100%",
        },
        continueButtonText: {
          color: colors.buttonPrimaryText,
          fontSize: 18,
          fontWeight: "bold",
        },
      }),
    [colors],
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onContinue}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.modalContent}>
          <View style={styles.animationContainer}>
            <LottieView
              ref={lottieRef}
              source={successAnimation}
              style={styles.animation}
              loop={false}
              autoPlay={false}
            />
          </View>

          <Text style={styles.title}>You have logged in successfully</Text>
          <Text style={styles.subtitle}>
            Congratulations! You have successfully logged into your account.
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  )
}

