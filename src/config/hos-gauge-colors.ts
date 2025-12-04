/**
 * HOS Gauge Color Configurations
 * 
 * Brand-aligned color configurations for 4 HOS gauges:
 * - Driving: Primary → Warning → Error (most urgent)
 * - Until Break: Blue tints (informational)
 * - Shift Remaining: Blue → Teal (supportive)
 * - Cycle Remaining: Desaturated blues (low priority)
 */

export type GaugeType = "driving" | "untilBreak" | "shiftRemaining" | "cycleRemaining"
export type ThemeMode = "light" | "dark"

export interface GaugeColorConfig {
  colors: string[]
  emptyColor: string
}

export interface HOSGaugeColors {
  light: {
    driving: GaugeColorConfig
    untilBreak: GaugeColorConfig
    shiftRemaining: GaugeColorConfig
    cycleRemaining: GaugeColorConfig
  }
  dark: {
    driving: GaugeColorConfig
    untilBreak: GaugeColorConfig
    shiftRemaining: GaugeColorConfig
    cycleRemaining: GaugeColorConfig
  }
}

export const HOS_GAUGE_COLORS: HOSGaugeColors = {
  light: {
    driving: {
      colors: ["#007CE1", "#FFA726", "#E65100", "#C62828"],
      emptyColor: "#E5E7EB",
    },
    untilBreak: {
      colors: ["#B3E5FC", "#80C9FF", "#4DB6AC", "#007CE1"],
      emptyColor: "#E5E7EB",
    },
    shiftRemaining: {
      colors: ["#80DEEA", "#4DD0E1", "#26C6DA", "#00BCD4"],
      emptyColor: "#E5E7EB",
    },
    cycleRemaining: {
      colors: ["#B0BEC5", "#90A4AE", "#78909C", "#607D8B"],
      emptyColor: "#E5E7EB",
    },
  },
  dark: {
    driving: {
      colors: ["#007CE1", "#FF8A50", "#FF6B00", "#D84315"],
      emptyColor: "#2C2F30",
    },
    untilBreak: {
      colors: ["#4A90E2", "#5BA3F5", "#007CE1", "#0056B3"],
      emptyColor: "#2C2F30",
    },
    shiftRemaining: {
      colors: ["#4DB6AC", "#26A69A", "#00897B", "#00695C"],
      emptyColor: "#2C2F30",
    },
    cycleRemaining: {
      colors: ["#546E7A", "#455A64", "#37474F", "#263238"],
      emptyColor: "#2C2F30",
    },
  },
}

/**
 * Get gauge color configuration based on theme and gauge type
 */
export function getGaugeColors(
  theme: ThemeMode,
  gaugeType: GaugeType,
): GaugeColorConfig {
  return HOS_GAUGE_COLORS[theme][gaugeType]
}







