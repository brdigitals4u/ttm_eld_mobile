# Package.json Documentation

**File:** `package.json`

## Overview

Main package configuration file for the TTM Konnect ELD Mobile application. Defines dependencies, scripts, project metadata, and build configurations.

## Project Information

- **Name:** `ttm-konnect-bind`
- **Version:** `0.0.1`
- **Private:** `true`
- **Main Entry:** `expo-router/entry`
- **Node Version:** `>=20.0.0`

## Scripts

### Development Scripts

- **`start`**: Start Expo development server with dev client
  ```bash
  npm run start
  ```

- **`android`**: Run Android app
  ```bash
  npm run android
  ```

- **`ios`**: Run iOS app
  ```bash
  npm run ios
  ```

- **`web`**: Start web version
  ```bash
  npm run web
  ```

### Build Scripts

#### iOS Builds
- **`build:ios:sim`**: Build iOS simulator (development, local)
- **`build:ios:dev`**: Build iOS device (development, local)
- **`build:ios:preview`**: Build iOS preview (local)
- **`build:ios:prod`**: Build iOS production (local)

#### Android Builds
- **`build:android:sim`**: Build Android simulator (development, local)
- **`build:android:dev`**: Build Android device (development, local)
- **`build:android:preview`**: Build Android preview (local)
- **`build:android:prod`**: Build Android production (local)
- **`build:android:prod:apk`**: Build Android production APK (local)

### Utility Scripts

- **`compile`**: TypeScript type checking
  ```bash
  npm run compile
  ```

- **`lint`**: Run ESLint with auto-fix
  ```bash
  npm run lint
  ```

- **`lint:check`**: Run ESLint without fixing
  ```bash
  npm run lint:check
  ```

- **`test`**: Run Jest tests
  ```bash
  npm run test
  ```

- **`test:watch`**: Run Jest in watch mode
  ```bash
  npm run test:watch
  ```

- **`align-deps`**: Fix Expo dependency versions
  ```bash
  npm run align-deps
  ```

- **`prebuild:clean`**: Clean prebuild (regenerate native projects)
  ```bash
  npm run prebuild:clean
  ```

- **`bundle:web`**: Bundle web version
  ```bash
  npm run bundle:web
  ```

- **`serve:web`**: Serve bundled web version
  ```bash
  npm run serve:web
  ```

- **`adb`**: Setup Android ADB port forwarding
  ```bash
  npm run adb
  ```
  Forwards ports: 9090, 3000, 9001, 8081

- **`test:maestro`**: Run Maestro end-to-end tests
  ```bash
  npm run test:maestro
  ```

## Dependencies

### Core Framework

- **`expo`**: `^53.0.15` - Expo SDK
- **`react`**: `19.0.0` - React library
- **`react-native`**: `0.79.6` - React Native framework
- **`react-dom`**: `19.0.0` - React DOM for web

### Navigation & Routing

- **`expo-router`**: `~5.1.6` - File-based routing
- **`@react-navigation/native`**: `^7.0.14` - Navigation library
- **`@react-navigation/native-stack`**: `^7.2.0` - Stack navigator

### State Management

- **`zustand`**: `^5.0.8` - Lightweight state management
- **`@tanstack/react-query`**: `^5.89.0` - Data fetching and caching

### UI Components & Styling

- **`react-native-paper`**: `^5.14.5` - Material Design components
- **`react-native-vector-icons`**: `^10.3.0` - Icon library
- **`lucide-react-native`**: `^0.544.0` - Icon set
- **`react-native-svg`**: `^15.11.2` - SVG support
- **`expo-linear-gradient`**: `~14.1.5` - Gradient components
- **`lottie-react-native`**: `^7.3.4` - Lottie animations

### Data Visualization

- **`victory`**: `^37.3.6` - Charting library
- **`victory-native`**: `^41.20.1` - Victory for React Native
- **`react-native-chart-kit`**: `^6.12.0` - Chart components
- **`@shopify/react-native-skia`**: `^2.2.18` - 2D graphics

### Storage & Persistence

- **`@react-native-async-storage/async-storage`**: `^2.1.2` - Async storage
- **`expo-secure-store`**: `~14.2.4` - Secure storage
- **`react-native-mmkv`**: `^3.3.3` - Fast key-value storage
- **`realm`**: `^20.2.0` - Realm database

### Networking

- **`apisauce`**: `3.1.1` - API client

### Location & Permissions

- **`expo-location`**: `~18.1.6` - Location services

### Internationalization

