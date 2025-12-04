const palette = {
  // Grayscale / neutrals (REPLACED with royal-black neutrals)
  neutral100: "#FFFFFF",   // pure white
  neutral90:  "#E6E8ED",
  neutral80:  "#C3C7CE",
  neutral70:  "#7E8796",
  neutral60:  "#555B6C",
  neutral50:  "#3A3F4D",
  neutral40:  "#2B2F3B",
  neutral30:  "#232732",
  neutral20:  "#1C202A",
  neutral10:  "#161A22",
  neutral0:   "#0B0D11",   // deep black-blue (royal ink black)

  // Royal Scotland Blue Scale (added + replaces your primary shades visually)
  primary600: "#001F4D",   // deep royal navy
  primary500: "#007CE1",   // your existing main (kept)
  primary400: "#003087",   // bright royal navy
  primary300: "#0044AA",
  primary200: "#005FCC",
  primary100: "#002366",   // scotland royal blue

  // Secondary kept as is
  secondary500: "#007CE1",
  secondary400: "#1A86E6",
  secondary300: "#4DAFF6",
  secondary200: "#89D1FF",
  secondary100: "#DFF6FF",

  // Screenshot swatches (unchanged)
  mainPrimaryScreenshot: "#6936FF",
  mainSecondaryScreenshot: "#F56CFF",
  mainTertiaryScreenshot: "#F3C7F8",

  // Alerts
  warning500: "#FACC15",
  success500: "#00C566",
  error500:   "#FF6B00",

  // Additional colors
  white: "#FFFFFF",
  line: "#2B2F3B",      // updated to match royal-black contrast
  lineDark: "#161A22",  // deeper separator
  black: "#0B0D11",

  // Accent / utility
  accent500: "#FFDFA6",
  accent400: "#F5C97A",
  accent300: "#EAB358",
  accent200: "#DA9932",
  accent100: "#C17F18",

  // Info
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
  overlay20: "rgba(11, 13, 17, 0.2)",
  overlay50: "rgba(11, 13, 17, 0.5)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * Primary brand color
   */
  PRIMARY: "#007CE1",
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral100, // White for primary text in dark theme
  /**
   * Secondary text information.
   */
  textDim: palette.neutral70, // Medium gray for secondary text
  /**
   * The default color of the screen background.
   */
  background: palette.neutral0, // Deep black-blue background
  /**
   * The default border color.
   */
  border: palette.neutral40, // Dark border gray
  /**
   * The main tinting color.
   */
  tint: palette.primary500, // Action Blue
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral60, // Medium gray for inactive states
  /**
   * A subtle color used for lines and separators.
   */
  separator: palette.neutral20, // Dark Gray for dividers
  
  // Corporate Command Theme - Status Colors
  /**
   * Error messages and alerts.
   */
  error: palette.error500, // Alert Red
  /**
   * Error Background.
   */
  errorBackground: palette.angry100, // Dark red background
  
  /**
   * Success messages and positive states.
   */
  success: palette.success500, // Success Green
  successBackground: palette.success100, // Dark green background
  
  /**
   * Warning messages and caution states.
   */
  warning: palette.warning500, // Warning Yellow
  warningBackground: palette.warning100, // Dark yellow background
  
  /**
   * Info messages and neutral states.
   */
  info: palette.primary500, // Action Blue
  infoBackground: palette.primary100, // Dark blue background
  
  // Corporate Command Theme - UI Element Colors
  /**
   * Header and navigation background.
   */
  headerBackground: palette.neutral0, // Deep black-blue
  /**
   * Card and surface background.
   */
  surface: palette.neutral10, // Slightly lighter than background
  /**
   * Card background with subtle elevation.
   */
  cardBackground: palette.neutral20, // Card background
  /**
   * Subtle background for sections.
   */
  sectionBackground: palette.neutral20, // Section background
  
  // Corporate Command Theme - Interactive States
  /**
   * Primary button background.
   */
  buttonPrimary: palette.primary500, // Action Blue
  /**
   * Primary button text.
   */
  buttonPrimaryText: palette.neutral100, // White
  /**
   * Secondary button background.
   */
  buttonSecondary: palette.neutral30, // Dark gray
  /**
   * Secondary button text.
   */
  buttonSecondaryText: palette.neutral100, // White
  
  // Corporate Command Theme - Input States
  /**
   * Input field background.
   */
  inputBackground: palette.neutral20, // Dark background
  /**
   * Input field border.
   */
  inputBorder: palette.neutral40, // Dark border gray
  /**
   * Input field border when focused.
   */
  inputBorderFocused: palette.primary500, // Action Blue
  /**
   * Input field border when error.
   */
  inputBorderError: palette.error500, // Alert Red
} as const