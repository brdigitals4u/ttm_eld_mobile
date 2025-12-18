import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import { asyncStorage } from "@/utils/storage"

interface AppStore {
  theme: "light" | "dark"
  language: string
  themeChangeTrigger: boolean
  setTheme: (theme: "light" | "dark") => void
  setLanguage: (language: string) => void
  triggerThemeTransition: (trigger: boolean) => void
}

// Custom storage adapter for Zustand persist
const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return await asyncStorage.getItem(name)
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await asyncStorage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await asyncStorage.removeItem(name)
  },
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: "dark", // Default to dark theme
      language: "en", // Default to English
      themeChangeTrigger: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      triggerThemeTransition: (trigger) => set({ themeChangeTrigger: trigger }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(() => storage),
    },
  ),
)















