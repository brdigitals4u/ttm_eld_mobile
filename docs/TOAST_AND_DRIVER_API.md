# Toast Notifications & Organization Driver API Integration

This document outlines the implementation of custom toast notifications using React Native Paper and the integration of the Organization Driver Login API.

## 🍞 Toast Notification System

### Features
- **Custom Design**: Built with React Native Paper components for consistent theming
- **Multiple Types**: Success, Warning, Error, and Info notifications
- **Smooth Animations**: Slide-in/slide-out animations using React Native Animated API
- **Auto-dismiss**: Configurable auto-dismiss duration (default: 4 seconds)
- **Manual Dismiss**: Users can manually close toasts with the close button
- **Position Control**: Can be positioned at top or bottom of screen
- **Global Management**: Toast manager for app-wide toast control
- **TypeScript Support**: Fully typed with TypeScript interfaces

### Components

#### Toast Component (`src/components/Toast.tsx`)
```typescript
interface ToastProps {
  visible: boolean
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
  onDismiss: () => void
  position?: 'top' | 'bottom'
}
```

**Features:**
- Material Design-inspired styling
- Icon integration with react-native-vector-icons
- Theme-aware colors (light/dark mode support)
- Smooth entrance/exit animations
- Configurable duration and position

#### Toast Provider (`src/providers/ToastProvider.tsx`)
- Global toast state management
- Toast subscription system
- Easy-to-use hook for components

#### Toast Manager
```typescript
// Usage examples
toast.success('Operation completed successfully!')
toast.warning('Please check your input')
toast.error('Something went wrong')
toast.info('New data available')
```

### Integration

#### 1. Provider Setup
The `ToastProvider` is integrated into the main app layout:
```typescript
<ToastProvider>
  <KeyboardProvider>
    <Slot />
  </KeyboardProvider>
</ToastProvider>
```

#### 2. Hook Usage
```typescript
import { useToast } from '@/providers/ToastProvider'

const { toast } = useToast()

// Show success toast
toast.success('Profile updated successfully', 3000)

// Show error toast
toast.error('Login failed', 4000)
```

### Toast Types and Colors

| Type | Background | Border | Text | Icon |
|------|------------|--------|------|------|
| Success | `success100` | `success500` | `success900` | `check-circle` |
| Warning | `warning100` | `warning500` | `warning900` | `alert-circle` |
| Error | `angry100` | `angry500` | `angry900` | `close-circle` |
| Info | `neutral100` | `neutral500` | `neutral900` | `information` |

## 🚛 Organization Driver API Integration

### API Endpoint
**POST** `/organization/drivers/login/`

### Request Schema
```typescript
interface OrganizationDriverLoginCredentials {
  email: string
  password: string
}
```

### Response Schema
```typescript
interface OrganizationDriverAuthResponse {
  driver: OrganizationDriverProfile
  token: string
  expiresAt: Date
  organization: {
    id: string
    name: string
    settings: Record<string, any>
  }
}

interface OrganizationDriverProfile {
  _id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateOfBirth?: Date
  avatar?: string
  isEmailVerified: boolean
  organizationId: string
  organizationName: string
  role: 'driver'
  status: 'active' | 'inactive' | 'suspended'
  licenseNumber?: string
  licenseExpiry?: Date
  createdAt: Date
  updatedAt: Date
}
```

### API Implementation (`src/api/organization.ts`)

#### Features
- **Dual Authentication**: Supports both regular user login and driver login
- **Fallback Strategy**: If driver login fails, falls back to regular login
- **Token Management**: Secure token storage using Expo SecureStore
- **Offline Support**: Driver data cached in Realm database
- **Error Handling**: Comprehensive error handling with user-friendly messages

#### React Query Hooks
```typescript
// Driver login
const driverLoginMutation = useDriverLogin()

// Get driver profile
const { data: driverProfile } = useDriverProfile()

// Driver logout
const driverLogoutMutation = useDriverLogout()
```

### Login Flow

1. **Driver Login Attempt**: App first tries Organization Driver Login API
2. **Success Path**: If successful, driver data is stored and user is authenticated
3. **Fallback Path**: If driver login fails, app tries regular user login
4. **Error Handling**: Appropriate error messages shown via toast notifications

