/**
 * Common Color Constants
 * Centralized color definitions used throughout the app
 */

export const COLORS = {
  // Primary Brand Colors
  primary: '#0071ce',        // Main brand blue
  indigo: '#0071ce',         // Alias for primary
  violet: '#0071ce',         // Alias for primary
  
  // Base Colors
  black: '#000000',
  white: '#FFFFFF',
  
  // Text Colors
  ink700: '#1F2430',         // Primary text
  ink500: '#4B5563',         // Secondary text
  ink300: '#9CA3AF',         // Tertiary text / placeholders
  
  // Surface Colors
  surface: '#F3F4F6',        // Card backgrounds
  border: '#E5E7EB',         // Border color
} as const

// Type export for TypeScript support
export type ColorKey = keyof typeof COLORS
