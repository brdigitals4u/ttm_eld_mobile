# Chatwoot Integration Checklist

Complete this checklist to fully integrate Chatwoot into your app.

## Pre-Integration Setup

- [ ] **Chatwoot Server Running**
  - Verify: `http://213.210.13.196:8084` is accessible
  - Check Docker: `docker compose ps`

- [ ] **Get Website Token**
  - [ ] Login to Chatwoot dashboard
  - [ ] Navigate to Settings → Inboxes
  - [ ] Create new Website Inbox (or use existing)
  - [ ] Copy Website Token
  - [ ] Save token securely

## Code Integration

### Step 1: Add Provider
- [ ] Import `ChatSupportProvider` in `AllContextsProvider.tsx`
- [ ] Wrap `ChatSupportProvider` around your app
- [ ] Test app still runs without errors

### Step 2: Configure Token
- [ ] Option A: Set environment variable
  - [ ] Create `.env.local` or use existing
  - [ ] Add: `EXPO_PUBLIC_CHATWOOT_WEBSITE_TOKEN=your_token`
- [ ] Option B: Update config file
  - [ ] Edit `src/utils/chatwootConfig.ts`
  - [ ] Set `WEBSITE_TOKEN: 'your_token'`
  - [ ] Verify token is valid (not placeholder)

### Step 3: Choose Integration Location
- [ ] Decide where to add chat button:
  - [ ] More screen (recommended)
  - [ ] Header icon
  - [ ] Floating action button
  - [ ] Multiple locations

### Step 4: Add Chat Button
- [ ] Choose variant: icon / button / fab
- [ ] Copy example from `INTEGRATION_EXAMPLE.md`
- [ ] Import `ChatSupportButton` component
- [ ] Add to your chosen screen(s)
- [ ] Pass user data props:
  - [ ] `userId` (required)
  - [ ] `userName` (recommended)
  - [ ] `userEmail` (optional)
  - [ ] `customAttributes` (optional)

## Testing

### Basic Functionality
- [ ] Run app: `npm start`
- [ ] Navigate to screen with chat button
- [ ] Button is visible and clickable
- [ ] Button press opens chat screen
- [ ] Chat screen loads without errors

### Chat Widget
- [ ] WebView displays
- [ ] Loading indicator shows
- [ ] Chatwoot widget appears (bubble/expanded)
- [ ] Chat loads completely

### User Identification
- [ ] Login to Chatwoot admin
- [ ] Send test message from admin
- [ ] Message appears in app chat
- [ ] Driver info appears in Chatwoot inbox
- [ ] User name/email correct

### Message Flow
- [ ] Can send message from app
- [ ] Message appears in Chatwoot
- [ ] Admin can reply in Chatwoot
- [ ] Reply appears in app
- [ ] Message history preserved

### Custom Attributes
- [ ] Open chat from app
- [ ] Check Chatwoot contact details
- [ ] Custom attributes visible
- [ ] Values are correct

### Error Handling
- [ ] Test with invalid token
- [ ] Test with offline connection
- [ ] Error message displays
- [ ] App doesn't crash
- [ ] Can retry/go back

### UI Elements
- [ ] Badge shows unread count
- [ ] Loading spinner works
- [ ] All three button variants working (if added)
- [ ] Responsive on different screen sizes

## Production Checklist

### Security
- [ ] Token in environment variable (not hardcoded)
- [ ] `.env.local` added to `.gitignore`
- [ ] No secrets in git history
- [ ] Consider using `expo-secure-store` for token

### Performance
- [ ] App performance acceptable
- [ ] Chat loads in reasonable time
- [ ] No memory leaks
- [ ] Battery usage acceptable

### Documentation
- [ ] Team knows where chat code is
- [ ] API reference documented
- [ ] Troubleshooting guide reviewed
- [ ] Examples understood

### Deployment
- [ ] Build app for Android: `npm run build:android:prod`
- [ ] Build app for iOS: `npm run build:ios:prod`
- [ ] Test on real devices
- [ ] Verify chat works in production

## Documentation Review

- [ ] Read `CHATWOOT_QUICKSTART.md` ✓
- [ ] Read `CHATWOOT_INTEGRATION_GUIDE.md` ✓
- [ ] Read `INTEGRATION_EXAMPLE.md` ✓
- [ ] Understand architecture in `IMPLEMENTATION_SUMMARY.md` ✓

