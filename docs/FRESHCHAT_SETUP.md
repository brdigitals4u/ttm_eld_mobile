# Freshchat Setup (Sandbox)

This app now uses the official [`react-native-freshchat-sdk`](https://github.com/freshworks/freshchat-react-native) to power driver support chat. Follow the steps below to configure the sandbox environment.

## 1. Obtain credentials

1. Sign in to the Freshdesk/Freshchat sandbox portal: `https://ttmkonnectsandbox.freshdesk.com/`.
2. Navigate to **Admin → Channels → Mobile SDK** (or **Account Settings → Mobile SDK**).
3. Copy the following values:
   - **App ID**
   - **App Key** (sandbox key currently provided: `KtaxJejHFh-iCSQ3P6Mu`)
   - **Domain** (use the Freshdesk domain without the protocol, e.g. `ttmkonnectsandbox.freshdesk.com`)

## 2. Environment variables

Expose the credentials via Expo's public env variables so they are available inside the JS bundle:

```bash
# .env (or shell env before running Expo)
EXPO_PUBLIC_FRESHCHAT_APP_ID=<sandbox-app-id>
EXPO_PUBLIC_FRESHCHAT_APP_KEY=KtaxJejHFh-iCSQ3P6Mu
EXPO_PUBLIC_FRESHCHAT_DOMAIN=ttmkonnectsandbox.freshdesk.com
```

> **Note:** Never commit production keys. Override these variables per environment (development, staging, production) as needed.

## 3. Behavior in the app

- `initFreshchat()` is called once during app launch (see `src/app/_layout.tsx`).
- Whenever the authenticated driver info changes, `identifyFreshchatUser()` runs automatically from `ChatSupportProvider`, ensuring conversations follow the driver across devices.
- `Chat Support` entries (e.g., `ChatSupportButton`, `chat-support` route) call `showFreshchatConversations()` to open the Freshchat conversations view. If the SDK is not configured, we fall back to the in-app support screen with troubleshooting info.

## 4. Verifying the integration

1. Launch the app with the env variables set.
2. Log in as a driver; check the console for `[Freshchat] Initialized...`.
3. Tap **Support → Chat Support** (or any `ChatSupportButton`). The Freshchat conversations UI should appear.
4. Confirm the driver identity (external ID, email) appears inside the Freshdesk/Freshchat inbox.

If Freshchat fails to open, ensure:

- The env variables are present in the current shell/session.
- The sandbox domain is reachable from the device.
- The App ID/App Key match the sandbox workspace credentials.


















