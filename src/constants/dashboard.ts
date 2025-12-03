/**
 * Dashboard Constants
 * 
 * Mocked data and constants for dashboard components
 * All user-facing strings should be localized via i18n
 */

import { DriverStatus } from "@/types/status"

/**
 * Status order for display in StatusIconsRow
 */
export const STATUS_ORDER: DriverStatus[] = [
  "driving",
  "onDuty",
  "offDuty",
  "sleeperBerth",
  "personalConveyance",
  "yardMove",
]

/**
 * Theme options for ThemeSwitcher
 */
export const THEME_OPTIONS = [
  { code: "light", nameKey: "settings.themes.lightMode" },
  { code: "dark", nameKey: "settings.themes.darkMode" },
] as const

/**
 * Default driver initials when name is not available
 */
export const DEFAULT_DRIVER_INITIALS = "DR"

/**
 * Default driver name when not available
 */
export const DEFAULT_DRIVER_NAME = "Driver"

/**
 * Default organization name when not available
 */
export const DEFAULT_ORGANIZATION_NAME = "Organization"

/**
 * Default username when not available
 */
export const DEFAULT_USERNAME = "N/A"


