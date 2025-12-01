import { I18nManager } from "react-native"
import * as Localization from "expo-localization"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import "intl-pluralrules"
import { settingsStorage } from "@/utils/storage"

// if English isn't your default language, move Translations to the appropriate language file.
import ar from "./ar"
import en, { Translations } from "./en"
import es from "./es"

const fallbackLocale = "en-US"

const systemLocales = Localization.getLocales()

// i18next expects resources with namespace: { [lang]: { translation: {...} } }
// But we can configure it to use the default namespace directly
const resources = {
  ar: { translation: ar },
  en: { translation: en },
  es: { translation: es },
}
const supportedTags = Object.keys(resources)

// Checks to see if the device locale matches any of the supported locales
// Device locale may be more specific and still match (e.g., en-US matches en)
const systemTagMatchesSupportedTags = (deviceTag: string) => {
  const primaryTag = deviceTag.split("-")[0]
  return supportedTags.includes(primaryTag)
}

const pickSupportedLocale: () => Localization.Locale | undefined = () => {
  return systemLocales.find((locale) => systemTagMatchesSupportedTags(locale.languageTag))
}

const locale = pickSupportedLocale()

export let isRTL = false

// Need to set RTL ASAP to ensure the app is rendered correctly. Waiting for i18n to init is too late.
if (locale?.languageTag && locale?.textDirection === "rtl") {
  I18nManager.allowRTL(true)
  isRTL = true
} else {
  I18nManager.allowRTL(false)
}

export const initI18n = async () => {
  i18n.use(initReactI18next)

  // Check for stored language preference first
  const storedLanguage = await settingsStorage.getLanguage()
  let initialLanguage = fallbackLocale

  if (storedLanguage) {
    // Validate stored language is supported - extract primary tag (e.g., 'en' from 'en-US')
    const primaryTag = storedLanguage.split("-")[0]
    if (supportedTags.includes(primaryTag)) {
      // Use just the primary tag for i18next (e.g., 'en' not 'en-US')
      initialLanguage = primaryTag
    }
  } else {
    // Fall back to device locale if no stored preference
    const deviceLang = locale?.languageTag ?? fallbackLocale
    const primaryTag = deviceLang.split("-")[0]
    if (supportedTags.includes(primaryTag)) {
      initialLanguage = primaryTag
    } else {
      initialLanguage = fallbackLocale.split("-")[0] // Use 'en' from 'en-US'
    }
  }

  await i18n.init({
    resources,
    lng: initialLanguage,
    fallbackLng: fallbackLocale.split("-")[0], // Use 'en' as fallback
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4", // Use v4 format
  })

  return i18n
}

/**
 * Change app language and persist the preference
 */
export const changeLanguage = async (languageCode: string) => {
  // Extract primary tag (e.g., 'en' from 'en-US')
  const primaryTag = languageCode.split("-")[0]

  if (!supportedTags.includes(primaryTag)) {
    console.warn(`Language ${languageCode} is not supported`)
    return false
  }

  try {
    // Use primary tag for i18next (it handles language codes like 'en', 'es', etc.)
    await i18n.changeLanguage(primaryTag)
    // Store the full code for consistency
    await settingsStorage.setLanguage(languageCode)
    return true
  } catch (error) {
    console.error("Failed to change language:", error)
    return false
  }
}

/**
 * Get current language code
 */
export const getCurrentLanguage = (): string => {
  return i18n.language || fallbackLocale.split("-")[0]
}

/**
 * Builds up valid keypaths for translations.
 */

export type TxKeyPath = RecursiveKeyOf<Translations>

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, true>
}[keyof TObj & (string | number)]

type RecursiveKeyOfInner<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, false>
}[keyof TObj & (string | number)]

type RecursiveKeyOfHandleValue<
  TValue,
  Text extends string,
  IsFirstLevel extends boolean,
> = TValue extends any[]
  ? Text
  : TValue extends object
    ? IsFirstLevel extends true
      ? Text | `${Text}:${RecursiveKeyOfInner<TValue>}`
      : Text | `${Text}.${RecursiveKeyOfInner<TValue>}`
    : Text
