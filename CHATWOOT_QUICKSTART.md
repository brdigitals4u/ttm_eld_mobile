# Chatwoot Quick Start Guide

Fast 5-minute setup to add chat support to your mobile app.

## 1. Add Provider to App

Update `src/contexts/AllContextsProvider.tsx`:

```typescript
import { ChatSupportProvider } from './ChatSupportContext';

export const AllContextsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ChatSupportProvider>
      {/* Your other providers */}
      {children}
    </ChatSupportProvider>
  );
};
```

## 2. Get Website Token

1. Open Chatwoot: http://213.210.13.196:8084
2. Settings → Inboxes → Add Inbox → Website
3. Copy the website token
4. Paste in `src/utils/chatwootConfig.ts` or `.env.local`

## 3. Add Chat Button (Easiest Way)

Add to your "More" or "Menu" screen (`src/app/more.tsx`):

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';
import { useAuth } from '../contexts/AuthContext'; // or your auth context

export default function MoreScreen() {
  const { user } = useAuth(); // Get current user
  
  return (
    <ScrollView>
      {/* Your existing menu items */}
      
      <ChatSupportButton 
        variant="button"
        label="Contact Support"
        userId={user?.id}
        userName={user?.name}
        userEmail={user?.email}
        customAttributes={{
          role: 'driver',
          app_version: '1.0.1',
        }}
      />
    </ScrollView>
  );
}
```

## 4. Or Add as Header Icon

In any screen:

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';
import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

export default function MyScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ChatSupportButton 
          variant="icon"
          userId={user?.id}
          userName={user?.name}
        />
      ),
    });
  }, [user]);
  
  return <View>{/* Your screen content */}</View>;
}
```

## 5. Or Add as Floating Action Button

```typescript
import { ChatSupportButton } from '../components/ChatSupportButton';

export default function DashboardScreen() {
  const { user } = useAuth();
  
  return (
    <View style={styles.container}>
      {/* Your dashboard content */}
      
      <ChatSupportButton 
        variant="fab"
        userId={user?.id}
        userName={user?.name}
      />
    </View>
  );
}
```

## That's it! 🎉

The chat button will:
- ✅ Open chat screen when pressed
- ✅ Auto-identify the driver
- ✅ Show unread message count
- ✅ Handle all errors gracefully

## Button Variants

### Icon (small, fits in header/tab bar)
```typescript
<ChatSupportButton variant="icon" size="small" />
```

### Button (full width button with label)
```typescript
<ChatSupportButton 
  variant="button" 
  label="Contact Support"
  size="medium"
/>
```

### FAB (floating action button, bottom-right)
```typescript
<ChatSupportButton variant="fab" size="large" />
```

## Advanced: Custom Attributes

Add driver info for better support:

```typescript
<ChatSupportButton 
  variant="button"
  userId={driver.id}
  userName={driver.name}
  userEmail={driver.email}
  customAttributes={{
    vehicle_id: 'V-123456',
    vehicle_type: 'truck',
    license_type: 'CDL',
    status: 'on_duty',
    current_city: 'New York',
    trips_completed: 1523,
  }}
/>
```

These appear in Chatwoot under contact details → custom attributes.

## Troubleshooting

**Chat not loading?**
- Check website token in config
- Verify Chatwoot server is running: `docker compose ps`

**User not showing up?**
- Ensure `userId` prop is provided
- Check unique identifier

**Messages not appearing?**
- Verify inbox is active in Chatwoot settings
- Check console for JS errors

## Full Setup Documentation

See `CHATWOOT_INTEGRATION_GUIDE.md` for complete details.

---

That's all! Your drivers can now chat with support. 💬
