const palette = {
  neutral900: "#FFFFFF",
  neutral800: "#F4F2F1",
  neutral700: "#D7CEC9",
  neutral600: "#B6ACA6",
  neutral500: "#978F8A",
  neutral400: "#564E4A",
  neutral300: "#3C3836",
  neutral200: "#191015",
  neutral100: "#000000",

  primary600: "#F4E0D9",
  primary500: "#0071ce", // Main brand blue
  primary400: "#DDA28E",
  primary300: "#D28468",
  primary200: "#C76542",
  primary100: "#A54F31",

  secondary500: "#DCDDE9",
  secondary400: "#BCC0D6",
  secondary300: "#9196B9",
  secondary200: "#626894",
  secondary100: "#41476E",

  accent500: "#FFEED4",
  accent400: "#FFE1B2",
  accent300: "#FDD495",
  accent200: "#FBC878",
  accent100: "#FFBB50",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  success900: "#D4EDDA",
  success800: "#C3E6CB",
  success700: "#B1DFBB",
  success600: "#9FD9AB",
  success500: "#28A745",
  success400: "#218838",
  success300: "#1E7E34",
  success200: "#1C7430",
  success100: "#155724",

  warning900: "#FFF3CD",
  warning800: "#FFECB5",
  warning700: "#FFE082",
  warning600: "#FFD54F",
  warning500: "#FFC107",
  warning400: "#FFB300",
  warning300: "#FFA000",
  warning200: "#FF8F00",
  warning100: "#856404",

  info900: "#D1ECF1",
  info800: "#BEE5EB",
  info700: "#ABDDE5",
  info600: "#98D5DF",
  info500: "#17A2B8",
  info400: "#138496",
  info300: "#117A8B",
  info200: "#10707F",
  info100: "#0C5460",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
} as const

export const colors = {
  palette,
  /**
   * Primary brand color
   */
  PRIMARY: "#0071ce",
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
  
  /**
   * Success messages and positive states.
   */
  success: palette.success500,
  successBackground: palette.success900,
  
  /**
   * Warning messages and caution states.
   */
  warning: palette.warning500,
  warningBackground: palette.warning900,
  
  /**
   * Info messages and neutral states.
   */
  info: palette.info500,
  infoBackground: palette.info900,
  
  // Corporate Command Theme - UI Element Colors
  /**
   * Header and navigation background.
   */
  headerBackground: palette.neutral100,
  /**
   * Card and surface background.
   */
  surface: palette.neutral200,
  /**
   * Card background with subtle elevation.
   */
  cardBackground: palette.neutral200,
  /**
   * Subtle background for sections.
   */
  sectionBackground: palette.neutral300,
  
  // Corporate Command Theme - Interactive States
  /**
   * Primary button background.
   */
  buttonPrimary: palette.primary500,
  /**
   * Primary button text.
   */
  buttonPrimaryText: palette.neutral100,
  /**
   * Secondary button background.
   */
  buttonSecondary: palette.neutral300,
  /**
   * Secondary button text.
   */
  buttonSecondaryText: palette.neutral800,
  
  // Corporate Command Theme - Input States
  /**
   * Input field background.
   */
  inputBackground: palette.neutral200,
  /**
   * Input field border.
   */
  inputBorder: palette.neutral400,
  /**
   * Input field border when focused.
   */
  inputBorderFocused: palette.primary500,
  /**
   * Input field border when error.
   */
  inputBorderError: palette.angry500,
} as const
