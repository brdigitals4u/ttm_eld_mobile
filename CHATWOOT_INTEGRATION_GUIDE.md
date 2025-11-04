# Chatwoot Integration Guide - TTM Mobile App

Complete guide for implementing Chatwoot chat support in the TTM Konnect ELD mobile application.

## Overview

Chatwoot is integrated into the mobile app to allow drivers to contact support in real-time. The integration uses:
- **WebView** to display the Chatwoot chat widget
- **Context API** for state management
- **Custom hooks** for WebView-to-React Native communication
- **Multiple component variants** for different UI placement options

## Architecture

```
┌─────────────────────────────────────────────┐
│          React Native App                   │
├─────────────────────────────────────────────┤
│  ChatSupportProvider (Context)              │
│  ├── User data management                   │
│  ├── Chat state (open/closed)               │
│  └── Error handling                         │
├─────────────────────────────────────────────┤
│  ChatSupportScreen                          │
│  └── WebView (displays Chatwoot widget)     │
│      └── WebView HTML with Chatwoot SDK    │
│          └── Chatwoot Server (Port 8084)   │
└─────────────────────────────────────────────┘
```

## Files Created

### 1. Configuration
- **`src/utils/chatwootConfig.ts`**
  - Chatwoot server URLs and settings
  - HTML generation for WebView
  - TypeScript interfaces for type safety

### 2. State Management
- **`src/contexts/ChatSupportContext.tsx`**
  - Provider for chat state
  - Hook: `useChatSupport()`
  - Manages user data, loading states, errors

### 3. WebView Integration
- **`src/hooks/useChatwootWebView.ts`**
  - Custom hook for WebView communication
  - Message handling between native and WebView
  - Methods to control chat widget

### 4. UI Components
- **`src/app/chat-support.tsx`**
  - Main chat screen with WebView
  - Error handling and loading states
  - Responsive layout with SafeAreaView

- **`src/components/ChatSupportButton.tsx`**
  - Reusable chat button component
  - Three variants: icon, button, FAB (floating action button)
  - Displays unread message count
  - Customizable sizes

## Setup Instructions

### Step 1: Get Chatwoot Website Token

1. Go to Chatwoot Dashboard: `http://213.210.13.196:8084`
2. Login with provided credentials
3. Navigate to **Settings** → **Inboxes**
4. Click **Add Inbox** → **Website**
5. Follow the wizard and copy your **Website Token**

### Step 2: Configure Environment Variables

Create or update `.env.local` file in the project root:

```bash
# Chatwoot Configuration
EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN=your_website_token_here
```

Or update `src/utils/chatwootConfig.ts`:

```typescript
WEBSITE_TOKEN: 'your_website_token_here',
```

### Step 3: Add ChatSupportProvider to App

Update `src/contexts/AllContextsProvider.tsx`:

```typescript
import { ChatSupportProvider } from './ChatSupportContext';

export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ChatSupportProvider>
      {/* Other providers */}
      {children}
    </ChatSupportProvider>
  );
};
```

### Step 4: Add Chat Button to Navigation

#### Option A: Add to Header (in your screen)

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';

// In your screen component
useLayoutEffect(() => {
  navigation.setOptions({
    headerRight: () => (
      <ChatSupportButton 
        variant="icon" 
        userId={userId}
        userName={driverName}
        userEmail={driverEmail}
      />
    ),
  });
}, []);
```

#### Option B: Add to More Screen

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';

// In more.tsx or similar
<View style={styles.menuSection}>
  <ChatSupportButton 
    variant="button"
    label="Contact Support"
    userId={userId}
    userName={driverName}
    userEmail={driverEmail}
    customAttributes={{
      driver_status: 'active',
      vehicle_id: vehicleId,
    }}
  />
</View>
```

#### Option C: Add as Floating Action Button

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';

// In your main app screen
<View style={styles.container}>
  {/* Main content */}
  <ChatSupportButton 
    variant="fab"
    userId={userId}
    userName={driverName}
  />
</View>
```

## Usage Examples

### Basic Usage

```typescript
import { useChatSupport } from '../contexts/ChatSupportContext';
import { useRouter } from 'expo-router';

const MyScreen = () => {
  const router = useRouter();
  const chatSupport = useChatSupport();

  const openChat = () => {
    // Set user data
    chatSupport.setUser({
      identifier: 'driver_123',
      name: 'John Doe',
      email: 'john@example.com',
      customAttributes: {
        vehicle_id: 'V123',
        status: 'active',
      },
    });

    // Navigate to chat
    router.push('/chat-support');
  };

  return <Button onPress={openChat} title="Chat with Support" />;
};
```

### With Custom Attributes

```typescript
chatSupport.setUser({
  identifier: driverId,
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1-555-0123',
  customAttributes: {
    driver_status: 'active',
    vehicle_type: 'truck',
    city: 'New York',
    license_type: 'CDL',
    experience_years: 5,
  },
});

router.push('/chat-support');
```

### Monitoring Chat State

```typescript
const chatSupport = useChatSupport();

useEffect(() => {
  console.log('Chat loading:', chatSupport.isLoading);
  console.log('Unread messages:', chatSupport.unreadCount);
  console.log('Chat open:', chatSupport.isChatOpen);
}, [chatSupport.isLoading, chatSupport.unreadCount, chatSupport.isChatOpen]);
```

## WebView Message Communication

The integration uses `postMessage` to communicate between React Native and WebView:

```typescript
// From React Native to WebView
const { updateUser } = useChatwootWebView();

updateUser({
  identifier: 'user_123',
  name: 'John Doe',
  email: 'john@example.com',
});

// Custom JavaScript execution
executeScript(`
  if (window.chatwootSDK) {
    console.log('Chatwoot SDK is ready');
  }
`);

