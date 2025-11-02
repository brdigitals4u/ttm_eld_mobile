# Dashboard API Documentation

**File:** `src/api/dashboard.ts`

## Overview

Dashboard data API module providing statistics, recent activity, and notifications. Uses React Query for data fetching with automatic caching and refetching.

## Features

- Dashboard statistics retrieval
- Recent activity tracking
- Notifications management
- Automatic data refresh intervals
- React Query integration with caching

## Data Types

### DashboardStats

Statistical overview of the dashboard:

```typescript
{
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalRevenue: number
  monthlyRevenue: number
  growthRate: number
}
```

### ActivityItem

Individual activity entry:

```typescript
{
  id: string
  type: 'login' | 'registration' | 'profile_update' | 'password_change'
  description: string
  timestamp: Date
  userId: string
  userEmail: string
}
```

### NotificationItem

Notification entry:

```typescript
{
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  timestamp: Date
  actionUrl?: string
}
```

## API Functions

### `dashboardApi.getStats()`

Fetches dashboard statistics.

**Returns:** Promise<DashboardStats>

**Throws:** ApiError on failure

**Example:**
```typescript
const stats = await dashboardApi.getStats()
console.log(`Total Users: ${stats.totalUsers}`)
console.log(`Growth Rate: ${stats.growthRate}%`)
```

### `dashboardApi.getRecentActivity()`

Fetches recent user activity.

**Returns:** Promise<ActivityItem[]>

**Throws:** ApiError on failure

**Example:**
```typescript
const activities = await dashboardApi.getRecentActivity()
activities.forEach(activity => {
  console.log(`${activity.type}: ${activity.description}`)
})
```

### `dashboardApi.getNotifications()`

Fetches user notifications.

**Returns:** Promise<NotificationItem[]>

**Throws:** ApiError on failure

**Example:**
```typescript
const notifications = await dashboardApi.getNotifications()
const unread = notifications.filter(n => !n.isRead)
```

## React Query Hooks

### `useDashboardStats()`

Query hook for dashboard statistics.

**Returns:** UseQueryResult<DashboardStats>

**Configuration:**
- Stale time: 2 minutes
- Refetch interval: 5 minutes (automatic background refresh)
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: stats, isLoading, error } = useDashboardStats()

if (isLoading) return <Loading />
if (error) return <Error message={error.message} />

return (
  <View>
    <Text>Total Users: {stats.totalUsers}</Text>
    <Text>Active Users: {stats.activeUsers}</Text>
  </View>
)
```

### `useRecentActivity()`

Query hook for recent activity.

**Returns:** UseQueryResult<ActivityItem[]>

**Configuration:**
- Stale time: 1 minute
- Refetch interval: 2 minutes (automatic background refresh)
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: activities, isLoading } = useRecentActivity()

return (
  <FlatList
    data={activities}
    renderItem={({ item }) => (
      <ActivityItem
        type={item.type}
        description={item.description}
        timestamp={item.timestamp}
      />
    )}
  />
)
```

### `useNotifications()`

Query hook for notifications.

**Returns:** UseQueryResult<NotificationItem[]>

**Configuration:**
- Stale time: 30 seconds
- Refetch interval: 1 minute (automatic background refresh)
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: notifications } = useNotifications()

const unreadCount = notifications?.filter(n => !n.isRead).length

return (
  <View>
    <Badge count={unreadCount} />
    {notifications?.map(notification => (
      <NotificationCard key={notification.id} {...notification} />
    ))}
  </View>
)
```

## Activity Types

Supported activity types:
- `login`: User login events
- `registration`: New user registrations
- `profile_update`: Profile modification events
- `password_change`: Password change events

## Notification Types

Supported notification types:
- `info`: Informational messages (blue)
- `warning`: Warning messages (yellow)
- `error`: Error messages (red)
- `success`: Success messages (green)

## Caching Strategy

1. **Stats**: Cached for 2 minutes, refetched every 5 minutes
2. **Activity**: Cached for 1 minute, refetched every 2 minutes
3. **Notifications**: Cached for 30 seconds, refetched every minute

This ensures fresh data while minimizing API calls.

## Error Handling

- All hooks prevent retries on 401 (authentication) errors
- Network errors are retried up to 3 times
- Errors are logged to console
- UI should handle loading and error states

## Dependencies

- `@tanstack/react-query`: React Query hooks
- `./client`: ApiClient and ApiError
- `./constants`: API endpoints and query keys

## Usage Tips

1. **Loading States**: Always check `isLoading` before rendering data
2. **Error States**: Handle `error` states gracefully
3. **Background Updates**: Data automatically refreshes in background
4. **Manual Refetch**: Use `refetch()` function for manual refresh
5. **Optimistic Updates**: Consider updating cache optimistically for better UX

