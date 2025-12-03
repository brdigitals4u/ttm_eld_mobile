declare module "react-native-freshchat-sdk" {
  class FreshchatConfig {
    constructor(appId: string, appKey: string)
    domain?: string
    themeName?: string
    cameraCaptureEnabled?: boolean
    gallerySelectionEnabled?: boolean
    fileSelectionEnabled?: boolean
    responseExpectationEnabled?: boolean
  }

  class FreshchatUser {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    phoneCountryCode?: string
  }

  interface FreshchatInstance {
    init(config: FreshchatConfig): void
    showConversations(): void
    resetUser(): void
    setUser(user: FreshchatUser, callback?: (error?: string) => void): void
    identifyUser(externalId: string, restoreId?: string, callback?: (error?: string) => void): void
  }

  export const Freshchat: FreshchatInstance
  export { FreshchatConfig, FreshchatUser }
}



