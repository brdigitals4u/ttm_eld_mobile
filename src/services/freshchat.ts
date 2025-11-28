import { Platform } from "react-native"
import { Freshchat, FreshchatConfig, FreshchatUser } from "react-native-freshchat-sdk"

interface FreshchatIdentity {
  externalId?: string
  restoreId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  phoneCountryCode?: string
}

const sanitizeDomain = (domain?: string | null) => {
  if (!domain) return ""
  return domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
}

// Freshchat credentials - use environment variables or set directly
// Get these from Freshdesk portal: Admin → Channels → Mobile SDK
const APP_ID = process.env.EXPO_PUBLIC_FRESHCHAT_APP_ID || ""
const APP_KEY = process.env.EXPO_PUBLIC_FRESHCHAT_APP_KEY || "KtaxJejHFh-iCSQ3P6Mu"
const DOMAIN = sanitizeDomain(
  process.env.EXPO_PUBLIC_FRESHCHAT_DOMAIN || "ttmkonnectsandbox.freshdesk.com",
)

let initialized = false

const ensureInitialized = () => {
  if (initialized) return true
  if (Platform.OS === "web") {
    console.warn("[Freshchat] SDK is not supported on web – skipping init.")
    return false
  }
  if (!APP_ID || !APP_KEY) {
    console.error(
      "[Freshchat] Missing APP_ID or APP_KEY.",
      "\n  Set EXPO_PUBLIC_FRESHCHAT_APP_ID and EXPO_PUBLIC_FRESHCHAT_APP_KEY in your .env file.",
      "\n  Get App ID from: https://ttmkonnectsandbox.freshdesk.com/ → Admin → Channels → Mobile SDK",
      "\n  Current values:",
      `\n    APP_ID: ${APP_ID || "NOT SET"}`,
      `\n    APP_KEY: ${APP_KEY ? "SET" : "NOT SET"}`,
      `\n    DOMAIN: ${DOMAIN || "NOT SET"}`,
    )
    return false
  }

  try {
    const config = new FreshchatConfig(APP_ID, APP_KEY)
    if (DOMAIN) {
      config.domain = DOMAIN
    }
    config.cameraCaptureEnabled = true
    config.gallerySelectionEnabled = true
    config.fileSelectionEnabled = true
    config.responseExpectationEnabled = true

    Freshchat.init(config)
    initialized = true
    console.log("[Freshchat] Initialized with domain", DOMAIN)
    return true
  } catch (error) {
    console.error("[Freshchat] Failed to initialize:", error)
    return false
  }
}

export const initFreshchat = () => {
  if (!initialized) {
    ensureInitialized()
  }
}

export const identifyFreshchatUser = async (identity?: FreshchatIdentity | null) => {
  if (!identity) return
  if (!identity.externalId && !identity.email) {
    return
  }

  if (!ensureInitialized()) {
    return
  }

  try {
    const user = new FreshchatUser()
    if (identity.firstName) user.firstName = identity.firstName
    if (identity.lastName) user.lastName = identity.lastName
    if (identity.email) user.email = identity.email
    if (identity.phone) user.phone = identity.phone
    if (identity.phoneCountryCode) user.phoneCountryCode = identity.phoneCountryCode

    await new Promise<void>((resolve) => {
      Freshchat.setUser(user, (error?: string) => {
        if (error) {
          console.warn("[Freshchat] setUser error:", error)
        }
        resolve()
      })
    })

    if (identity.externalId) {
      Freshchat.identifyUser(identity.externalId, identity.restoreId ?? "", (error?: string) => {
        if (error) {
          console.warn("[Freshchat] identifyUser error:", error)
        }
      })
    }
  } catch (error) {
    console.error("[Freshchat] Failed to set user:", error)
  }
}

export const resetFreshchatUser = () => {
  if (initialized) {
    Freshchat.resetUser()
  }
}

export const showFreshchatConversations = () => {
  if (!ensureInitialized()) {
    return false
  }
  Freshchat.showConversations()
  return true
}
