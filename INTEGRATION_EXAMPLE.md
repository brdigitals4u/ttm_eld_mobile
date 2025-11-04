# Integration Example - Adding Chat Support to More Screen

This example shows how to integrate the Chatwoot chat button into your existing app screens.

## Example 1: Add to More Screen (Recommended)

Update `src/app/more.tsx`:

```typescript
import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import the chat button component
import { ChatSupportButton } from '../components/ChatSupportButton';

// Import your auth or user context
import { useAuth } from '../contexts/AuthContext'; // or your auth context

const MoreScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth(); // Get current logged-in user

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Your existing menu items */}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="account" size={24} color="#4338CA" />
          <Text style={styles.menuItemText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="cog" size={24} color="#4338CA" />
          <Text style={styles.menuItemText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Support Section - Add this */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        {/* This is the chat support button */}
        <View style={styles.chatButtonWrapper}>
          <ChatSupportButton 
            variant="button"
            label="Contact Support"
            size="medium"
            userId={user?.id || 'guest'}
            userName={user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user?.email}
            userEmail={user?.email}
            customAttributes={{
              user_role: 'driver',
              app_version: '1.0.1',
              status: user?.status || 'active',
              carrier_name: user?.carrier?.name,
              vehicle_id: user?.vehicle?.id,
              license_number: user?.licenseNumber,
            }}
          />
        </View>
      </View>

      {/* Your other menu items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialCommunityIcons name="information" size={24} color="#4338CA" />
          <Text style={styles.menuItemText}>About App</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  chatButtonWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

export default MoreScreen;
```

## Example 2: Add Chat Icon to Header

Update your dashboard or main screen:

```typescript
import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChatSupportButton } from '../components/ChatSupportButton';
import { useAuth } from '../contexts/AuthContext';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      // ... other options
      headerRight: () => (
        <ChatSupportButton 
          variant="icon"
          size="medium"
          userId={user?.id}
          userName={user?.firstName}
        />
      ),
    });
  }, [user, navigation]);

  return (
    <View style={{ flex: 1 }}>
      {/* Your dashboard content */}
    </View>
  );
};

export default DashboardScreen;
```

## Example 3: Add as Floating Action Button

```typescript
import React from 'react';
import { View } from 'react-native';
import { ChatSupportButton } from '../components/ChatSupportButton';
import { useAuth } from '../contexts/AuthContext';

const TripScreen = () => {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1 }}>
      {/* Your trip content */}
      
      {/* Floating action button */}
      <ChatSupportButton 
        variant="fab"
        size="large"
        userId={user?.id}
        userName={user?.name}
      />
    </View>
  );
};

export default TripScreen;
```

## Example 4: Manual Chat Control

If you want more control over when/how the chat opens:

```typescript
import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useChatSupport } from '../contexts/ChatSupportContext';
import { useAuth } from '../contexts/AuthContext';

const CustomChatExample = () => {
  const router = useRouter();
  const chatSupport = useChatSupport();
  const { user } = useAuth();

  const handleOpenChat = useCallback(() => {
    // 1. Set user data
    chatSupport.setUser({
      identifier: user?.id || 'guest',
      name: `${user?.firstName} ${user?.lastName}`,
      email: user?.email,
      phone: user?.phone,
      customAttributes: {
        vehicle_type: user?.vehicle?.type,
        cargo_type: 'general',
        current_location: 'Highway I-95',
        issue_type: 'urgent_support',
      },
    });

    // 2. Navigate to chat screen
    router.push('/chat-support');
  }, [user, chatSupport, router]);

  return (
    <TouchableOpacity 
      style={{ 
        backgroundColor: '#4338CA', 
        padding: 16, 
        borderRadius: 8 
      }}
      onPress={handleOpenChat}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>
        {chatSupport.isLoading ? 'Loading Chat...' : 'Chat with Support'}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomChatExample;
```

## Setup Step by Step

### Step 1: Install Provider (if not already done)

Update `src/contexts/AllContextsProvider.tsx`:

```typescript
import { ChatSupportProvider } from './ChatSupportContext';

export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ChatSupportProvider>
      <YourOtherProviders>
        {children}
      </YourOtherProviders>
    </ChatSupportProvider>
  );
};
```

### Step 2: Configure Website Token

Get your token from Chatwoot:
1. Login: http://213.210.13.196:8084
2. Settings → Inboxes → Create Website Inbox
3. Copy the website token

Update `src/utils/chatwootConfig.ts`:

```typescript
export const CHATWOOT_CONFIG = {
  // ... other config
  WEBSITE_TOKEN: 'YOUR_ACTUAL_TOKEN_HERE',
  // or use environment variable:
  // WEBSITE_TOKEN: process.env.EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN,
};
```

### Step 3: Add to Your Screen

Pick one of the examples above and integrate into your screen.

### Step 4: Test

1. Run your app
2. Navigate to the screen with the chat button
3. Click the button
4. Chat screen should open
5. Test sending a message
6. Verify it appears in Chatwoot admin panel

## User Data Structure

When setting user data, include as much info as possible:

```typescript
chatSupport.setUser({
  // Required
  identifier: 'driver_123',      // Must be unique per driver
  
  // Optional but recommended
  name: 'John Doe',              // Driver name
  email: 'john@example.com',     // Email
  phone: '+1-555-0100',          // Phone number
  
  // Custom attributes (optional)
  customAttributes: {
    // Vehicle info
    vehicle_id: 'V-12345',
    vehicle_type: 'truck',
    vehicle_vin: 'ABC123XYZ456',
    
    // Driver info
    license_number: 'A1234567',
    license_type: 'CDL',
    driver_status: 'active',
    years_experience: 5,
    
    // Trip info
    current_trip_id: 'T-98765',
    current_location: 'New York, NY',
    destination: 'Boston, MA',
    cargo_type: 'electronics',
    
    // Account info
    carrier_name: 'ABC Trucking',
    subscription_tier: 'premium',
    account_status: 'active',
  },
});
```

## Button Variants Reference

### Icon (for headers/tab bars)
```typescript
<ChatSupportButton 
  variant="icon"
  size="small"  // 20px icon
/>
```

### Button (for menus/screens)
```typescript
<ChatSupportButton 
  variant="button"
  label="Contact Support"
  size="medium"  // 24px icon
/>
```

### FAB (floating action button)
```typescript
<ChatSupportButton 
  variant="fab"
  size="large"  // 32px icon
/>
```

## Styling

The chat button comes with default styling. To customize:

1. **Colors**: Edit `ChatSupportButton.tsx` styles
2. **Size**: Use `size` prop (small, medium, large)
3. **Label**: Use `label` prop (for button variant)

## Error Handling

The component handles:
- ✅ Missing website token
- ✅ Network errors
- ✅ WebView errors
- ✅ Loading states

Users will see friendly error messages if something goes wrong.

## Unread Message Badge

The button automatically shows unread message count:

```
🔔
Badge shows "3" if 3 unread messages
Badge shows "9+" if 10+ unread messages
```

## Next Steps

1. Choose which screen to add the button to
2. Copy the example code
3. Update user data with your app's user info
4. Test in development
5. Deploy!

---

For complete documentation, see `CHATWOOT_INTEGRATION_GUIDE.md`