// Open/Close chat
openChat();  // Opens the chat widget
closeChat(); // Closes the chat widget
minimizeChat(); // Minimizes the chat bubble
```

## Customization

### Change Widget Colors

Edit `src/utils/chatwootConfig.ts`:

```typescript
WIDGET_CONFIG: {
  locale: 'en',
  type: 'expanded_bubble', // 'standard' for classic style
  launcherTitle: 'Chat with Support',
  position: 'right', // 'left' for left side
  darkMode: 'auto', // 'light', 'dark', or 'auto'
}
```

### Add Custom User Attributes

When setting user data:

```typescript
chatSupport.setUser({
  identifier: userId,
  name: userName,
  customAttributes: {
    // Add any custom attributes here
    subscription_type: 'premium',
    account_age_days: 365,
    last_trip_date: '2025-11-04',
    total_trips: 150,
  },
});
```

### Handle Specific Events

```typescript
const { registerMessageHandler } = useChatwootWebView();

// Register handler for specific event
const unsubscribe = registerMessageHandler('USER_IDENTIFIED', (payload) => {
  console.log('User identified in Chatwoot:', payload);
});

// Cleanup when done
useEffect(() => {
  return () => {
    unsubscribe();
  };
}, []);
```

## Production Deployment

### Security Considerations

1. **Use HTTPS**: In production, update URLs to use HTTPS
   ```typescript
   BASE_URL: 'https://your-chatwoot-domain.com',
   ```

2. **Store tokens securely**: Use `expo-secure-store`
   ```typescript
   import * as SecureStore from 'expo-secure-store';
   
   const getWebsiteToken = async () => {
     return await SecureStore.getItemAsync('CHATWOOT_WEBSITE_TOKEN');
   };
   ```

3. **Environment variables**: Keep tokens in `.env` files (not in git)

### Performance Optimization

1. **Lazy load the chat screen** to reduce bundle size
2. **Memoize components** to prevent unnecessary re-renders
3. **Use React Query** for message caching if needed

### Android/iOS Permissions

The WebView may request:
- `android.permission.INTERNET` (HTTP/HTTPS)
- `android.permission.CAMERA` (for video support)
- `android.permission.MICROPHONE` (for video/audio)
- `android.permission.WRITE_EXTERNAL_STORAGE` (for file uploads)

These are typically handled by the WebView automatically.

## Troubleshooting

### Issue: Chat Widget Not Loading

**Solution:**
1. Check website token is valid
2. Verify Chatwoot server is running: `docker compose ps`
3. Check browser console in WebView (React Native Debugger)
4. Ensure network connectivity

### Issue: User Not Identified in Chatwoot

**Solution:**
1. Verify `identifier` field is unique per driver
2. Check custom attributes are being sent
3. Review Chatwoot logs: `docker compose logs -f rails`

### Issue: Messages Not Appearing

**Solution:**
1. Ensure inbox is active in Chatwoot settings
2. Check website token is correct
3. Verify user is assigned to the correct inbox

### Issue: WebView Crashing

**Solution:**
1. Check JavaScript errors in React Native Debugger
2. Clear WebView cache: Restart app
3. Reduce custom attribute complexity
4. Update react-native-webview: `npm install react-native-webview@latest`

## Testing

### Test in Development

```bash
# Start the app
npm start

# Open in simulator
npm run android
npm run ios

# Navigate to chat screen and test
```

### Test Features

1. **User Identification**: Verify driver info appears in Chatwoot
2. **Message Sending**: Send test message from app
3. **Message Receiving**: Send message from Chatwoot admin, verify it appears in app
4. **Custom Attributes**: Check custom attributes in Chatwoot contact details
5. **Error Handling**: Test with invalid token, offline mode

## API Reference

### useChatSupport Hook

```typescript
const {
  user,              // Current user object
  setUser,           // Set user data
  clearUser,         // Clear user data
  isChatOpen,        // Is chat open?
  setIsChatOpen,     // Control chat visibility
  isLoading,         // Is loading?
  setIsLoading,      // Set loading state
  error,             // Error message if any
  setError,          // Set error message
  unreadCount,       // Unread message count
  setUnreadCount,    // Set unread count
} = useChatSupport();
```

### useChatwootWebView Hook

```typescript
const {
  webViewRef,             // Reference to WebView
  handleWebViewMessage,   // Message handler callback
  postMessage,            // Send message to WebView
  updateUser,             // Update user in WebView
  registerMessageHandler, // Register custom handler
  executeScript,          // Execute JS in WebView
  openChat,               // Open chat widget
  closeChat,              // Close chat widget
  minimizeChat,           // Minimize chat widget
} = useChatwootWebView(options);
```

### ChatSupportButton Props

```typescript
interface ChatSupportButtonProps {
  variant?: 'icon' | 'button' | 'fab';           // Button style
  size?: 'small' | 'medium' | 'large';           // Button size
  label?: string;                                 // Button label (for 'button' variant)
  userId?: string;                                // User identifier
  userName?: string;                              // Display name
  userEmail?: string;                             // Email address
  customAttributes?: Record<string, any>;         // Custom attributes
}
```

## Support

For issues or questions about the integration:

1. Check Chatwoot logs: `docker compose logs -f`
2. Review browser console in React Native Debugger
3. Check integration API status: `curl http://213.210.13.196:8088/health`

## Resources

- **Chatwoot Docs**: https://www.chatwoot.com/docs/
- **React Native WebView**: https://github.com/react-native-webview/react-native-webview
- **Expo Docs**: https://docs.expo.dev/

---

**Last Updated**: November 4, 2025  
**Status**: Ready for Production ✅
