# Troubleshooting: Chatwoot SDK Failed to Load

## Quick Fix Applied ✅

1. **Changed BASE_URL from HTTPS to HTTP** - `https://` → `http://`
2. **Fixed URL reference in HTML** - Properly embedded server URL
3. **Website token is configured** - `S6Mz2mJKTm9poMN9ap5njB6f`

## Before Testing

**Verify Chatwoot Server is Running:**

```bash
# Check if Chatwoot is accessible
curl http://213.210.13.196:8084

# Should return HTML (not connection refused)
```

If it's not running, start it:
```bash
cd /path/to/chatwoot
docker compose up -d
```

## Testing the Chat

1. **Start the app**:
   ```bash
   npm start -- --clear
   ```

2. **Navigate to Chat Screen**:
   - Find the chat button in your app
   - Click it to open the chat screen

3. **Expected Behavior**:
   - Loading indicator appears
   - Chatwoot widget loads (bubble or expanded view)
   - Chat is ready to use

## If Chat Still Doesn't Load

### Issue 1: "Configuration Required" Message
**Problem**: Website token not found or invalid

**Solution**:
```typescript
// Check src/utils/chatwootConfig.ts
WEBSITE_TOKEN: 'S6Mz2mJKTm9poMN9ap5njB6f' // Should be set
```

### Issue 2: WebView Blank/White Screen
**Problem**: Server not reachable or CORS issue

**Solution**:
1. Verify server is running: `curl http://213.210.13.196:8084`
2. Check network - ensure machine can reach server IP
3. Try with `http://localhost:8084` if on same machine

### Issue 3: "Cannot read properties of undefined (reading 'get')"
**Problem**: Metro bundler cache corrupted

**Solution**:
```bash
rm -rf .expo node_modules/.cache
npm start -- --clear
```

### Issue 4: User Not Identified
**Problem**: User data not being sent

**Solution**:
```typescript
// Make sure to pass userId when opening chat
<ChatSupportButton 
  variant="button"
  userId={user.id}  // Required!
  userName={user.name}
/>
```

## Network Troubleshooting

### Check if server is accessible:
```bash
# From your machine
curl -v http://213.210.13.196:8084/packs/js/sdk.js

# Should download the file, not show connection error
```

### Check WebView network settings:
- Android: Settings → Developer → Network profiler
- iOS: Xcode → Debug → Network Link Conditioner

## Debug Mode

Enable debug logging in config:
```typescript
// src/utils/chatwootConfig.ts
DEBUG: true  // Always enabled in development
```

Check browser console (React Native Debugger) for logs.

## Contact Support

**Chatwoot Server**: http://213.210.13.196:8084
**Admin Panel**: http://213.210.13.196:8084
**Check Logs**:
```bash
docker compose logs -f chatwoot
```

## Common Server Issues

### Port 8084 Already in Use
```bash
# Kill process on port 8084
lsof -ti:8084 | xargs kill -9

# Then restart Chatwoot
docker compose up -d
```

### Database Connection Failed
```bash
# Check Docker containers
docker compose ps

# Should show postgres and chatwoot running
```

### Firewall Blocking Connection
- Ensure 8084 is accessible from your network
- Check firewall rules
- Try connecting with browser first: http://213.210.13.196:8084

## Step-by-Step Debug

1. **Verify Server**:
   ```bash
   curl http://213.210.13.196:8084
   ```

2. **Check Token**:
   ```bash
   # Token should be valid in Chatwoot
   # Settings → Inboxes → Website Inbox
   ```

3. **Test HTML Directly**:
   - Copy generated HTML from WebView
   - Open in browser
   - Check console for errors

4. **Check Network Tab**:
   - React Native Debugger → Network
   - Look for failed requests to `/packs/js/sdk.js`

## Success Indicators

✅ Loading spinner shows  
✅ Chatwoot bubble appears  
✅ Can type messages  
✅ Messages appear in admin panel  
✅ Can receive replies  

---

**Need help?** Check the server is running, then restart with `npm start -- --clear`
