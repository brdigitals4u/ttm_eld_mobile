# APK Size Reduction - Analysis & Actions

## Current Status
- **AAB Size**: 132 MB (100 MB compressed)
- **Target**: Reduce by 30-50% (40-65 MB reduction)

## Dependency Analysis Results

### ✅ Confirmed UNUSED (Safe to Remove)
1. **`@chatwoot/react-native-widget`** - Replaced by Freshchat
   - **Savings**: ~2-5 MB
   - **Risk**: None (already replaced)

2. **`@shopify/react-native-skia`** - Not found in codebase
   - **Savings**: ~5-10 MB (large native library)
   - **Risk**: Low (not used)

3. **`react-dom`** - Not needed for React Native
   - **Savings**: ~1-2 MB
   - **Risk**: None

### ⚠️ USED (Keep)
1. **`victory`** and **`victory-native`** - Used in:
   - `UnifiedHOSCard.tsx`
   - `HOSComponent.tsx`
   - `SpeedGauge.tsx`
   - `FuelLevelIndicator.tsx`

2. **`react-native-progress`** - Used in:
   - `UnifiedHOSCard.tsx` (line 27)

3. **`react-native-vector-icons`** - Used extensively:
   - 289 matches across 49 files

### ❓ Need Verification
1. **`react-native-chart-kit`** - Need to check usage
2. **`react-native-drawer-layout`** - Need to check usage
3. **`react-native-toast-message`** - Need to check usage
4. **`expo-blur`** - Need to check usage
5. **`expo-svg`** - Need to check usage
6. **`@react-navigation/native-stack`** - Likely used (depcheck false positive)

## Immediate Actions

### Phase 1: Remove Confirmed Unused Dependencies ✅ COMPLETED

**Removed:**
1. `@chatwoot/react-native-widget` - Replaced by Freshchat
2. `@shopify/react-native-skia` - Not used (large native library)
3. `react-dom` - Not needed for React Native
4. `react-native-drawer-layout` - Not used
5. `expo-blur` - Not used
6. `expo-svg` - Not used (using react-native-svg instead)
7. `react-native-toast-message` - Not used (custom Toast component)

**Expected savings: 10-20 MB**

**Next:** Rebuild and measure new size

### Phase 2: Verify and Remove Questionable Dependencies

Need to check:
- `react-native-chart-kit` usage
- `react-native-drawer-layout` usage
- `react-native-toast-message` usage
- `expo-blur` usage
- `expo-svg` usage

## Next Steps

1. ✅ Remove confirmed unused dependencies
2. ⏳ Verify questionable dependencies
3. ⏳ Optimize images (74 PNG files found)
4. ⏳ Enable architecture splits
5. ⏳ Optimize ProGuard rules

