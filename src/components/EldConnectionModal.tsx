/**
 * ELD Connection Modal Component
 * Full-screen loading modal displayed during ELD device connection
 * Shows connection status and scrolling marquee with HOS/ELD compliance messages
 */

import React from 'react'
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import { useAppTheme } from '@/theme/context'
import { Text } from './Text'
import { MarqueeText } from './MarqueeText'
import { translate } from '@/i18n/translate'

export interface EldConnectionModalProps {
  visible: boolean
  status?: 'connecting' | 'establishing' | 'authenticating'
  messages?: string[]
}

export const EldConnectionModal: React.FC<EldConnectionModalProps> = ({
  visible,
  status = 'connecting',
  messages = [],
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Get status text based on current status
  const getStatusText = () => {
    switch (status) {
      case 'establishing':
        return translate('deviceScan.connectionModal.establishingConnection' as any)
      case 'authenticating':
        return translate('deviceScan.connectionModal.authenticating' as any)
      default:
        return translate('deviceScan.connectionModal.connecting' as any)
    }
  }

  // Use provided messages or fallback to default
  const marqueeMessages =
    messages.length > 0
      ? messages
      : [
          translate('deviceScan.connectionModal.marqueeMessages.0' as any),
          translate('deviceScan.connectionModal.marqueeMessages.1' as any),
          translate('deviceScan.connectionModal.marqueeMessages.2' as any),
          translate('deviceScan.connectionModal.marqueeMessages.3' as any),
          translate('deviceScan.connectionModal.marqueeMessages.4' as any),
          translate('deviceScan.connectionModal.marqueeMessages.5' as any),
        ]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Modal is not dismissible - do nothing
      }}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.75)' }]}>
        <View style={[styles.content, { backgroundColor: colors.surface || colors.background }]}>
          {/* Loading Spinner */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>

          {/* Status Text */}
          <Text style={[styles.statusText, { color: colors.text }]} weight="semiBold" size="lg">
            {getStatusText()}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textDim }]} size="sm" preset="formHelper">
            {translate('deviceScan.connectionModal.pleaseWait' as any)}
          </Text>

          {/* Marquee Container */}
          <View style={[styles.marqueeContainer, { backgroundColor: colors.sectionBackground || colors.background }]}>
            <MarqueeText
              messages={marqueeMessages}
              speed={20000}
              style={styles.marquee}
              textStyle={{ color: colors.textDim }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  statusText: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  marqueeContainer: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  marquee: {
    height: 40,
  },
})


