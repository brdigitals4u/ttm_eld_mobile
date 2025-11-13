import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { getCurrentLanguage } from '@/i18n'

/**
 * Hook to get current language and trigger re-renders when language changes
 * This ensures components using translations will re-render when language is changed
 */
export const useLanguage = () => {
  const [language, setLanguage] = useState(() => getCurrentLanguage())

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      setLanguage(lng)
    }

    // Subscribe to i18next language change events
    i18n.on('languageChanged', handleLanguageChanged)

    // Update state if language changes externally
    const currentLang = getCurrentLanguage()
    if (currentLang !== language) {
      setLanguage(currentLang)
    }

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [language])

  return language
}

