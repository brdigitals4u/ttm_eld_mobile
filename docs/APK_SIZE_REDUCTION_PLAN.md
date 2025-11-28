# APK Size Reduction Plan

## Current Status

### ✅ Already Implemented
- **ProGuard/R8**: Enabled with full mode
- **Resource Shrinking**: Enabled
- **PNG Crunching**: Enabled
- **Code Minification**: Enabled
- **Hermes Engine**: Enabled (smaller JS bundle)
- **16 KB Page Size Support**: Configured

### 📊 Baseline Measurement Needed
Before implementing optimizations, establish baseline:
```bash
# Build current release APK
./android/gradlew -p android assembleRelease

# Analyze APK size
ls -lh android/app/build/outputs/apk/release/app-release.apk

# Use Android Studio APK Analyzer for detailed breakdown
# Build > Analyze APK > Select app-release.apk
```

## Optimization Plan (Prioritized)

### Phase 1: Quick Wins (High Impact, Low Risk) ⚡

#### 1.1 Remove Unused Dependencies
**Estimated Savings: 5-15 MB**

**Action Items:**
- [ ] Audit `package.json` dependencies
- [ ] Check for unused packages:
  - `@chatwoot/react-native-widget` - Verify if still needed (replaced by Freshchat?)
  - `victory` and `victory-native` - Check if both are needed
  - `react-native-chart-kit` - May overlap with victory
  - `react-native-drawer-layout` - Verify usage
  - `react-native-progress` - Check if used
- [ ] Use `npx depcheck` to find unused dependencies
- [ ] Remove unused packages and test thoroughly

**Commands:**
```bash
# Find unused dependencies
npx depcheck

# Check bundle for unused code
npx react-native-bundle-visualizer
```

#### 1.2 Optimize Image Assets
**Estimated Savings: 2-10 MB**

**Action Items:**
- [ ] Convert large PNGs to WebP (better compression)
- [ ] Optimize existing images with tools:
  - `squoosh-cli` for batch optimization
  - `imagemin` for automated optimization
- [ ] Remove duplicate assets
- [ ] Use vector drawables where possible
- [ ] Remove unused image assets

**Tools:**
```bash
# Install image optimization tools
npm install -D imagemin imagemin-webp imagemin-pngquant

# Create optimization script
# See scripts/optimize-images.js (to be created)
```

#### 1.3 Enable Architecture Splits (APK Only)
**Estimated Savings: 30-50% per APK** (AAB already does this)

**Action Items:**
- [ ] Enable ABI splits in `build.gradle`
- [ ] Build separate APKs per architecture
- [ ] Note: Google Play uses AAB which already splits, but useful for direct APK distribution

**Configuration:**
```gradle
splits {
    abi {
        enable true
        reset()
        include "armeabi-v7a", "arm64-v8a"  // Remove x86/x86_64 for mobile-only
        universalApk false
    }
}
```

#### 1.4 Remove Debug/Dev Dependencies from Release
**Estimated Savings: 1-3 MB**

**Action Items:**
- [ ] Ensure `expo-dev-client` is not included in release builds
- [ ] Verify Reactotron is excluded from release
- [ ] Check that dev-only code is properly tree-shaken

**Configuration:**
```gradle
release {
    // Already configured, but verify:
    // - Dev client excluded
    // - Debug tools excluded
}
```

### Phase 2: Code Optimization (Medium Impact, Medium Risk) 🔧

#### 2.1 Optimize ProGuard Rules
**Estimated Savings: 2-5 MB**

**Action Items:**
- [ ] Review `proguard-rules.pro` for overly permissive keep rules
- [ ] Remove unnecessary `-keep` rules
- [ ] Use `-keepclassmembers` instead of `-keep` where possible
- [ ] Add `-assumenosideeffects` for logging in release builds
- [ ] Enable more aggressive optimization flags

**ProGuard Optimizations:**
```proguard
# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# More aggressive optimization
-optimizationpasses 5
-allowaccessmodification
-repackageclasses ''
```

#### 2.2 Bundle Analysis & Tree Shaking
**Estimated Savings: 1-3 MB**

**Action Items:**
- [ ] Analyze JavaScript bundle size
- [ ] Identify large dependencies in bundle
- [ ] Use dynamic imports for heavy features
- [ ] Implement code splitting for routes
- [ ] Remove unused exports from dependencies

**Tools:**
```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Check for duplicate dependencies
npx npm-check-duplicates
```

#### 2.3 Native Library Optimization
**Estimated Savings: 3-8 MB**

**Action Items:**
- [ ] Review native libraries (.so files)
- [ ] Remove unused native modules if possible
- [ ] Check for duplicate native libraries
- [ ] Consider removing x86/x86_64 if mobile-only
- [ ] Verify all native libs are necessary

**Analysis:**
```bash
# Extract and analyze APK
unzip app-release.apk -d apk_contents
du -sh apk_contents/lib/*/
```

### Phase 3: Advanced Optimizations (High Impact, Higher Risk) 🚀

#### 3.1 Font Optimization
**Estimated Savings: 0.5-2 MB**

**Action Items:**
- [ ] Use font subsets (only include needed characters)
- [ ] Remove unused font weights/styles
- [ ] Consider using system fonts where possible
- [ ] Convert fonts to WOFF2 if supported

#### 3.2 Asset Lazy Loading
**Estimated Savings: 1-3 MB**