## Files Created (Verify All Present)

### Code Files
- [ ] `src/utils/chatwootConfig.ts`
- [ ] `src/contexts/ChatSupportContext.tsx`
- [ ] `src/hooks/useChatwootWebView.ts`
- [ ] `src/app/chat-support.tsx`
- [ ] `src/components/ChatSupportButton.tsx`

### Documentation Files
- [ ] `CHATWOOT_INTEGRATION_GUIDE.md`
- [ ] `CHATWOOT_QUICKSTART.md`
- [ ] `IMPLEMENTATION_SUMMARY.md`
- [ ] `INTEGRATION_EXAMPLE.md`
- [ ] `INTEGRATION_CHECKLIST.md` (this file)

## Troubleshooting

If something doesn't work, check:

1. **Token Issues**
   - [ ] Token is valid (not placeholder)
   - [ ] Token is correct format
   - [ ] Token not expired

2. **Connection Issues**
   - [ ] Chatwoot server running
   - [ ] Network connectivity OK
   - [ ] Firewall not blocking
   - [ ] CORS headers correct

3. **Code Issues**
   - [ ] Provider wrapping app
   - [ ] ChatSupportButton imported correctly
   - [ ] User data provided
   - [ ] No TypeScript errors

4. **Runtime Issues**
   - [ ] No console errors
   - [ ] WebView loads
   - [ ] JavaScript enabled
   - [ ] Permissions granted

## Common Tasks

### Update User Data After Login
```typescript
const { setUser } = useChatSupport();
const { user } = useAuth();

useEffect(() => {
  if (user) {
    setUser({
      identifier: user.id,
      name: user.name,
      email: user.email,
      customAttributes: { /* your attributes */ }
    });
  }
}, [user]);
```

### Add Multiple Button Locations
```typescript
// Header
headerRight: () => <ChatSupportButton variant="icon" {...props} />

// Menu
<ChatSupportButton variant="button" {...props} />

// Bottom Sheet
<ChatSupportButton variant="fab" {...props} />
```

### Clear Chat on Logout
```typescript
const { clearUser } = useChatSupport();

const handleLogout = () => {
  clearUser(); // Clear chat data
  // ... other logout logic
};
```

## Performance Tips

1. **Lazy load chat screen**
   - Use `React.lazy()` for chat-support.tsx
   - Load only when needed

2. **Memoize button component**
   - Prevents unnecessary re-renders
   - Better performance

3. **Optimize custom attributes**
   - Don't send huge objects
   - Only necessary data

4. **Monitor WebView performance**
   - Check app performance metrics
   - Profile with React Native Debugger

## Support Resources

| Resource | Link |
|----------|------|
| Chatwoot Docs | https://www.chatwoot.com/docs/ |
| React Native WebView | https://github.com/react-native-webview/react-native-webview |
| Expo Documentation | https://docs.expo.dev/ |
| TypeScript Handbook | https://www.typescriptlang.org/docs/ |

## Final Steps

1. **Before Committing**
   - [ ] Run linter: `npm run lint`
   - [ ] Check types: `npm run compile`
   - [ ] Test app works: `npm start`

2. **Before Pushing**
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] No console warnings
   - [ ] Checklist complete

3. **Before Deploying**
   - [ ] Tested on real device
   - [ ] Performance acceptable
   - [ ] Security review done
   - [ ] Team notified

## Sign Off

- **Integration Date**: _______________
- **Tested By**: _______________
- **Approved By**: _______________
- **Deployed Date**: _______________

---

## Quick Command Reference

```bash
# Development
npm start                    # Start dev server
npm run android             # Run on Android
npm run ios                 # Run on iOS

# Testing
npm run lint               # Run linter
npm run compile            # Check types
npm test                   # Run tests

# Building
npm run build:android:prod # Build Android APK
npm run build:ios:prod     # Build iOS

# Debugging
npm run test:watch         # Watch tests
# Use React Native Debugger for WebView inspection
```

---

**Ready to integrate Chatwoot?** ✅

Follow this checklist step-by-step for a smooth integration!

**Estimated Time**: 30-60 minutes  
**Difficulty**: Easy-Medium  
**Support**: See documentation files
