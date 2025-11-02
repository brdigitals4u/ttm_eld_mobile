# TypeScript Configuration Documentation

**File:** `tsconfig.json`

## Overview

TypeScript compiler configuration for the TTM Konnect ELD Mobile application. Defines TypeScript compiler options, paths, included/excluded files, and extends Expo's base TypeScript configuration.

## Base Configuration

**Extends:** `expo/tsconfig.base` - Expo's default TypeScript configuration

## Compiler Options

### Language Options

- **`allowJs`**: `false` - Only TypeScript files allowed (no JavaScript)
- **`target`**: `esnext` - Compile to latest ECMAScript version
- **`lib`**: `["esnext", "dom"]` - Include ES next and DOM type definitions

### Module Options

- **`module`**: `esnext` - Use ES modules
- **`moduleResolution`**: `bundler` - Bundler-style module resolution (for Expo/Metro)
- **`allowSyntheticDefaultImports`**: `true` - Allow default imports from modules without default export

### JSX Options

- **`jsx`**: `react-native` - Use React Native JSX transform

### Type Checking

- **`strict`**: `true` - Enable all strict type checking options
- **`noImplicitAny`**: `true` - Error on variables with implicit `any` type
- **`noImplicitReturns`**: `true` - Error if function doesn't return in all code paths
- **`noImplicitThis`**: `true` - Error on `this` with implicit `any` type

### Decorator Support

- **`experimentalDecorators`**: `true` - Enable experimental decorator support (for Realm, etc.)

### Source Maps

- **`sourceMap`**: `true` - Generate source maps for debugging

### Module Resolution

- **`skipLibCheck`**: `true` - Skip type checking of declaration files (faster compilation)
- **`resolveJsonModule`**: `true` - Allow importing JSON files as modules
- **`customConditions`**: `["react-native"]` - Custom module resolution conditions

### Path Aliases

TypeScript path mapping for cleaner imports:

```json
{
  "@/*": ["./src/*"],
  "@assets/*": ["./assets/*"]
}
```

**Usage:**
```typescript
// Instead of: import { api } from '../../../src/api'
import { api } from '@/api'

// Instead of: import logo from '../../../assets/images/logo.png'
import logo from '@assets/images/logo.png'
```

### Type Roots

Where to look for type definitions:

```json
[
  "./node_modules/@types",
  "./types"
]
```

- `./node_modules/@types` - Standard npm type definitions
- `./types` - Custom type definitions (e.g., `types/lib.es5.d.ts`)

## TS-Node Configuration

Configuration for `ts-node` (TypeScript execution):

```json
{
  "compilerOptions": {
    "module": "commonjs"
  }
}
```

Uses CommonJS for ts-node execution (required for some build tools).

## Included Files

Files included in TypeScript compilation:

```json
[
  "**/*.ts",
  "**/*.tsx",
  ".expo/types/**/*.ts",
  "expo-env.d.ts"
]
```

- `**/*.ts` - All TypeScript files
- `**/*.tsx` - All TypeScript React files
- `.expo/types/**/*.ts` - Expo-generated types
- `expo-env.d.ts` - Expo environment type definitions

## Excluded Files

Files excluded from TypeScript compilation:

```json
[
  "node_modules",
  "test/**/*"
]
```

- `node_modules` - Dependencies (handled separately)
- `test/**/*` - Test files (have separate test TSConfig)

## Path Resolution Examples

### Using Path Aliases

```typescript
// ✅ Good - Using path alias
import { apiClient } from '@/api/client'
import { useAuth } from '@/stores/authStore'
import logo from '@assets/images/logo.png'

// ❌ Bad - Relative paths
import { apiClient } from '../../../api/client'
```

### Import Paths

The bundler (Metro) must also be configured to resolve these paths. This is typically handled by:
- Expo's default Metro configuration
- `metro.config.js` resolver settings

## Type Checking

Run TypeScript type checking:

```bash
npm run compile
# or
npx tsc --noEmit -p . --pretty
```

This checks all TypeScript files without emitting JavaScript (useful for CI/CD).

## Strict Mode Benefits

With `strict: true`, TypeScript will:

1. **Prevent implicit any**: Forces explicit types
2. **Check null/undefined**: Prevents null reference errors
3. **Strict function types**: Ensures function type safety
4. **Strict property initialization**: Requires initialization of class properties
5. **No implicit returns**: Functions must explicitly return

## Common Patterns

### Component Props

```typescript
interface Props {
  title: string
  onPress?: () => void
}

export const Button: React.FC<Props> = ({ title, onPress }) => {
  // TypeScript ensures all required props are provided
}
```

### API Responses

```typescript
import { ApiResponse } from '@/api/client'

const response: ApiResponse<User> = await apiClient.get('/user')
// TypeScript knows response.data is User type
```

### Store Types

```typescript
import { useAuthStore } from '@/stores/authStore'

const user = useAuthStore(state => state.user)
// TypeScript knows user is User | null
```

## Integration with Expo

Expo's base configuration (`expo/tsconfig.base`) provides:
- React Native types
- Expo types
- Common TypeScript settings optimized for React Native

This config extends and customizes those settings.

## Custom Types Directory

The `types/` directory can contain:
- Custom type definitions
- Module augmentations
- Global type declarations

Example: `types/lib.es5.d.ts` - Extended ES5 type definitions

## Notes

1. **Strict Mode**: All strict checks enabled for maximum type safety
2. **Path Aliases**: Use `@/` and `@assets/` for cleaner imports
3. **No JavaScript**: Only TypeScript files are allowed
4. **Bundler Resolution**: Uses bundler-style resolution (optimized for Metro)
5. **Test Files**: Excluded (use `test/test-tsconfig.json`)

## Related Files

- `test/test-tsconfig.json` - Separate TSConfig for tests
- `metro.config.js` - Metro bundler configuration (must match path aliases)
- `types/lib.es5.d.ts` - Custom type definitions

