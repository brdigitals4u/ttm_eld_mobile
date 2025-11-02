# Root Configuration Files Summary

This document covers remaining root-level configuration files.

## Configuration Files

### babel.config.js

**Purpose**: Babel transpiler configuration

**Configuration**:
```javascript
{
  presets: ["babel-preset-expo"]
}
```

**Usage**: Transpiles JSX and modern JavaScript

### metro.config.js

[See summary below]

**Purpose**: Metro bundler configuration

**Features**:
- Inline requires optimization
- Axios/apisauce fix
- CJS extension support
- React Native conditions

**Key Settings**:
- `inlineRequires: true` - Defer component loading
- `unstable_conditionNames` - Module resolution
- `sourceExts` - File extension support

### jest.config.js

**Purpose**: Jest testing configuration

**Configuration**:
```javascript
{
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"]
}
```

**Preset**: Uses Expo Jest preset
**Setup**: Test setup file for mocks

### eas.json

[See ROOT_CONFIG_EAS.md](./ROOT_CONFIG_EAS.md)

EAS Build configuration.

### app.json

[See ROOT_CONFIG_APP_JSON.md](./ROOT_CONFIG_APP_JSON.md)

Expo app configuration.

### tsconfig.json

[See ROOT_CONFIG_TSCONFIG.md](./ROOT_CONFIG_TSCONFIG.md)

TypeScript configuration.

### package.json

[See ROOT_CONFIG_PACKAGE_JSON.md](./ROOT_CONFIG_PACKAGE_JSON.md)

NPM package configuration.

## Metro Configuration Details

### metro.config.js

**Features**:

1. **Inline Requires**:
   - Deferred loading
   - Performance optimization
   - Conditional imports

2. **Axios/Apisauce Fix**:
   - Condition names fix
   - Browser compatibility

3. **CJS Support**:
   - CommonJS extension support
   - Firebase compatibility

**Custom Conditions**:
```javascript
unstable_conditionNames: ["require", "default", "browser"]
```

## Babel Configuration

### babel.config.js

**Simple Configuration**:
- Uses Expo preset
- Caching enabled
- Standard transformations

**Preset Features**:
- JSX transformation
- TypeScript support
- React Native optimizations
- Module resolution

## Jest Configuration

### jest.config.js

**Test Environment**:
- Jest-Expo preset
- React Native environment
- Setup file for mocks

**Test Files**:
- Location: `test/` directory
- Pattern: `*.test.ts`, `*.test.tsx`
- Setup: `test/setup.ts`

## Environment Files

### .env Files (if used)

**Purpose**: Environment variables

**Variables**:
- API URLs
- Feature flags
- Secrets (not committed)

## Additional Config Files

### .gitignore

**Purpose**: Git ignore patterns

**Ignores**:
- `node_modules/`
- `build/` directories
- `.expo/`
- Environment files
- OS files

### .prettierrc (if exists)

**Purpose**: Code formatting

### .eslintrc (if exists)

**Purpose**: Linting rules

## Build Configuration

### Android

- `android/build.gradle` - Root build config
- `android/app/build.gradle` - App build config
- `android/gradle.properties` - Gradle properties
- `android/key.properties` - Signing keys

### iOS

- `ios/Podfile` - CocoaPods dependencies
- Xcode project settings
- Info.plist

## Type Definitions

### expo-env.d.ts

**Purpose**: Expo TypeScript definitions

### types/lib.es5.d.ts

**Purpose**: Custom ES5 type extensions

## Configuration Hierarchy

1. **Package.json** - Dependencies and scripts
2. **App.json** - Expo configuration
3. **Tsconfig.json** - TypeScript settings
4. **Babel/Metro** - Build tool configs
5. **Platform-specific** - Android/iOS configs

## Environment-Specific Configs

### Development

- `config.dev.ts` - Dev settings
- Dev API URLs
- Debug features enabled

### Production

- `config.prod.ts` - Prod settings
- Prod API URLs
- Production optimizations

## Notes

- All configs work together
- Expo handles most configuration
- Platform-specific configs override base
- Environment configs override defaults

