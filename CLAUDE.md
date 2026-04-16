# Pawmii — Project Working Memory

> Read this file at the start of every Claude session. It is the single source of truth for project context, decisions made, and how to work in this codebase.

---

## What This Project Is

**Pawmii** is a pet + fitness habit app by **Lucratech Private Limited**, built by **Trilok** (solo developer, Windows, Cursor + Claude).

The current phase is a **Prototype** — a stripped-down, 3-week build for a closed beta with 10–20 friends and family testers. It answers one question: **does the pet + fitness loop create daily habit and retention?**

Primary research question: *Does the pet + fitness loop create daily habit and retention?*

The Prototype is NOT the full 12-week MVP. Full MVP features unlock if D7 return rate ≥ 40% and feed actions ≥ 1/day.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo Managed Workflow (SDK 52) |
| Monorepo | npm workspaces + Turborepo |
| Build / CI | EAS Build + GitHub Actions |
| Auth | Firebase Anonymous Auth |
| Database | Firestore (us-central1, Blaze plan) |
| Backend | Cloud Functions (Node 20) |
| Push | FCM via Expo Notifications |
| State | Zustand + Firestore onSnapshot |
| Health (iOS) | react-native-health (HealthKit) |
| Health (Android) | react-native-health-connect (Health Connect) |
| Analytics | Firebase Analytics (free tier) |
| Node version | Node 20 LTS (required for Expo SDK 52 + Firebase) |

---

## Monorepo Structure

```
pawmii/
├── apps/mobile/          ← Expo React Native app
├── packages/shared/      ← Constants + TypeScript types (shared between app and functions)
├── functions/            ← Firebase Cloud Functions (Node 20)
├── .config/              ← DROP CREDENTIALS HERE (git-ignored)
├── .claude/agents/       ← Agent prompt files for common tasks
├── scripts/              ← Setup, validation, config copy scripts
├── .github/workflows/    ← EAS build CI/CD
├── firebase.json
├── firestore.rules
└── CLAUDE.md             ← This file
```

---

## App Architecture

### The Core Loop
1. User does real fitness activity
2. App opens → foreground health sync (HealthKit / HC) → POST to `calculateCoins` Cloud Function
3. Coins credited to `users/{uid}/coinBalance` by Cloud Function only
4. Dog hunger decays ~8 pts/hr via `hungerDecay` scheduled function (every 30 min)
5. User feeds dog (costs 20 coins, +30 hunger) via `feedPet` Cloud Function
6. Dog returns to Happy state → emotional reward
7. If hunger < 30, FCM push sent (max once per 6 hours)

### Client Cannot Write Coins
**This is a critical invariant.** The client NEVER calculates or writes `coinBalance` or `healthLogs`. All coin writes go through `calculateCoins` Cloud Function. Optimistic UI updates are for pet hunger display only, and always roll back if server fails.

### Onboarding Flow (4 screens only)
- Screen 1: Welcome → Firebase Anonymous Auth (silent, fires on CTA tap)
- Screen 2: Name Your Dog → writes to `onboardingStore.petName`
- Screen 3: Connect Health → requests OS permissions → writes `healthPermissionStatus`
- Screen 4 (Home): First entry → `onboarding.completed = true` written to Firestore

### Pet States
| State | Hunger | Image |
|---|---|---|
| Happy | > 60 | `dog_happy.png` |
| Neutral | 30–60 | `dog_neutral.png` |
| Sad | < 30 | `dog_sad.png` |

---

## Credentials / Config

All credentials live in `.config/`. **Never use .env files.**

| File | Purpose |
|---|---|
| `.config/config.json` | All project config values (copy from `config.template.json`) |
| `.config/google-services.json` | Firebase Android config (drop from Firebase Console) |
| `.config/GoogleService-Info.plist` | Firebase iOS config (drop from Firebase Console) |

`app.config.js` reads from `.config/config.json` at build time via `Constants.expoConfig.extra.firebase`.

Run `npm run setup` after dropping credential files.

---

## Key Constants (packages/shared/src/constants.ts)

