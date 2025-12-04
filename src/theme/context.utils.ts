import type { Theme } from "./types"

const systemui = require("expo-system-ui")

/**
 * Set the system UI background color to the given color. This is only available if the app has
 * installed expo-system-ui.
 *
 * @param color The color to set the system UI background to
 */
export const setSystemUIBackgroundColor = (color: string) => {
  if (systemui) {
    systemui.setBackgroundColorAsync(color)
  }
}

/**
 * Set the app's native background color to match the theme.
 * This is only available if the app has installed expo-system-ui
 *
 * @param theme The theme object to use for the background color
 */
export const setImperativeTheming = (theme: Theme) => {
  // Safety check: ensure theme and colors are initialized
  if (theme?.colors?.background) {
    setSystemUIBackgroundColor(theme.colors.background)
  }
}
