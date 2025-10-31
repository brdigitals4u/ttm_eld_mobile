const palette = {
  // Corporate Command Theme - Primary Colors
  neutral100: "#FFFFFF", // Pure White - main content backgrounds
  neutral200: "#F0F2F5", // Light Gray - cards, dividers, background elements
  neutral300: "#E0E4E7", // Light border gray
  neutral400: "#B8BCC8", // Medium gray
  neutral500: "#6C7293", // Text gray
  neutral600: "#4A5568", // Dark gray
  neutral700: "#2D3748", // Darker gray
  neutral800: "#1A202C", // Very dark gray
  neutral900: "#0A2A4E", // Deep Navy Blue - headers, sidebars

  // Corporate Command Theme - Action Colors
  primary100: "#E3F2FD", // Light blue
  primary200: "#BBDEFB", // Lighter blue
  primary300: "#90CAF9", // Medium light blue
  primary400: "#64B5F6", // Medium blue
  primary500: "#0071ce", // Main brand blue - buttons, links, selected states
  primary600: "#0056B3", // Darker blue
  primary700: "#004085", // Dark blue
  primary800: "#003366", // Very dark blue
  primary900: "#0A2A4E", // Deep Navy Blue

  // Corporate Command Theme - Status Colors
  success100: "#D4EDDA", // Light green
  success200: "#C3E6CB", // Lighter green
  success300: "#B1DFBB", // Medium light green
  success400: "#9FD9AB", // Medium green
  success500: "#28A745", // Success Green - On Time, Active, Completed
  success600: "#1E7E34", // Darker green
  success700: "#155724", // Dark green
  success800: "#0C4A1E", // Very dark green
  success900: "#032017", // Deep green

  warning100: "#FFF3CD", // Light yellow
  warning200: "#FFECB5", // Lighter yellow
  warning300: "#FFE082", // Medium light yellow
  warning400: "#FFD54F", // Medium yellow
  warning500: "#FFC107", // Warning Orange - Delayed, Maintenance Due
  warning600: "#E0A800", // Darker yellow
  warning700: "#B8860B", // Dark yellow
  warning800: "#856404", // Very dark yellow
  warning900: "#6B4C00", // Deep yellow

  error100: "#F8D7DA", // Light red
  error200: "#F1B0B7", // Lighter red
  error300: "#EAA0A8", // Medium light red
  error400: "#E3737E", // Medium red
  error500: "#DC3545", // Alert Red - Stopped, SOS, Overdue
  error600: "#C82333", // Darker red
  error700: "#A71E2A", // Dark red
  error800: "#7F1A23", // Very dark red
  error900: "#58151C", // Deep red

  // Legacy support (keeping for compatibility)
  secondary100: "#F0F2F5", // Light Gray
  secondary200: "#E0E4E7", // Light border gray
  secondary300: "#B8BCC8", // Medium gray
  secondary400: "#6C7293", // Text gray
  secondary500: "#4A5568", // Dark gray

  accent100: "#E3F2FD", // Light blue
  accent200: "#BBDEFB", // Lighter blue
  accent300: "#90CAF9", // Medium light blue
  accent400: "#64B5F6", // Medium blue
  accent500: "#007BFF", // Action Blue
  accent600: "#0056B3", // Darker blue
  accent700: "#004085", // Dark blue
  accent800: "#003366", // Very dark blue
  accent900: "#0A2A4E", // Deep Navy Blue

  angry100: "#F8D7DA", // Light red
  angry500: "#DC3545", // Alert Red

  overlay20: "rgba(10, 42, 78, 0.2)", // Deep Navy Blue with opacity
  overlay50: "rgba(10, 42, 78, 0.5)", // Deep Navy Blue with opacity

  light: {
    primary: "#0071ce", // Main brand blue
    secondary: "#3B82F6", // Bright blue
    background: "#FFFFFF",
    card: "#F9FAFB",
    surface: "#F3F4F6",
    text: "#111827",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    notification: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    error: "#EF4444",
    inactive: "#9CA3AF",
    driving: "#10B981", // Green
    onDuty: "#F59E0B", // Amber
    offDuty: "#3B82F6", // Blue
    sleeping: "#6366F1", // Indigo
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.5)",
    shadowColor: "#000000",
  },
  dark: {
    primary: "#0071ce", // Main brand blue
    secondary: "#60A5FA", // Lighter blue
    background: "#0F172A",
    card: "#1E293B",
    surface: "#334155",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    border: "#475569",
    notification: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    error: "#EF4444",
    inactive: "#64748B",
    driving: "#10B981", // Green
    onDuty: "#F59E0B", // Amber
    offDuty: "#3B82F6", // Blue
    sleeping: "#6366F1", // Indigo
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.7)",
    shadowColor: "#000000",
  }
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
  PRIMARY: "#0071ce",
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  // Corporate Command Theme - Semantic Colors
  /**
   * The default text color in many components.
   */
  text: palette.neutral800, // Dark gray for primary text
  /**
   * Secondary text information.
   */
  textDim: palette.neutral500, // Medium gray for secondary text
  /**
   * The default color of the screen background.
   */
  background: palette.neutral100, // Pure White
  /**
   * The default border color.
   */
  border: palette.neutral300, // Light border gray
  /**
   * The main tinting color.
   */
  tint: palette.primary500, // Action Blue
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral400, // Medium gray for inactive states
  /**
   * A subtle color used for lines and separators.
   */
  separator: palette.neutral200, // Light Gray for dividers
  
  // Corporate Command Theme - Status Colors
  /**
   * Error messages and alerts.
   */
  error: palette.error500, // Alert Red
  /**
   * Error Background.
   */
  errorBackground: palette.error100, // Light red background
  
  /**
   * Success messages and positive states.
   */
  success: palette.success500, // Success Green
  successBackground: palette.success100, // Light green background
  
  /**
   * Warning messages and caution states.
   */
  warning: palette.warning500, // Warning Orange
  warningBackground: palette.warning100, // Light yellow background
  
  /**
   * Info messages and neutral states.
   */
  info: palette.primary500, // Action Blue
  infoBackground: palette.primary100, // Light blue background
  
  // Corporate Command Theme - UI Element Colors
  /**
   * Header and navigation background.
   */
  headerBackground: palette.neutral900, // Deep Navy Blue
  /**
   * Card and surface background.
   */
  surface: palette.neutral100, // Pure White
  /**
   * Card background with subtle elevation.
   */
  cardBackground: palette.neutral100, // Pure White
  /**
   * Subtle background for sections.
   */
  sectionBackground: palette.neutral200, // Light Gray
  
  // Corporate Command Theme - Interactive States
  /**
   * Primary button background.
   */
  buttonPrimary: palette.primary500, // Action Blue
  /**
   * Primary button text.
   */
  buttonPrimaryText: palette.neutral100, // Pure White
  /**
   * Secondary button background.
   */
  buttonSecondary: palette.neutral200, // Light Gray
  /**
   * Secondary button text.
   */
  buttonSecondaryText: palette.neutral800, // Dark gray
  
  // Corporate Command Theme - Input States
  /**
   * Input field background.
   */
  inputBackground: palette.neutral100, // Pure White
  /**
   * Input field border.
   */
  inputBorder: palette.neutral300, // Light border gray
  /**
   * Input field border when focused.
   */
  inputBorderFocused: palette.primary500, // Action Blue
  /**
   * Input field border when error.
   */
  inputBorderError: palette.error500, // Alert Red

  light: palette.light,
  dark: palette.dark,
  
} as const
