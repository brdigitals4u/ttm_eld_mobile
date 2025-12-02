const palette = {
  // Grayscale / neutrals (from screenshot)
  neutral100: "#FEFEFE",   // White
  neutral90:  "#FDFDFD",   // Grayscale 10
  neutral80:  "#ECF1F6",   // Grayscale 20
  neutral70:  "#E3E9ED",   // Grayscale 30
  neutral60:  "#D1D8DD",   // Grayscale 40
  neutral50:  "#BFC6CC",   // Grayscale 50
  neutral40:  "#9CA4AB",   // Grayscale 60
  neutral30:  "#78828A",   // Grayscale 70
  neutral20:  "#66707A",   // Grayscale 80
  neutral10:  "#434E58",   // Grayscale 90
  neutral0:   "#171725",   // Grayscale 100 / page deep

  // Main (you required these to stay as specified)
  primary600: "#7BBEFF",
  primary500: "#007CE1",   // MAIN PRIMARY (kept as requested)
  primary400: "#0066B8",
  primary300: "#005194",
  primary200: "#003A6B",
  primary100: "#002447",

  // Secondary: depends on primary (kept in primary family as requested)
  secondary500: "#007CE1",
  secondary400: "#1A86E6",
  secondary300: "#4DAFF6",
  secondary200: "#89D1FF",
  secondary100: "#DFF6FF",

  // Screenshot main swatches (visual reference colors)
  mainPrimaryScreenshot: "#6936FF", // (present in screenshot - kept as reference)
  mainSecondaryScreenshot: "#F56CFF",
  mainTertiaryScreenshot: "#F3C7F8",

  // Alerts (from screenshot)
  warning500: "#FACC15",    // Warning (yellow)
  success500: "#00C566",    // Success (green)
  error500:   "#FF6B00",    // ERROR = Bhagwa / saffron (your requested error)

  // Additional colors / lines (from screenshot)
  white: "#FEFEFE",
  line: "#E3E7EC",
  lineDark: "#282837",
  black: "#111111",

  // Accent / utility (pulled from screenshot palette & reasonable complements)
  accent500: "#FFDFA6",
  accent400: "#F5C97A",
  accent300: "#EAB358",
  accent200: "#DA9932",
  accent100: "#C17F18",

  // Info (screenshot uses teal-ish info)
  angry100: "#4B1E15",
  angry500: "#FF6B42",

  success900: "#1C3A22",
  success800: "#27512E",
  success700: "#2F6438",
  success600: "#3A7C46",
  success400: "#1E7E34",
  success300: "#19652B",
  success200: "#145122",
  success100: "#0D3B18",

  warning900: "#3B2E05",
  warning800: "#5C4506",
  warning700: "#7A5A07",
  warning600: "#9A7108",
  warning400: "#FFB300",
  warning300: "#FFA000",
  warning200: "#FF8F00",
  warning100: "#705306",

  info900: "#12323A",
  info800: "#16414B",
  info700: "#1A5260",
  info600: "#1F6373",
  info500: "#17A2B8",
  info400: "#138496",
  info300: "#117A8B",

  // Overlays
  overlay20: "rgba(10, 15, 10, 0.2)",
  overlay50: "rgba(10, 15, 10, 0.5)",
} as const

export const colors = {
  palette,

  // explicit project-level constants
  PRIMARY: palette.primary500, // #007CE1 (as requested)
  SECONDARY: palette.secondary500,

  transparent: "rgba(0,0,0,0)",

  /**
   * Text
   */
  text: palette.neutral0 === undefined ? "#171725" : palette.neutral100, // white text on dark background
  textDim: palette.neutral40,

  /**
   * Background layers (match screenshot dark theme)
   */
  background: "#171725",        // deep background (grayscale 100 in screenshot)
  surface: "#1F1B26",           // subtle elevated surface
  cardBackground: "#22202A",
  sectionBackground: "#1A1820",

  /**
   * Borders + separators
   */
  border: palette.line,
  separator: palette.lineDark,

  /**
   * Tint & interactive states
   */
  tint: palette.primary500,
  tintInactive: palette.neutral50,

  /**
   * Error / success / info
   */
  error: palette.error500,
  errorBackground: "#FFF2E6", // light saffron background for error surfaces

  success: palette.success500,
  successBackground: "#E8FFF1",

  warning: palette.warning500,
  warningBackground: "#FFF9E0",

  info: palette.info500,
  infoBackground: "#EAF7F9",

  /**
   * Buttons
   */
  buttonPrimary: palette.primary500,
  buttonPrimaryText: palette.neutral100,

  buttonSecondary: palette.neutral50,
  buttonSecondaryText: palette.neutral100,

  /**
   * Inputs
   */
  inputBackground: "#1F1B26",
  inputBorder: palette.lineDark,
  inputBorderFocused: palette.primary500,
  inputBorderError: palette.error500,
} as const
