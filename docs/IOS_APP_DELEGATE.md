# iOS App Delegate Documentation

**File**: `ios/TTMKonnect/AppDelegate.swift`

## Overview

iOS application delegate class that handles app lifecycle, React Native initialization, Expo module integration, and deep linking.

## Class Structure

```swift
@UIApplicationMain
public class AppDelegate: ExpoAppDelegate
```

Extends `ExpoAppDelegate` for Expo integration.

## Key Components

### Application Launch

**Method**: `application(_:didFinishLaunchingWithOptions:)`

**Purpose**: Initialize app on launch

**Process**:
1. Create React Native delegate
2. Create React Native factory
3. Set dependency provider
4. Initialize React Native
5. Create and configure window
6. Start React Native

**Code Flow**:
```swift
let delegate = ReactNativeDelegate()
let factory = ExpoReactNativeFactory(delegate: delegate)
delegate.dependencyProvider = RCTAppDependencyProvider()
factory.startReactNative(...)
```

### React Native Delegate

**Class**: `ReactNativeDelegate`

**Purpose**: Customize React Native factory behavior

**Methods**:

#### `sourceURL(for:)`
Returns JavaScript bundle URL for bridge

**Logic**:
- Uses bridge bundle URL if available
- Falls back to `bundleURL()`

#### `bundleURL()`
Returns JavaScript bundle location

**Debug Mode**:
```swift
RCTBundleURLProvider.sharedSettings().jsBundleURL(
  forBundleRoot: ".expo/.virtual-metro-entry"
)
```

**Release Mode**:
```swift
Bundle.main.url(forResource: "main", withExtension: "jsbundle")
```

### Deep Linking

**Method**: `application(_:open:options:)`

**Purpose**: Handle URL scheme deep links

**Supported Schemes**:
- `ttmkonnectbind://`
- Custom URL schemes

**Implementation**:
```swift
return super.application(app, open: url, options: options) || 
       RCTLinkingManager.application(app, open: url, options: options)
```

### Universal Links

**Method**: `application(_:continue:restorationHandler:)`

**Purpose**: Handle Universal Links

**Implementation**:
```swift
let result = RCTLinkingManager.application(...)
return super.application(...) || result
```

## Expo Integration

### ExpoAppDelegate

Extends Expo's app delegate for:
- Expo module support
- Expo configuration
- Expo lifecycle management

### ExpoReactNativeFactory

Creates and manages React Native bridge with Expo modules.

### Dependency Provider

`RCTAppDependencyProvider` provides React Native dependencies.

## React Native Initialization

### Factory Creation

```swift
let factory = ExpoReactNativeFactory(delegate: delegate)
```

### Factory Start

```swift
factory.startReactNative(
  withModuleName: "main",
  in: window,
  launchOptions: launchOptions
)
```

### Window Setup

```swift
window = UIWindow(frame: UIScreen.main.bounds)
```

## Debug vs Release

### Debug Mode

- Uses Metro bundler URL
- Hot reload enabled
- Development bundle

### Release Mode

- Uses bundled JavaScript
- Production bundle
- Optimized code

## Lifecycle Methods

### didFinishLaunchingWithOptions

Called when app finishes launching.

**Responsibilities**:
- Initialize React Native
- Set up window
- Start app

### Deep Link Handling

Called when app opens via URL.

**Responsibilities**:
- Parse URL
- Route to appropriate screen
- Handle parameters

### Universal Links

Called when app opens via Universal Link.

**Responsibilities**:
- Handle web links
- Route appropriately

## Expo Modules

### Automatic Integration

Expo modules automatically registered via:
- ExpoAppDelegate
- ExpoReactNativeFactory
- Config plugins

### Native Modules

Modules available through Expo's module system.

## Configuration

### Bundle Root

**Debug**: `.expo/.virtual-metro-entry`
**Release**: `main.jsbundle`

### Module Name

**Module**: `"main"`

### Window Configuration

- Full screen window
- Main screen bounds

## Deep Linking Support

### URL Schemes

Configured in `Info.plist`:
- `ttmkonnectbind://`

### Universal Links

Configured in:
- `Info.plist`
- Associated domains
- Apple App Site Association file

## Error Handling

Inherits error handling from:
- ExpoAppDelegate
- React Native error boundaries
- Native error handling

## Performance

### Startup Optimization

- Lazy module loading
- Optimized bundle loading
- Efficient initialization

### Memory Management

- Proper cleanup
- Weak references where appropriate
- ARC memory management

## Testing

### Unit Tests

Test delegate methods:
- Launch handling
- URL parsing
- Deep link routing

### Integration Tests

Test full app launch:
- React Native initialization
- Module loading
- Deep linking

## Debugging

### Xcode Debugger

- Set breakpoints
- Inspect variables
- Step through code

### Console Logs

View logs:
- Xcode console
- Device logs
- React Native debugger

## Notes

1. Uses Expo's app delegate system
2. React Native initialized via factory
3. Deep linking supported
4. Universal links supported
5. Debug/release bundle handling

## Future Enhancements

- Custom native modules (if needed)
- Enhanced deep linking
- Push notification handling
- Background modes