All tunable values live here. **Edit here, not in Cloud Functions or the app directly.**

- `COINS_PER_1000_STEPS = 10`
- `COINS_PER_100_CALORIES = 8`
- `DAILY_BOTH_METRICS_BONUS = 65`
- `DAILY_COIN_CAP = 465`
- `HUNGER_DECAY_PER_RUN = 4` (4 pts every 30 min = 8 pts/hr)
- `HUNGER_RESTORE_PER_FEED = 30`
- `FEED_COST_COINS = 20`
- `DAILY_FEED_CAP = 10`

---

## Firestore Schema

```
users/{uid}
  coinBalance: number          ← Cloud Function writes only
  fcmToken: string | null
  healthPermissionGranted: bool
  onboardingCompleted: bool
  lastHungerNotifiedAt: Timestamp

users/{uid}/healthLogs/{YYYY-MM-DD}
  steps: number
  activeCalories: number
  coinsEarned: number          ← Authoritative, enforces daily cap
  lastUpdated: Timestamp

pets/{petId}
  uid: string
  name: string
  species: "dog"
  hunger: number (0–100)
  computedState: "happy"|"neutral"|"sad"
  lastFedAt: Timestamp
  dailyFeedCount: number
  createdAt: Timestamp
```

---

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `calculateCoins` | HTTP Callable | Receives health payload, calculates coins, enforces daily cap, writes to Firestore |
| `hungerDecay` | Scheduled (every 30 min) | Decrements all pet hunger by 4, updates computedState, triggers FCM push |
| `feedPet` | HTTP Callable | Validates cap + coins, deducts coins, increments hunger, returns confirmed state |

---

## What Is Explicitly OUT of Scope for Prototype

- Cat and bunny species
- Spine / Lottie animations (Pixalot dependency)
- Dirty / lonely hunger axes
- Shop, outfits, accessories
- Social features
- Workout + sleep health data (only steps + calories)
- Onboarding screens 5–13
- Mixpanel analytics
- RevenueCat / payments
- Android < 14
- Background health sync
- XP / levelling

---

## Development Timeline (3 weeks)

| Days | Focus |
|---|---|
| 1–2 | Infrastructure: Expo + Firebase + EAS scaffold, custom dev client |
| 3–5 | Health Data: HealthKit + Health Connect + coin Cloud Function |
| 6–10 | Pet System: hunger decay scheduler, feed action, Zustand, onSnapshot, sprite swap |
| 11–13 | Onboarding + Notifs: 4-screen flow, anonymous auth, FCM push |
| 14–16 | Distribution: EAS builds, TestFlight, Play Internal Track |
| 17–21 | Buffer: bug fixes from first tester feedback |

---

## Success Metrics

| Metric | Target |
|---|---|
| D7 Return Rate | ≥ 40% |
| D14 Return Rate | ≥ 25% |
| Feed Actions / User / Day | ≥ 1.0 |
| HealthKit/HC Grant Rate | ≥ 70% |
| Avg Sessions / Day | ≥ 1.5 |

---

## Pre-Dev Checklist (Manual Steps Before Coding)

- [ ] Apple Developer enrollment for Lucratech Private Limited (takes 2 days)
- [ ] App Store Connect app created post-enrollment
- [ ] Expo account + access token → add to `.config/config.json`
- [ ] Firebase `pawmii-app` project on Blaze plan → download config files → drop in `.config/`
- [ ] Google Play Console registration ($25) + internal track set up
- [ ] GitHub private repo `pawmii` created
- [ ] nvm-windows + Node 20 LTS installed
- [ ] 3 dog sprite PNGs sourced → drop in `apps/mobile/assets/sprites/`
- [ ] Run `npm run setup` from project root

---

## Agent Prompts

See `.claude/agents/` for specialized agent prompts:
- `build-agent.md` — trigger and monitor EAS builds
- `functions-agent.md` — deploy and test Cloud Functions
- `health-agent.md` — HealthKit / Health Connect implementation
- `pet-system-agent.md` — pet mechanics, hunger decay, feed loop
- `debug-agent.md` — debugging, logs, error triage