- **`i18next`**: `25.4.2` - i18n framework
- **`react-i18next`**: `15.7.2` - React i18n
- **`expo-localization`**: `~16.1.5` - Locale detection
- **`intl-pluralrules`**: `^2.0.1` - Pluralization

### Animations & Gestures

- **`react-native-reanimated`**: `~3.17.4` - Animation library
- **`react-native-gesture-handler`**: `~2.24.0` - Gesture handling
- **`react-native-drawer-layout`**: `^4.0.1` - Drawer component

### Utilities

- **`date-fns`**: `^4.1.0` - Date manipulation
- **`expo-crypto`**: `~14.1.5` - Cryptographic functions
- **`expo-font`**: `~13.3.0` - Font loading
- **`expo-linking`**: `~7.1.4` - Deep linking
- **`expo-splash-screen`**: `~0.30.9` - Splash screen
- **`react-native-edge-to-edge`**: `1.6.0` - Edge-to-edge UI
- **`react-native-keyboard-controller`**: `^1.12.7` - Keyboard handling
- **`react-native-progress`**: `^5.0.1` - Progress indicators
- **`react-native-toast-message`**: `^2.3.3` - Toast notifications
- **`react-native-screens`**: `~4.11.1` - Native screens
- **`react-native-safe-area-context`**: `5.4.0` - Safe area handling
- **`expo-system-ui`**: `~5.0.9` - System UI controls
- **`expo-svg`**: `^0.0.0` - SVG utilities
- **`@expo/metro-runtime`**: `~5.0.4` - Metro runtime
- **`@nkzw/create-context-hook`**: `^1.1.0` - Context utilities

### Expo Plugins

- **`expo-build-properties`**: `~0.14.6` - Build configuration
- **`expo-dev-client`**: `~5.2.1` - Development client

## Dev Dependencies

### TypeScript

- **`typescript`**: `~5.8.3` - TypeScript compiler
- **`@types/react`**: `~19.0.10` - React types
- **`@types/jest`**: `^29.5.14` - Jest types
- **`@types/react-native-vector-icons`**: `^6.4.18` - Vector icons types

### Build Tools

- **`@babel/core`**: `^7.20.0` - Babel compiler
- **`@babel/preset-env`**: `^7.20.0` - Babel preset
- **`@babel/runtime`**: `^7.20.0` - Babel runtime

### Testing

- **`jest`**: `~29.7.0` - Testing framework
- **`jest-expo`**: `~53.0.7` - Expo Jest preset
- **`ts-jest`**: `^29.1.1` - TypeScript Jest transformer
- **`babel-jest`**: `^29.2.1` - Babel Jest transformer
- **`react-test-renderer`**: `19.0.0` - React test renderer
- **`@testing-library/react-native`**: `^13.2.0` - Testing utilities

### Code Quality

- **`eslint`**: `^8.57.0` - Linter
- **`eslint-config-expo`**: `~9.2.0` - Expo ESLint config
- **`eslint-config-prettier`**: `^9.1.0` - Prettier ESLint config
- **`eslint-plugin-prettier`**: `^5.2.1` - Prettier ESLint plugin
- **`eslint-plugin-react-native`**: `^4.1.0` - React Native ESLint rules
- **`prettier`**: `^3.3.3` - Code formatter

### Development Tools

- **`reactotron-core-client`**: `^2.9.4` - Reactotron client
- **`reactotron-react-js`**: `^3.3.11` - Reactotron React integration
- **`reactotron-react-native`**: `^5.0.5` - Reactotron RN integration
- **`reactotron-react-native-mmkv`**: `^0.2.6` - Reactotron MMKV plugin
- **`eslint-plugin-reactotron`**: `^0.1.2` - Reactotron ESLint plugin
- **`ts-node`**: `^10.9.2` - TypeScript execution
- **`ora`**: `^6.3.1` - Terminal spinner

## Package Manager

The project uses **pnpm** (indicated by `pnpm-lock.yaml` file).

## Key Technologies

1. **Expo SDK 53**: Cross-platform mobile development
2. **React Native 0.79.6**: Mobile framework
3. **React 19**: UI library
4. **Expo Router**: File-based routing
5. **Zustand**: State management
6. **TanStack Query**: Server state management
7. **Realm**: Local database
8. **TypeScript**: Type safety

## Notes

- React 19 is used (latest version)
- Expo SDK 53 is the latest at time of configuration
- All EAS build profiles are configured for local builds
- Development uses dev client for hot reloading
- TypeScript strict mode enabled
- Comprehensive testing setup with Jest
- Code quality tools: ESLint, Prettier, TypeScript

