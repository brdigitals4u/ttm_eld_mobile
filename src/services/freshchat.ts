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

const DEFAULT_DOMAIN = "msdk.freshchat.com"

const sanitizeDomain = (domain?: string | null) => {
  if (!domain) return ""
  return domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
}

const APP_ID = "a979278b-1855-46cf-92d8-318c615afd4f"
const APP_KEY = "eddc1144-b972-4d4e-bd00-0ba386b546c1"
const DOMAIN = sanitizeDomain("msdk.in.freshchat.com") 
 

let initialized = false

const ensureInitialized = () => {
  if (initialized) return true
  if (Platform.OS === "web") {
    console.warn("[Freshchat] SDK is not supported on web – skipping init.")
    return false
  }
  if (!APP_ID || !APP_KEY) {
    console.warn(
      "[Freshchat] Missing APP_ID or APP_KEY. Set EXPO_PUBLIC_FRESHCHAT_APP_ID / APP_KEY.",
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
