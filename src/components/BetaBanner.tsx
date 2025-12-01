/**
 * Beta Banner Component
 *
 * Orange banner indicating the app is in beta
 */

import React from "react"
import { View, StyleSheet } from "react-native"

import { colors } from "@/theme/colors"

import { Text } from "./Text"

export const BetaBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>BETA</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: "flex-start",
    backgroundColor: colors.warning,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
})
