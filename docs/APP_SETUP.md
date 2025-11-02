# TTMKonnect App Setup

This document outlines the complete setup of the TTMKonnect React Native application with TanStack Query, Realm database, and authentication system.

## 📦 Dependencies Installed

### Core Libraries
- **@tanstack/react-query**: Data fetching, caching, and synchronization
- **realm**: Local database for offline storage
- **react-native-mmkv**: Fast key-value storage
- **date-fns**: Date manipulation and formatting

### Expo Modules
- **expo-secure-store**: Secure storage for sensitive data
- **expo-crypto**: Cryptographic functions
- **@react-native-async-storage/async-storage**: Async storage for non-sensitive data

## 🏗️ Project Structure

```
src/
├── api/                    # API layer
│   ├── constants.ts        # API endpoints, status codes, messages
│   ├── client.ts          # HTTP client with authentication
│   ├── auth.ts            # Authentication API hooks
│   ├── user.ts            # User profile API hooks
│   └── dashboard.ts       # Dashboard data API hooks
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── database/              # Realm database
│   ├── schemas.ts         # Database schemas
│   └── realm.ts          # Database configuration and service
├── providers/             # React providers
│   └── QueryProvider.tsx  # TanStack Query provider
├── screens/               # Application screens
│   ├── LoginScreen.tsx    # Login screen
│   ├── DashboardScreen.tsx # Dashboard screen
│   └── ProfileScreen.tsx  # Profile screen
├── utils/                 # Utility functions
│   └── storage.ts         # Storage utilities
└── app/                   # Expo Router pages
    ├── (tabs)/           # Tab navigation
    │   ├── _layout.tsx   # Tab layout
    │   ├── dashboard.tsx # Dashboard tab
    │   └── profile.tsx   # Profile tab
    ├── _layout.tsx       # Root layout with providers
    ├── index.tsx         # Main entry point
    └── login.tsx         # Login page
```

## 🔐 Authentication System

### Features
- **Login/Logout**: Secure authentication with token management
- **Persistent Sessions**: Tokens stored securely using Expo SecureStore
- **Auto-refresh**: Automatic token refresh before expiration
- **Offline Support**: User data cached in Realm database
- **Context-based**: Global authentication state management

### Authentication Flow
1. User enters credentials on login screen
2. API validates credentials and returns tokens
3. Tokens stored securely in device storage
4. User data cached in Realm database
5. Authentication context manages global state
6. Automatic navigation based on auth status

## 🗄️ Database (Realm)

### Schemas
- **User**: User profile information
- **AuthSession**: Authentication tokens and session data

### Features
- **Offline-first**: Data available without network
- **Automatic Sync**: Sync with API when online
- **Type-safe**: TypeScript interfaces for all data
- **CRUD Operations**: Complete create, read, update, delete operations

## 🔄 Data Management (TanStack Query)

### Features
- **Caching**: Intelligent data caching with configurable stale times
- **Background Updates**: Automatic data refetching
- **Optimistic Updates**: UI updates before server confirmation
- **Error Handling**: Comprehensive error handling and retry logic
- **Offline Support**: Works with cached data when offline

### Query Keys
- `['auth']` - Authentication state
- `['user', 'profile']` - User profile data
- `['dashboard', 'stats']` - Dashboard statistics
- `['dashboard', 'activity']` - Recent activity
- `['notifications']` - User notifications

## 📱 Screens

### 1. Login Screen (`LoginScreen.tsx`)
- Email and password input with validation
- Form error handling
- Loading states during authentication
- Navigation to registration (placeholder)

### 2. Dashboard Screen (`DashboardScreen.tsx`)
- Welcome message with user's name
- Dashboard statistics cards
- Recent activity feed
- Notifications list
- Pull-to-refresh functionality
- Logout button

### 3. Profile Screen (`ProfileScreen.tsx`)
- User avatar and basic information
- Editable profile fields
- Password change functionality
- Account deletion (danger zone)
- Form validation and error handling

## 🧭 Navigation

### Expo Router Setup
- **File-based routing**: Automatic route generation
- **Tab navigation**: Bottom tab bar for main app
- **Authentication routing**: Automatic redirects based on auth state
- **Deep linking**: Support for URL-based navigation

### Navigation Flow
1. **Unauthenticated**: Redirects to login screen
2. **Authenticated**: Redirects to dashboard tab
3. **Tab Navigation**: Dashboard and Profile tabs
4. **Logout**: Clears data and redirects to login

## 🔧 Configuration

### API Configuration
- **Base URL**: Configurable for development/production
- **Timeout**: 10 seconds for requests
- **Retry Logic**: 3 attempts with exponential backoff
- **Error Handling**: Comprehensive error messages

### Storage Configuration
- **Secure Storage**: For sensitive data (tokens)
- **Async Storage**: For non-sensitive data (preferences)
- **MMKV**: For TanStack Query persistence
- **Realm**: For offline data storage

## 🚀 Usage

### Starting the App
```bash
# Install dependencies
yarn install

# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### Authentication
1. App starts and checks for existing authentication
2. If authenticated, navigates to dashboard
3. If not authenticated, shows login screen
4. After successful login, navigates to dashboard
5. Logout clears all data and returns to login

### Data Fetching
- All API calls use TanStack Query hooks
- Data is automatically cached and synchronized
- Background updates keep data fresh
- Offline support with cached data

## 🔒 Security Features

- **Secure Token Storage**: Tokens stored using Expo SecureStore
- **Automatic Logout**: On token expiration
- **Input Validation**: Client-side validation for all forms
- **Error Handling**: Secure error messages without sensitive data exposure

## 📊 Performance Optimizations

- **Query Caching**: Intelligent caching reduces API calls
- **Background Sync**: Updates data in background
- **Optimistic Updates**: Immediate UI feedback
- **Efficient Re-renders**: Proper dependency arrays and memoization
- **Image Optimization**: Efficient image loading and caching

## 🧪 Testing Considerations

- **Mock API**: Easy to mock for testing
- **Offline Testing**: Test with network disabled
- **Error Scenarios**: Test error handling and retry logic
- **Authentication Flow**: Test login/logout scenarios

## 🔄 Future Enhancements

- **Push Notifications**: Real-time notifications
- **Biometric Authentication**: Fingerprint/face ID login
- **Dark Mode**: Theme switching
- **Internationalization**: Multi-language support
- **Real-time Sync**: WebSocket integration
- **Advanced Caching**: More sophisticated cache strategies

## 📝 API Integration

The app is designed to work with a REST API. Update the `API_CONFIG.BASE_URL` in `src/api/constants.ts` to point to your actual API endpoint.

### Required API Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `POST /user/change-password` - Change password
- `GET /dashboard/stats` - Dashboard statistics
- `GET /dashboard/activity` - Recent activity
- `GET /dashboard/notifications` - User notifications

This setup provides a solid foundation for a production-ready React Native application with authentication, offline support, and modern data management practices.
