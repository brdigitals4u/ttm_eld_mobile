const palette = {
  neutral900: "#E8EFEA",
  neutral800: "#C7D4C8",
  neutral700: "#A5B8A4",
  neutral600: "#7E967D",
  neutral500: "#617A60",
  neutral400: "#475E46",
  neutral300: "#364A35",
  neutral200: "#283618",  // core dark green-brown foundation
  neutral100: "#121A10",

  primary600: "#7BBEFF",
  primary500: "#0071ce",   // brand blue
  primary400: "#0062B2",
  primary300: "#005091",
  primary200: "#003D6D",
  primary100: "#002A49",

  secondary500: "#4A506F",
  secondary400: "#3A3F59",
  secondary300: "#2E3346",
  secondary200: "#242837",
  secondary100: "#1A1D26",

  accent500: "#FFDFA6",
  accent400: "#F5C97A",
  accent300: "#EAB358",
  accent200: "#DA9932",
  accent100: "#C17F18",

  angry100: "#4B1E15",
  angry500: "#FF6B42",

  success900: "#1C3A22",
  success800: "#27512E",
  success700: "#2F6438",
  success600: "#3A7C46",
  success500: "#28A745",
  success400: "#1E7E34",
  success300: "#19652B",
  success200: "#145122",
  success100: "#0D3B18",

  warning900: "#3B2E05",
  warning800: "#5C4506",
  warning700: "#7A5A07",
  warning600: "#9A7108",
  warning500: "#FFC107",
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
  info200: "#10707F",
  info100: "#0C5460",

  overlay20: "rgba(10, 15, 10, 0.2)",
  overlay50: "rgba(10, 15, 10, 0.5)",
} as const

export const colors = {
  palette,
  PRIMARY: "#0071ce",
  transparent: "rgba(0, 0, 0, 0)",

  /**
   * Text colors
   */
  text: palette.neutral900,
  textDim: palette.neutral600,

  /**
   * Background layers
   */
  background: "#121A10",        // deep base
  surface: "#1A2416",           // elevated area
  cardBackground: "#1F2A1A",
  sectionBackground: "#253321",

  /**
   * Borders + separators
   */
  border: palette.neutral400,
  separator: palette.neutral300,

  /**
   * Tint & interactive states
   */
  tint: palette.primary500,
  tintInactive: palette.neutral500,

  /**
   * Error / success / info
   */
  error: palette.angry500,
  errorBackground: palette.angry100,

  success: palette.success500,
  successBackground: palette.success900,

  warning: palette.warning500,
  warningBackground: palette.warning900,

  info: palette.info500,
  infoBackground: palette.info900,

  /**
   * Buttons
   */
  buttonPrimary: palette.primary500,
  buttonPrimaryText: palette.neutral900,

  buttonSecondary: palette.neutral300,
  buttonSecondaryText: palette.neutral900,

  /**
   * Inputs
   */
  inputBackground: "#1A2416",
  inputBorder: palette.neutral500,
  inputBorderFocused: palette.primary500,
  inputBorderError: palette.angry500,
} as const
