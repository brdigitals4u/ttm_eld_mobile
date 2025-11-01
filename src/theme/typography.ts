// TODO: write documentation about fonts and typography along with guides on how to add custom fonts in own
// markdown file and add links from here

import { Platform } from "react-native"

export const customFontsToLoad = {
  'AsenPro-Thin': require('../services/fonts/AsenPro-Thin.otf'),
  'AsenPro-ThinItalic': require('../services/fonts/AsenPro-ThinItalic.otf'),
  'AsenPro-ExtraLight': require('../services/fonts/AsenPro-ExtraLight.otf'),
  'AsenPro-ExtraLightItalic': require('../services/fonts/AsenPro-ExtraLightItalic.otf'),
  'AsenPro-Light': require('../services/fonts/AsenPro-Light.otf'),
  'AsenPro-LightItalic': require('../services/fonts/AsenPro-LightItalic.otf'),
  'AsenPro-Regular': require('../services/fonts/AsenPro-Regular.otf'),
  'AsenPro-Italic': require('../services/fonts/AsenPro-Italic.otf'),
  'AsenPro-Medium': require('../services/fonts/AsenPro-Medium.otf'),
  'AsenPro-MediumItalic': require('../services/fonts/AsenPro-MediumItalic.otf'),
  'AsenPro-Semibold': require('../services/fonts/AsenPro-Semibold.otf'),
  'AsenPro-SemiboldItalic': require('../services/fonts/AsenPro-SemiboldItalic.otf'),
  'AsenPro-Bold': require('../services/fonts/AsenPro-Bold.otf'),
  'AsenPro-BoldItalic': require('../services/fonts/AsenPro-BoldItalic.otf'),
  'AsenPro-ExtraBold': require('../services/fonts/AsenPro-ExtraBold.otf'),
  'AsenPro-ExtraBoldItalic': require('../services/fonts/AsenPro-ExtraBoldItalic.otf'),
  'AsenPro-Black': require('../services/fonts/AsenPro-Black.otf'),
  'AsenPro-BlackItalic': require('../services/fonts/AsenPro-BlackItalic.otf'),
}

const fonts = {
  asenPro: {
    // Custom TTM brand font
    thin: "AsenPro-Thin",
    extraLight: "AsenPro-ExtraLight",
    light: "AsenPro-Light",
    normal: "AsenPro-Regular",
    medium: "AsenPro-Medium",
    semiBold: "AsenPro-Semibold",
    bold: "AsenPro-Bold",
    extraBold: "AsenPro-ExtraBold",
    black: "AsenPro-Black",
  },
}

export const typography = {
  /**
   * The fonts are available to use, but prefer using the semantic name.
   */
  fonts,
  /**
   * The primary font. Used in most places.
   */
  primary: fonts.asenPro,
  /**
   * An alternate font used for perhaps titles and stuff.
   */
  secondary: Platform.select({ ios: fonts.asenPro, android: fonts.asenPro }),
  /**
   * Lets get fancy with a monospace font!
   */
  code: Platform.select({ ios: fonts.asenPro, android: fonts.asenPro}),
}