**Action Items:**
- [ ] Implement asset lazy loading for non-critical resources
- [ ] Load images on-demand instead of bundling all
- [ ] Use remote assets for large resources

#### 3.3 Dependency Alternatives
**Estimated Savings: 5-15 MB**

**Action Items:**
- [ ] Evaluate lighter alternatives:
  - `realm` → Consider `@react-native-async-storage` or `react-native-mmkv` for simple storage
  - `victory-native` → Consider `react-native-chart-kit` or custom charts
  - `react-native-pdf` → Consider webview-based solution if acceptable
- [ ] Check if `@shopify/react-native-skia` is essential (large native library)
- [ ] Review if all Expo modules are needed

#### 3.4 Remove Unused Locales
**Estimated Savings: 0.5-1 MB**

**Action Items:**
- [ ] Configure which locales to include
- [ ] Remove unused language resources
- [ ] Use locale-specific builds if needed

**Configuration:**
```gradle
android {
    defaultConfig {
        resConfigs "en", "es", "ar"  // Only include used locales
    }
}
```

### Phase 4: Build Configuration (Low Risk) ⚙️

#### 4.1 Enable Additional R8 Optimizations
**Estimated Savings: 1-2 MB**

**Action Items:**
- [ ] Verify R8 full mode is enabled (already done)
- [ ] Add R8 optimization flags
- [ ] Enable class merging

#### 4.2 Optimize DEX Files
**Estimated Savings: 0.5-1 MB**

**Action Items:**
- [ ] Ensure multi-dex is properly configured
- [ ] Optimize DEX file structure

#### 4.3 Resource Optimization
**Estimated Savings: 1-2 MB**

**Action Items:**
- [ ] Remove unused string resources
- [ ] Optimize XML layouts
- [ ] Remove unused drawables
- [ ] Use vector drawables instead of bitmaps where possible

## Implementation Checklist

### Pre-Implementation
- [ ] Measure current APK size (baseline)
- [ ] Analyze APK with Android Studio APK Analyzer
- [ ] Document current size breakdown
- [ ] Set target size reduction goal (e.g., 30% reduction)

### Phase 1 Implementation
- [ ] Run dependency audit
- [ ] Remove unused dependencies
- [ ] Optimize image assets
- [ ] Enable architecture splits (if needed)
- [ ] Verify dev dependencies excluded
- [ ] Measure size after Phase 1

### Phase 2 Implementation
- [ ] Optimize ProGuard rules
- [ ] Analyze and optimize bundle
- [ ] Review native libraries
- [ ] Measure size after Phase 2

### Phase 3 Implementation (Optional)
- [ ] Optimize fonts
- [ ] Implement lazy loading
- [ ] Evaluate dependency alternatives
- [ ] Remove unused locales
- [ ] Measure size after Phase 3

### Phase 4 Implementation
- [ ] Enable additional R8 optimizations
- [ ] Optimize DEX files
- [ ] Optimize resources
- [ ] Final size measurement

### Post-Implementation
- [ ] Test app functionality thoroughly
- [ ] Verify no regressions
- [ ] Document final APK size
- [ ] Calculate total reduction percentage
- [ ] Update build documentation

## Tools & Commands

### Size Analysis
```bash
# Build release APK
./android/gradlew -p android assembleRelease

# Check APK size
ls -lh android/app/build/outputs/apk/release/app-release.apk

# Analyze with Android Studio
# Build > Analyze APK > Select APK

# Extract and analyze contents
unzip -q app-release.apk -d apk_analysis
du -sh apk_analysis/*/
```

### Dependency Analysis
```bash
# Find unused dependencies
npx depcheck

# Check for duplicates
npx npm-check-duplicates

# Bundle analyzer
npx react-native-bundle-visualizer
```

### Image Optimization
```bash
# Install tools
npm install -D imagemin imagemin-webp imagemin-pngquant

# Optimize images (script to be created)
node scripts/optimize-images.js
```

## Expected Results

### Conservative Estimate (Phase 1 + 2)
- **Size Reduction**: 20-35%
- **Example**: 100 MB → 65-80 MB
- **Risk Level**: Low-Medium

### Aggressive Estimate (All Phases)
- **Size Reduction**: 40-60%
- **Example**: 100 MB → 40-60 MB
- **Risk Level**: Medium-High

## Risk Assessment

### Low Risk
- Image optimization
- Architecture splits
- Removing unused dependencies (after verification)
- Resource optimization

### Medium Risk
- ProGuard rule optimization (may break reflection)
- Native library removal (may break features)
- Dependency alternatives (may require code changes)

### High Risk
- Removing core dependencies
- Aggressive code splitting
- Major dependency replacements

## Monitoring

### Size Tracking
- Track APK size in CI/CD
- Set size budgets per release
- Alert on size increases
- Document size changes in release notes

### Quality Assurance
- Test on multiple devices
- Verify all features work
- Check performance impact
- Monitor crash rates

## References

- [Android App Bundle Size](https://developer.android.com/topic/performance/reduce-apk-size)
- [R8 Optimization](https://developer.android.com/studio/build/shrink-code)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Optimization Guide](https://docs.expo.dev/guides/optimizing-assets/)

## Notes

- Always test thoroughly after each optimization
- Keep backups of working configurations
- Document any breaking changes
- Monitor app performance and stability
- Consider user impact (e.g., download size vs. runtime performance)

