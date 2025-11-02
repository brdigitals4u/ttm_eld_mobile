# Environment Configuration Documentation

**Files**: 
- `src/config/index.ts`
- `src/config/config.base.ts`
- `src/config/config.dev.ts`
- `src/config/config.prod.ts`

## Overview

Environment-based configuration system that merges base configuration with environment-specific overrides. Supports development and production environments.

## Configuration Structure

### Base Configuration

**File**: `config.base.ts`

**Contains**:
- Navigation persistence settings
- Error catching configuration
- Exit routes for Android

**Settings**:
```typescript
{
  persistNavigation: "dev",    // Persist in dev mode
  catchErrors: "always",       // Always catch errors
  exitRoutes: ["Welcome"]      // Routes that exit app on back button
}
```

### Development Configuration

**File**: `config.dev.ts`

**Currently Contains**:
```typescript
{
  API_URL: "https://api.rss2json.com/v1/"
}
```

**Note**: This appears to be placeholder/example config

### Production Configuration

**File**: `config.prod.ts`

**Currently Contains**:
```typescript
{
  API_URL: "https://api.rss2json.com/v1/"
}
```

**Note**: Same as dev (should be different in production)

### Configuration Loader

**File**: `index.ts`

**Purpose**: Loads and merges configurations

**Logic**:
```typescript
let ExtraConfig = ProdConfig

if (__DEV__) {
  ExtraConfig = DevConfig
}

const Config = { ...BaseConfig, ...ExtraConfig }
```

**Process**:
1. Start with production config
2. Override with dev config if `__DEV__`
3. Merge with base config
4. Export final config

## Configuration Merging

**Order** (last wins):
1. BaseConfig
2. ProdConfig or DevConfig
3. Final Config object

## Usage

```typescript
import Config from '@/config'

// Access configuration
if (Config.persistNavigation === 'dev') {
  // Persist navigation
}

// Access API URL
const apiUrl = Config.API_URL
```

## Security Warning

**Important**: Configuration files are bundled into JavaScript

**From code comments**:
- Config values are visible in the bundle
- Anyone can extract them
- Don't store secrets in config files
- Use secure storage for sensitive data

## Environment Detection

**Uses**: `__DEV__` global variable

**Set by**: Metro bundler based on build mode

**Values**:
- `true` - Development mode
- `false` - Production mode

## Configuration Properties

### persistNavigation

**Type**: `"always" | "dev" | "prod" | "never"`

**Purpose**: Controls navigation state persistence

**Values**:
- `"always"` - Always persist
- `"dev"` - Only in development
- `"prod"` - Only in production
- `"never"` - Never persist

### catchErrors

**Type**: `"always" | "dev" | "prod" | "never"`

**Purpose**: Controls error boundary behavior

### exitRoutes

**Type**: `string[]`

**Purpose**: Routes that exit app on Android back button

**Usage**: Prevents going back from welcome screen

## API URL Configuration

**Current State**: Both dev and prod use same placeholder URL

**Should Be**:
- Dev: Development API endpoint
- Prod: Production API endpoint

**Note**: Actual API URL likely in `src/api/constants.ts`

## Future Enhancements

Should separate:
- Development API URL
- Production API URL
- Feature flags
- Environment-specific settings

## Integration

### With Navigation

```typescript
import Config from '@/config'

if (Config.persistNavigation === 'always' || 
    (Config.persistNavigation === 'dev' && __DEV__)) {
  // Persist navigation state
}
```

### With Error Handling

```typescript
import Config from '@/config'

if (Config.catchErrors === 'always' || 
    (Config.catchErrors === 'dev' && __DEV__)) {
  // Enable error boundary
}
```

## Notes

1. Config values are not secure (in bundle)
2. Base config provides defaults
3. Environment configs override base
4. Dev config only used in development
5. Actual API URLs likely elsewhere

