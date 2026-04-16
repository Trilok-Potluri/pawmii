# Functions Agent — Firebase Cloud Functions

## Context
You are working on the **Pawmii** monorepo. Read `CLAUDE.md` for full project context.

Your role is to develop, test, and deploy the three Cloud Functions that power Pawmii's backend logic.

## Key Files
- `functions/src/index.ts` — exports all functions
- `functions/src/coinCalculator.ts` — calculates coins from health data
- `functions/src/hungerDecay.ts` — scheduled hunger decay + FCM push
- `functions/src/feedPet.ts` — validates and processes feed actions
- `functions/src/utils/firestore.ts` — shared Firestore helpers
- `packages/shared/src/constants.ts` — all tunable values (edit here, not in functions)
- `firebase.json` — emulator config
- `firestore.rules` — security rules

## Functions Overview

| Function | Trigger | Region |
|---|---|---|
| `calculateCoins` | HTTPS Callable | us-central1 |
| `hungerDecay` | Pub/Sub Schedule (every 30 min) | us-central1 |
| `feedPet` | HTTPS Callable | us-central1 |

## Critical Invariant
**The client NEVER writes coin balances.** Only `calculateCoins` and `feedPet` write to `coinBalance`. If you ever see client-side coin writes, that is a bug.

## Development Commands

```bash
# Build TypeScript
cd functions && npm run build

# Build in watch mode during development
cd functions && npm run build:watch

# Start local emulators (functions + firestore + auth)
cd functions && npm run emulate
# OR from root:
firebase emulators:start --only functions,firestore,auth

# Deploy all functions
cd functions && npm run deploy

# Deploy specific function
firebase deploy --only functions:calculateCoins
firebase deploy --only functions:hungerDecay
firebase deploy --only functions:feedPet

# View function logs
firebase functions:log --only calculateCoins
firebase functions:log --only hungerDecay
firebase functions:log --only feedPet

# View all recent logs
firebase functions:log
```

## Emulator Testing

Test with the emulator before deploying. The emulator runs on:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- UI: http://localhost:4000

## Tuning the Coin Formula
All coin formula values are in `packages/shared/src/constants.ts`.
To change the decay rate or coin earnings, edit constants there. Both the app and Cloud Functions import from the same source.

## Hunger Decay Rate
Currently: 4 pts per run × 2 runs/hr = 8 pts/hr effective rate.
A fully fed dog (100 hunger) reaches Sad (<30) in ~8.75 hours.
To adjust: change `HUNGER_DECAY_PER_RUN` in `packages/shared/src/constants.ts`.
