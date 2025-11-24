import React from 'react'
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Text } from '@/components/Text'
import { router } from 'expo-router'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Circle } from 'react-native-svg'
import { settingsStorage } from '@/utils/storage'
import { COLORS } from '@/constants/colors'
import { translate } from '@/i18n/translate'
import { BetaBanner } from '@/components/BetaBanner'
import { SafeAreaContainer } from '@/components/SafeAreaContainer'
import { shadows } from '@/theme/shadows'

export const WelcomeScreen: React.FC = () => {
  const handleNext = async () => {
    // Mark welcome screen as seen
    await settingsStorage.setHasSeenWelcome(true)
    // Navigate to login screen
    router.push('/login')
  }

  const handleSkip = async () => {
    // Mark welcome screen as seen
    await settingsStorage.setHasSeenWelcome(true)
    // Navigate to login screen
    router.push('/login')
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
                    source={require('assets/images/login_header.png')}
                    style={styles.loginHeaderImage}
                    resizeMode="contain"
                  />
          </View>
        </View>
      </View>

      {/* Bottom Card */}
      <SafeAreaContainer edges={['bottom']} bottomPadding={16}>
        <View style={styles.bottomCard}>
          <Text style={styles.title}>{translate("welcome.subtitle" as any)}</Text>
          <Text style={styles.subtitle}>
            {translate("welcome.description" as any)}
          </Text>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{translate("welcome.next" as any)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.violet,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    zIndex: 10,
  },
  brandText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },

  /* Content */
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    width: 380,
    height: 280,
    borderRadius: 20,
    backgroundColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 120,
  },

  /* Bottom Card */
  bottomCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 48,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.ink700,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.ink500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  nextButton: {
    backgroundColor: COLORS.indigo,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    shadowColor: COLORS.indigo,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginHeaderImage: {
    width: '100%',
    height: 100,
    marginBottom: 24,
  },
})