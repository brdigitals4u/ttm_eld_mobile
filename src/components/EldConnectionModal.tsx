/**
 * ELD Connection Modal Component
 * Full-screen loading modal displayed during ELD device connection
 * Shows connection status and scrolling marquee with HOS/ELD compliance messages
 */

import React from "react"
import { View, StyleSheet, Modal, ActivityIndicator } from "react-native"

import { translate } from "@/i18n/translate"
import { useAppTheme } from "@/theme/context"

import { MarqueeText } from "./MarqueeText"
import { Text } from "./Text"

export interface EldConnectionModalProps {
  visible: boolean
  status?: "connecting" | "establishing" | "authenticating"
  messages?: string[]
}

export const EldConnectionModal: React.FC<EldConnectionModalProps> = ({
  visible,
  status = "connecting",
  messages = [],
}) => {
  const { theme } = useAppTheme()
  const { colors, isDark } = theme

  // Get status text based on current status
  const getStatusText = () => {
    switch (status) {
      case "establishing":
        return translate("deviceScan.connectionModal.establishingConnection" as any)
      case "authenticating":
        return translate("deviceScan.connectionModal.authenticating" as any)
      default:
        return translate("deviceScan.connectionModal.connecting" as any)
    }
  }

  // Use provided messages or fallback to default
  const marqueeMessages =
    messages.length > 0
      ? messages
      : [
          translate("deviceScan.connectionModal.marqueeMessages.0" as any),
          translate("deviceScan.connectionModal.marqueeMessages.1" as any),
          translate("deviceScan.connectionModal.marqueeMessages.2" as any),
          translate("deviceScan.connectionModal.marqueeMessages.3" as any),
          translate("deviceScan.connectionModal.marqueeMessages.4" as any),
          translate("deviceScan.connectionModal.marqueeMessages.5" as any),
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
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.75)" },
        ]}
      >
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
            {translate("deviceScan.connectionModal.pleaseWait" as any)}
          </Text>

          {/* Marquee Container */}
          <View
            style={[
              styles.marqueeContainer,
              { backgroundColor: colors.sectionBackground || colors.background },
            ]}
          >
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
  content: {
    alignItems: "center",
    borderRadius: 24,
    elevation: 8,
    maxWidth: 500,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    width: "85%",
  },
  marquee: {
    height: 40,
  },
  marqueeContainer: {
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 12,
    width: "100%",
  },
  overlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  statusText: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: "center",
  },
})