### Authentication Strategy

The app implements a dual authentication system:

```typescript
// Login screen implementation
const handleLogin = async () => {
  try {
    // Try driver login first
    const driverResult = await driverLoginMutation.mutateAsync(credentials)
    if (driverResult) {
      login(userProfile)
      toast.success(`Welcome back, ${userProfile.firstName}!`, 3000)
      return
    }
  } catch (driverError) {
    // Fallback to regular login
    try {
      const result = await loginMutation.mutateAsync(credentials)
      if (result) {
        login(result.user)
        toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS, 3000)
      }
    } catch (error) {
      toast.error(errorMessage, 4000)
    }
  }
}
```

## 🔧 Configuration

### API Endpoints
Updated in `src/api/constants.ts`:
```typescript
export const API_ENDPOINTS = {
  // Organization Driver Authentication
  ORGANIZATION: {
    DRIVER_LOGIN: '/organization/drivers/login',
    DRIVER_PROFILE: '/organization/drivers/profile',
    DRIVER_LOGOUT: '/organization/drivers/logout',
  },
  // ... existing endpoints
}
```

### Error Messages
```typescript
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  // ... more error messages
}
```

## 📱 User Experience Improvements

### Toast Notifications Replace Alerts
- **Before**: Native Alert dialogs that block interaction
- **After**: Non-intrusive toast notifications with smooth animations

### Enhanced Login Experience
- **Dual Authentication**: Seamless fallback between driver and regular login
- **Personalized Messages**: Welcome messages with user's first name
- **Visual Feedback**: Loading states and success/error indicators

### Consistent Error Handling
- **Unified Error Messages**: Consistent error messaging across the app
- **User-Friendly**: Clear, actionable error messages
- **Non-Blocking**: Errors don't interrupt user flow

## 🎨 Design Integration

### Theme Integration
- **Light/Dark Mode**: Toast colors adapt to current theme
- **Material Design**: Consistent with React Native Paper design system
- **Accessibility**: High contrast colors and clear typography

### Animation System
- **Smooth Transitions**: 300ms slide animations
- **Native Performance**: Uses native driver for smooth performance
- **Gesture Support**: Manual dismiss with close button

## 🧪 Testing Considerations

### Toast Testing
- **Visibility States**: Test show/hide animations
- **Auto-dismiss**: Verify timing and cleanup
- **Manual Dismiss**: Test close button functionality
- **Multiple Toasts**: Ensure proper stacking behavior

### API Testing
- **Driver Login**: Test successful driver authentication
- **Fallback Login**: Test regular login fallback
- **Error Scenarios**: Test various error conditions
- **Token Management**: Verify secure token storage

## 🚀 Usage Examples

### Basic Toast Usage
```typescript
import { useToast } from '@/providers/ToastProvider'

const MyComponent = () => {
  const toast = useToast()

  const handleSuccess = () => {
    toast.success('Operation completed!', 3000)
  }

  const handleError = () => {
    toast.error('Something went wrong', 4000)
  }

  return (
    // Your component JSX
  )
}
```

### Driver Login Usage
```typescript
import { useDriverLogin } from '@/api/organization'

const LoginComponent = () => {
  const driverLoginMutation = useDriverLogin()

  const handleDriverLogin = async (credentials) => {
    try {
      const result = await driverLoginMutation.mutateAsync(credentials)
      // Handle successful login
    } catch (error) {
      // Handle login error
    }
  }
}
```

## 📋 API Response Examples

### Successful Driver Login
```json
{
  "success": true,
  "data": {
    "driver": {
      "_id": "64a1b2c3d4e5f6789abcdef0",
      "email": "driver@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "organizationId": "org123",
      "organizationName": "ABC Transport",
      "role": "driver",
      "status": "active",
      "licenseNumber": "DL123456789",
      "isEmailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T12:00:00Z",
    "organization": {
      "id": "org123",
      "name": "ABC Transport",
      "settings": {}
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid email or password",
  "status": 401
}
```

This implementation provides a robust, user-friendly authentication system with beautiful toast notifications that enhance the overall user experience while maintaining security and reliability.
