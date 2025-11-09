/**
 * Chatwoot Configuration
 * Settings for integrating Chatwoot chat widget into the mobile app
 */

const DEFAULT_BASE_URL = "https://chat.ttmkonnect.com"
const DEFAULT_WEBSITE_TOKEN = "S6Mz2mJKTm9poMN9ap5njB6f"

const envOrDefault = (envValue: string | undefined, fallback: string) => {
  if (!envValue || envValue.trim().length === 0) return fallback
  return envValue.trim()
}

const normaliseUrl = (value: string) => value.replace(/\/+$/, "")

const BASE_URL = normaliseUrl(
  envOrDefault(process.env.EXPO_PUBLIC_CHATWOOT_BASE_URL, DEFAULT_BASE_URL),
)

export const CHATWOOT_CONFIG = {
  BASE_URL,
  WEBSITE_TOKEN: envOrDefault(
    process.env.EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN,
    DEFAULT_WEBSITE_TOKEN,
  ),

  SECURE_IFRAME_URL: envOrDefault(
    process.env.EXPO_PUBLIC_CHATWOOT_SECURE_IFRAME_URL,
    `${BASE_URL}/api/secure-iframe?api_key=ttm_admin_key_001`,
  ),

  INTEGRATION_API_URL: envOrDefault(
    process.env.EXPO_PUBLIC_CHATWOOT_INTEGRATION_API_URL,
    BASE_URL,
  ),

  // Widget Configuration
  WIDGET_CONFIG: {
    locale: 'en',
    type: 'expanded_bubble', // or 'standard'
    launcherTitle: 'Chat with Support',
    position: 'right' as const,
    darkMode: 'auto' as const, // 'light', 'dark', or 'auto'
  },

  // SDK Script URLs
  SDK_SCRIPT_URL: `${BASE_URL.replace(/^https?:/, "https:")}/packs/js/sdk.js`.replace(
    /^https:\/\/https:\/\//,
    "https://",
  ),

  // Timeout for WebView message communication (ms)
  MESSAGE_TIMEOUT: 30000,

  // Enable debug logging
  DEBUG: process.env.NODE_ENV === 'development',
};

/**
 * Generate Chatwoot HTML with embedded widget
 * This HTML is loaded in WebView within the mobile app
 */
export const generateChatwootHTML = (
  websiteToken: string,
  userIdentifier?: string,
  userName?: string,
  userEmail?: string,
  customAttributes?: Record<string, any>
): string => {
  const customAttrsScript = customAttributes
    ? `customAttributes: ${JSON.stringify(customAttributes)},`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #fff;
          height: 100vh;
          width: 100%;
        }
        html, body, #app {
          height: 100%;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div id="app"></div>
      <script>
        // Chatwoot Widget Integration
        (function(d, t) {
          var BASE_URL = "${BASE_URL}";
          var g = d.createElement(t);
          var s = d.getElementsByTagName(t)[0];
          g.src = BASE_URL + "/packs/js/sdk.js";
          g.defer = true;
          g.async = true;
          s.parentNode.insertBefore(g, s);
          g.onload = function() {
            if (window.chatwootSDK) {
              window.chatwootSDK.run({
                websiteToken: "${websiteToken}",
                baseUrl: BASE_URL,
                locale: "${CHATWOOT_CONFIG.WIDGET_CONFIG.locale}",
                type: "${CHATWOOT_CONFIG.WIDGET_CONFIG.type}",
                launcherTitle: "${CHATWOOT_CONFIG.WIDGET_CONFIG.launcherTitle}",
                position: "${CHATWOOT_CONFIG.WIDGET_CONFIG.position}",
                darkMode: "${CHATWOOT_CONFIG.WIDGET_CONFIG.darkMode}",
                ${customAttrsScript}
                ${userIdentifier ? `user: {
                  identifier: "${userIdentifier}",
                  ${userName ? `name: "${userName}",` : ''}
                  ${userEmail ? `email: "${userEmail}",` : ''}
                },` : ''}
              });
              
              // Send message to React Native that widget is ready
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'CHATWOOT_READY',
                  payload: { loaded: true }
                }));
              }
            }
          };
          
          // Error handling
          g.onerror = function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CHATWOOT_ERROR',
                payload: { error: 'Failed to load Chatwoot SDK' }
              }));
            }
          };
        })(document, 'script');

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          try {
            const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            
            if (message.type === 'UPDATE_USER') {
              // Update user information in Chatwoot
              if (window.chatwootSDK) {
                window.chatwootSDK.setUser(message.payload);
              }
            }
          } catch (error) {
            console.error('Message handling error:', error);
          }
        });
      </script>
    </body>
    </html>
  `;
};

/**
 * Chatwoot User Data Interface
 */
export interface ChatwootUser {
  identifier: string; // Unique user ID (e.g., driver ID)
  name?: string;
  email?: string;
  phone?: string;
  customAttributes?: Record<string, any>;
}

/**
 * Chatwoot Message Interface
 */
export interface ChatwootMessage {
  type: string;
  payload: any;
}
