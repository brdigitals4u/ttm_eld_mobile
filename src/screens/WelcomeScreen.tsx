import React from "react"
import { View, StyleSheet, TouchableOpacity, Image } from "react-native"
import { router } from "expo-router"
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Circle,
} from "react-native-svg"

import { BetaBanner } from "@/components/BetaBanner"
import { SafeAreaContainer } from "@/components/SafeAreaContainer"
import { Text } from "@/components/Text"
import { COLORS } from "@/constants/colors"
import { translate } from "@/i18n/translate"
import { shadows } from "@/theme/shadows"
import { settingsStorage } from "@/utils/storage"

export const WelcomeScreen: React.FC = () => {
  const handleNext = async () => {
    await settingsStorage.setHasSeenWelcome(true)
    // Navigate to login screen after setting the flag
    router.replace("/login")
  }

  const handleSkip = async () => {
    await goToPermissions()
  }

  /** ======= VIOLET BACKGROUND ======= **/
  const VioletBackground = () => (
    <Svg width="100%" height="100%" viewBox="0 0 400 800" style={StyleSheet.absoluteFillObject}>
      <Defs>
        <SvgLinearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="20%" stopColor="#3A7BFF" />
          <Stop offset="100%" stopColor="#0000FE" />
        </SvgLinearGradient>
      </Defs>

      {/* violet gradient background */}
      <Rect x="0" y="0" width="400" height="800" fill="url(#violetGrad)" />

      {/* transparent circles */}
      <Circle cx="80" cy="100" r="120" fill="#FFFFFF" opacity={0.08} />
      <Circle cx="320" cy="350" r="150" fill="#FFFFFF" opacity={0.06} />
    </Svg>
  )

  return (
    <View style={styles.container}>
      {/* Background */}
      <VioletBackground />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>TTM247</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Image placeholder - replace with your truck/logistics image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            {/* You can add your own image here */}
            <Image
              source={require("assets/images/login_header.png")}
              style={styles.loginHeaderImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Bottom Card */}

      <View style={styles.bottomCard}>
        <Text style={styles.title}>{translate("welcome.subtitle" as any)}</Text>
        <Text style={styles.subtitle}>{translate("welcome.description" as any)}</Text>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{translate("welcome.next" as any)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.violet,
    flex: 1,
  },

  /* Header */
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    zIndex: 10,
  },
  brandText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  skipText: {
    color: COLORS.white,
    fontSize: 16,
    opacity: 0.9,
  },

  /* Content */
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: 20,
    height: 280,
    justifyContent: "center",
    width: 380,
  },
  placeholderText: {
    fontSize: 120,
  },

  /* Bottom Card */
  bottomCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    elevation: 8,
    paddingBottom: 48,
    paddingHorizontal: 32,
    paddingTop: 40,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  title: {
    color: COLORS.ink700,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.ink500,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: COLORS.indigo,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    ...shadows.medium,
    shadowColor: COLORS.indigo,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  loginHeaderImage: {
    height: 100,
    marginBottom: 24,
    width: "100%",
  },
})
