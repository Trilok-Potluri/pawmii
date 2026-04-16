# Build Agent — EAS Build & Distribution

## Context
You are working on the **Pawmii** Expo + React Native monorepo. Read `CLAUDE.md` for full project context.

Your role is to trigger, monitor, and troubleshoot EAS builds for TestFlight (iOS) and Play Internal Track (Android).

## Key Files
- `apps/mobile/eas.json` — build profiles (development, preview, production)
- `apps/mobile/app.config.js` — dynamic Expo config (reads from `.config/config.json`)
- `.config/config.json` — credentials (must exist before building)
- `.config/google-services.json` — Firebase Android config
- `.config/GoogleService-Info.plist` — Firebase iOS config

## Before Any Build
1. Verify `.config/config.json` exists and is filled: `node scripts/validate-config.js`
2. Run setup to copy credential files: `npm run setup`
3. Verify EAS login: `eas whoami`
4. Verify Node 20: `node --version`

## Common Build Commands

```bash
# iOS preview build (TestFlight internal)
cd apps/mobile && eas build --platform ios --profile preview

# Android preview build (APK for Play Internal Track)
cd apps/mobile && eas build --platform android --profile preview

# Both platforms simultaneously
cd apps/mobile && eas build --platform all --profile preview

# Production build
cd apps/mobile && eas build --platform all --profile production

# Check build status
eas build:list --limit 5

# Submit to TestFlight
eas submit --platform ios --latest

# Submit to Play Internal Track
eas submit --platform android --latest
```

## Build Troubleshooting

**"No config file found"**: Run `npm run setup` from monorepo root.
**"Bundle identifier mismatch"**: Check `ios.bundleIdentifier` in `app.config.js` matches Apple Developer.
**"google-services.json not found"**: Ensure file is in `.config/` and `npm run setup` was run.
**HealthKit entitlement error**: Verify `NSHealthShareUsageDescription` in `app.config.js` infoPlist.
**Health Connect permissions error**: Verify `android.permissions` array in `app.config.js`.

## Prototype Distribution
- iOS: TestFlight internal testing (no App Review needed)
- Android: Play Console → Internal testing track (instant, no review)
- Share direct install links via WhatsApp/Slack to 10–20 testers
