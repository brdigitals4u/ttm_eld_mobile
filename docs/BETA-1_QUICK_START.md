# ⚡ BETA-1: Quick Start Guide

**Use this for:** Fast reference during development/testing

---

## 🚀 Install & Run

```bash
# Install APK on device
cd /Users/shobhitgoel/sourcecode/ttm/ttm_eld_mobile
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or rebuild
cd android && ./gradlew assembleDebug

# Or run with Expo
npx expo run:android
```

---

## 🎮 Quick Test Flow

```
1. Login (existing credentials)
2. Click "Skip (Dev Mode)" OR connect actual ELD
3. Check dashboard for ELD indicator (top right)
4. Monitor console for sync logs
```

---

## 🎨 ELD Indicator Quick Reference

| Color | Meaning |
|-------|---------|
| 🟢 | Connected, all good |
| 🔴 | Error or disconnected |
| 🔵○ | Local sync (single ring) |
| 🔵◎○ | AWS sync (dual rings) |

---

## ⚙️ Toggle AWS Sync

**File:** `src/config/aws-config.ts`

```typescript
enableAwsSync: true   // ON
enableAwsSync: false  // OFF
```

---

## 📡 Monitor Console

**Data received:**
```
📦 Added to buffers - Local: X, AWS: Y
```

**Sync success:**
```
✅ Local API: Successfully synced X records
✅ AWS: Successfully synced X records
```

**Errors:**
```
❌ AWS: Sync failed: [reason]
```

---

## 🔧 Config Locations

| What | Where |
|------|-------|
| AWS Settings | `src/config/aws-config.ts` |
| Feature Flags | `src/config/aws-config.ts` → features |
| API Endpoint | `src/config/aws-config.ts` → apiGateway.baseUrl |
| Sync Interval | `src/config/aws-config.ts` → features.awsSyncInterval |

---

## 🐛 Quick Troubleshooting

**Problem:** AWS not syncing  
**Fix:** Check `enableAwsSync: true` in config

**Problem:** Indicator always red  
**Fix:** Check console for actual error

**Problem:** No "Skip" button  
**Fix:** Set `NODE_ENV=development`

**Problem:** Build fails  
**Fix:** Check `packages.add(JMBluetoothPackage())` in MainApplication.kt

---

## 📚 Full Documentation

- `ELD_INTEGRATION_REVIEW.md` - Original commit review
- `HYBRID_AWS_IMPLEMENTATION.md` - Complete architecture
- `BETA-1_FINAL_SUMMARY.md` - Detailed summary
- `BETA-1_QUICK_START.md` - This file

---

**Memory Token:** BETA-1  
**Status:** ✅ Ready  
**APK:** 301 MB


