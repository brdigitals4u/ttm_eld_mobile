# Unified Analytics System

This document describes the new unified analytics system that consolidates Firebase Analytics, Sentry logging, and custom API calls into a single, easy-to-use interface.

## Overview

The `AnalyticsUtil` class provides a unified way to track user events across multiple analytics services:

- **Firebase Analytics**: For user behavior tracking and app analytics
- **Sentry**: For error tracking, performance monitoring, and breadcrumbs
- **Custom API**: For sending analytics data to your own backend

## Features

- ✅ **Single Method**: One `triggerUserEvent()` method handles all analytics services
- ✅ **Parallel Execution**: All analytics calls execute in parallel for better performance
- ✅ **Error Resilience**: Analytics failures don't break your app
- ✅ **Context Management**: Automatic context injection (user ID, session, timestamp, etc.)
- ✅ **Convenience Methods**: Pre-built methods for common use cases
- ✅ **Batch Tracking**: Send multiple events efficiently
- ✅ **Configurable**: Skip specific services or customize behavior per event
- ✅ **TypeScript**: Full type safety and intellisense

## Basic Usage

### Import the Analytics singleton

```typescript
import { Analytics } from '../utils/AnalyticsUtil';
```

### Basic event tracking

```typescript
// Simple event
await Analytics.triggerUserEvent('button_clicked', {
  button_name: 'login_button',
  screen: 'auth',
});

// With custom context
await Analytics.triggerUserEvent('user_action', {
  action: 'form_submit',
  form_name: 'registration',
}, {
  userId: 'user123',
  screen: 'register',
  feature: 'auth_flow',
});
```

## Using the React Context (Recommended)

### Import the context hook

```typescript
import { useAnalyticsContext } from '../context/analytics-context';
```

### In your component

```typescript
const MyComponent: React.FC = () => {
  const analytics = useAnalyticsContext();

  const handleButtonClick = async () => {
    await analytics.trackUserAction('tap', 'submit_button', {
      form_data: 'user_input',
    });
  };

  // Track screen view on mount
  useEffect(() => {
    analytics.trackScreenView('my_screen');
  }, []);
};
```

## Convenience Methods

### Screen Tracking
```typescript
await Analytics.trackScreenView('home_screen', {
  source: 'navigation',
  timestamp: Date.now(),
});
```

### User Actions
```typescript
await Analytics.trackUserAction('tap', 'menu_button', {
  menu_section: 'main',
});
```

### ELD Events
```typescript
await Analytics.trackELDEvent('connection_established', {
  device_id: 'ELD_12345',
  connection_type: 'bluetooth',
  signal_strength: -45,
});
```

### Bluetooth Events
```typescript
await Analytics.trackBluetoothEvent('device_discovered', {
  device_name: 'ELD Device',
  mac_address: '00:11:22:33:44:55',
});
```

### Error Tracking
```typescript
// With Error object
await Analytics.trackError(new Error('Connection failed'), {
  component: 'ELDService',
  retry_count: 3,
});

// With string
await Analytics.trackError('Validation failed', {
  field: 'email',
  value_length: 5,
});
```

### Performance Tracking
```typescript
const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

await Analytics.trackPerformance('data_sync', duration, {
  records_synced: 150,
  sync_type: 'incremental',
});
```

## Advanced Usage

### Skip Specific Services
```typescript
await Analytics.triggerUserEvent('debug_event', {
  debug_info: 'test_data',
}, {}, {
  skipFirebase: true,  // Don't send to Firebase
  skipSentry: false,   // Send to Sentry
  skipAPI: true,       // Don't send to API
  sentryLevel: 'debug',
});
```

### Batch Events
```typescript
await Analytics.trackBatch([
  {
    eventName: 'flow_step_1',
    parameters: { step: 1, data: 'value1' },
  },
  {
    eventName: 'flow_step_2',
    parameters: { step: 2, data: 'value2' },
  },
  {
    eventName: 'flow_completed',
    parameters: { total_steps: 2, duration: 5000 },
  },
]);
```

