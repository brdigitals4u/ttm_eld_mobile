import React from "react"
import { View, StyleSheet } from "react-native"
import Svg, {
  Circle,
  Rect,
  Path,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text,
} from "react-native-svg"

interface TTMKonnectLogoProps {
  size?: number
  showText?: boolean
  style?: any
}

export default function TTMKonnectLogo({
  size = 100,
  showText = false,
  style,
}: TTMKonnectLogoProps) {
  const scale = size / 200 // Original SVG is 200x200

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="indigoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#a7d4f8" stopOpacity={1} />
            <Stop offset="50%" stopColor="#0071ce" stopOpacity={1} />
            <Stop offset="100%" stopColor="#078bf7" stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="indigoLightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0071ce" stopOpacity={1} />
            <Stop offset="100%" stopColor="#078bf7" stopOpacity={1} />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle cx={100} cy={100} r={90} fill="url(#indigoGradient)" />

        {/* Trident Design */}
        <G fill="white" opacity={0.95}>
          {/* Center vertical shaft */}
          <Rect x={95} y={60} width={10} height={80} rx={5} />

          {/* Top horizontal bar */}
          <Rect x={70} y={60} width={60} height={8} rx={4} />

          {/* Left prong */}
          <Rect x={70} y={60} width={8} height={35} rx={4} />
          <Rect x={70} y={88} width={20} height={8} rx={4} />

          {/* Right prong */}
          <Rect x={122} y={60} width={8} height={35} rx={4} />
          <Rect x={110} y={88} width={20} height={8} rx={4} />

          {/* Bottom handle */}
          <Rect x={90} y={130} width={20} height={30} rx={10} />

          {/* Decorative elements */}
          <Circle cx={100} cy={145} r={3} fill="url(#indigoLightGradient)" />
          <Circle cx={100} cy={155} r={2} fill="url(#indigoLightGradient)" />
        </G>

        {/* TTM Text - only show if explicitly requested */}
        {showText && (
          <Text
            x={100}
            y={185}
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill="white"
            opacity={0.8}
          >
            TTM
          </Text>
        )}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
})
