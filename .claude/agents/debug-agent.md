# Debug Agent — Triage & Error Investigation

## Context
You are working on the **Pawmii** monorepo. Read `CLAUDE.md` for full project context.

Your role is to diagnose and fix bugs reported by the developer or testers.

## Log Access

```bash
# Cloud Function logs (real-time)
firebase functions:log

# Specific function
firebase functions:log --only calculateCoins
firebase functions:log --only feedPet
firebase functions:log --only hungerDecay

# Expo dev client logs (Metro)
cd apps/mobile && npx expo start --dev-client

# EAS build logs
eas build:list --limit 5
eas build:view [BUILD_ID]
```

## Common Issues & Fixes

### "Coin balance not updating after workout"
1. Check `calculateCoins` logs for the user's UID
2. Check `users/{uid}/healthLogs/{date}` in Firestore Console
3. Verify health data is actually in HealthKit / Health Connect for today
4. Verify `onSnapshot` listener is active (`useCoins` hook)

### "Dog hunger not decaying"
1. Check `hungerDecay` function logs — look for "Decayed N pets"
2. Verify scheduler is enabled: Firebase Console → Functions → Schedule
3. Check `pets/{petId}` document for `hunger` and `lastDecayAt` fields

### "Feed button always disabled"
1. Check `coinBalance` in `users/{uid}` document
2. Check `FEED_COST_COINS` in `packages/shared/src/constants.ts` (should be 20)
3. Check `useCoins` hook — is the `onSnapshot` listener subscribed?

### "Health permissions asking every time"
1. iOS: Check if HealthKit permission is saved across app restarts
2. Android: Check if `healthPermissionStatus` is persisted in Firestore (`users/{uid}.healthPermissionGranted`)
3. The onboarding status should be read from Firestore on app launch, not just local state

### "Optimistic feed not rolling back"
1. Check `feedPet` Cloud Function response — is `success: false`?
2. Check `rollbackFeed` is called in the catch block in `usePet.ts`
3. Check Firestore security rules — is the client being denied write access?

### "FCM notification not arriving"
1. Check `hungerDecay` logs — look for "Sent to uid="
2. Check `users/{uid}.fcmToken` is set in Firestore
3. Check `users/{uid}.lastHungerNotifiedAt` — cooldown may be active (6 hrs)
4. Verify FCM token was stored in `setupNotifications()` on app launch

## Firestore Console Quick Links
- Users: `https://console.firebase.google.com/project/pawmii-app/firestore/data/users`
- Pets: `https://console.firebase.google.com/project/pawmii-app/firestore/data/pets`
- Functions: `https://console.firebase.google.com/project/pawmii-app/functions`

## TypeScript Errors
```bash
# Check types across the whole monorepo
npm run typecheck

# Check specific workspace
cd apps/mobile && npx tsc --noEmit
cd functions && npx tsc --noEmit
cd packages/shared && npx tsc --noEmit
```