### Update Default Context
```typescript
// Set user context when user logs in
Analytics.updateDefaultContext({
  userId: user.id,
  userRole: user.role,
  carrierId: user.carrierId,
});

// All subsequent events will include this context automatically
```

### Environment-Specific API Endpoint
```typescript
const apiEndpoint = __DEV__
  ? 'https://dev-api.yourapp.com/analytics'
  : 'https://api.yourapp.com/analytics';

Analytics.setAPIEndpoint(apiEndpoint);
```

## Context Interface

### UserEventParams
Parameters that can be sent with any event:

```typescript
interface UserEventParams {
  [key: string]: string | number | boolean | undefined;
}
```

### UserEventContext
Context information automatically added to events:

```typescript
interface UserEventContext {
  userId?: string;           // Current user ID
  sessionId?: string;        // Session identifier
  screen?: string;           // Current screen/page
  feature?: string;          // Feature being used
  timestamp?: number;        // Event timestamp
  buildType?: 'debug' | 'release';
  platform?: string;        // Platform (mobile, web, etc.)
  appVersion?: string;       // App version
}
```

## Integration with Existing Services

### Firebase Analytics
- Events are sent using `FirebaseLogger.logEvent()`
- Important events trigger forced upload in release builds
- Automatic context injection (user ID, build type, etc.)

### Sentry
- Events create breadcrumbs for debugging context
- Important events are sent as messages
- Errors are captured with full context
- Configurable log levels (debug, info, warning, error)

### Custom API
- POST requests to configurable endpoint
- Full event payload with context
- Non-blocking failures in production
- Custom headers for app version and platform

## Error Handling

The analytics system is designed to be resilient:

- Analytics failures don't crash your app
- API failures are non-blocking in production
- All errors are logged to console and Sentry
- Failed events don't affect user experience

## Environment Configuration

Set your API endpoint using environment variables:

```bash
# .env file
EXPO_PUBLIC_ANALYTICS_API_URL=https://api.yourapp.com/analytics
```

## Migration from Old System

If you're migrating from the old analytics hooks:

1. Replace `useAnalytics()` with `useAnalyticsContext()`
2. Update method calls to use the new interface
3. Remove imports of the old `useAnalytics.ts` file
4. Update your context provider to use the new `AnalyticsProvider`

## Best Practices

1. **Use Context in Components**: Always use `useAnalyticsContext()` in React components
2. **Direct Usage for Services**: Use `Analytics` singleton in service classes or utilities
3. **Batch Related Events**: Use `trackBatch()` for multiple related events
4. **Set Context Early**: Update default context when user logs in or session changes
5. **Handle Errors Gracefully**: Analytics should never block user interactions
6. **Use Appropriate Methods**: Use specific methods (`trackELDEvent`, `trackError`) for better organization

## Performance Considerations

- All analytics calls are asynchronous and non-blocking
- Multiple services are called in parallel using `Promise.allSettled()`
- Failed API calls don't retry automatically (to avoid infinite loops)
- Console logging is disabled in production builds

## Testing

The analytics system is designed to work in development and testing environments:

- Set `skipAPI: true` to avoid API calls during testing
- Use `Analytics.updateDefaultContext()` to inject test data
- Monitor console output in development for debugging

## Troubleshooting

### Events not appearing in Firebase
- Check that Firebase is properly initialized
- Verify `FirebaseService.initFirebase()` is called on app start
- Important events trigger force upload - check console logs

### Sentry not receiving events
- Verify Sentry DSN is configured correctly
- Check `SentryService.initSentry()` is called on app start
- Ensure event names match your filtering criteria

### API calls failing
- Check network connectivity
- Verify API endpoint URL is correct
- Check API server logs for request details
- API failures are silent in production (check console in development)

## Support

For questions or issues:
1. Check console logs for error details
2. Verify service initialization
3. Test with skip options to isolate issues
4. Review examples in `AnalyticsUsageExamples.tsx`
