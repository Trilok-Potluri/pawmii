# Health Agent — HealthKit & Health Connect

## Context
You are working on the **Pawmii** monorepo. Read `CLAUDE.md` for full project context.

Your role is to work on the health data integration — both iOS (HealthKit) and Android (Health Connect).

## Key Files
- `apps/mobile/src/services/healthKit.ts` — iOS HealthKit (react-native-health)
- `apps/mobile/src/services/healthConnect.ts` — Android Health Connect (react-native-health-connect)
- `apps/mobile/src/hooks/useHealth.ts` — platform-aware hook that syncs and posts to Cloud Function
- `apps/mobile/src/screens/OnboardingHealth.tsx` — permission request UI (Screen 3)
- `functions/src/coinCalculator.ts` — server that receives health payload and calculates coins

## Platform Notes

### iOS (HealthKit)
- Library: `react-native-health`
- Data types: `StepCount`, `ActiveEnergyBurned`
- Trigger: foreground fetch on app open + AppState change to "active"
- Background delivery: NOT implemented in prototype
- Data window: current calendar day (midnight to now, local time)
- Deduplication: trust HealthKit native deduplication

### Android (Health Connect)
- Library: `react-native-health-connect`
- Data types: `Steps`, `ActiveCaloriesBurned`
- Requires: Android API 34+ (Android 14). Health Connect is built-in.
- Edge case: Android < 14 → show Install modal with Play Store deep link
- Trigger: foreground fetch only (same as iOS)
- Deduplication: trust Health Connect native source merging

### Wearable Integration (No SDK Needed)
- Apple Watch: writes directly to HealthKit. Pawmii reads HealthKit. ✅ Automatic.
- Whoop (iOS): user enables Whoop → Settings → Integrations → Apple Health. ✅ No SDK.
- Whoop (Android): user enables Whoop → More → Integrations → Health Connect. ✅ No SDK.

## Payload to Server
```typescript
{ uid, date: "YYYY-MM-DD", steps: number, activeCalories: number, timezone: string }
```
POST to `calculateCoins` Cloud Function via Firebase HTTPS Callable.

## Permission Handling
- iOS: `requestPermissions()` → OS sheet → `granted` or `denied`
- Android: `requestPermission([...])` → Health Connect activity → `granted` or `denied`
- Skipped: user taps "Not now" — dog is still playable with 0 coins
- Denied: show non-blocking reconnect banner on home screen (do NOT re-prompt in prototype)

## Debugging Health Sync Issues

**iOS — Steps showing 0:**
Check if HealthKit permission was actually granted. Open Settings → Privacy → Health → Pawmii.

**Android — Steps showing 0:**
1. Confirm Android 14+ with `adb shell getprop ro.build.version.release`
2. Confirm Health Connect is installed and steps are visible in HC dashboard
3. Confirm app has been granted permissions in Health Connect settings

**Whoop + Android not syncing:**
This is a known issue. Warn testers: enable HC integration in Whoop app, then verify steps appear in HC dashboard before reporting Pawmii data issues.
