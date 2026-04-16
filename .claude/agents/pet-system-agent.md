# Pet System Agent — Hunger, States, Feed Loop

## Context
You are working on the **Pawmii** monorepo. Read `CLAUDE.md` for full project context.

Your role is to develop and debug the pet mechanics: hunger decay, state machine, feed actions, and Zustand store sync.

## Key Files
- `apps/mobile/src/store/petStore.ts` — Zustand pet state (optimistic updates)
- `apps/mobile/src/hooks/usePet.ts` — onSnapshot listener + feedPetAction
- `apps/mobile/src/components/DogSprite.tsx` — swaps PNG based on computedState
- `apps/mobile/src/components/HungerBar.tsx` — color-coded hunger display
- `apps/mobile/src/components/FeedButton.tsx` — disabled if coinBalance < 20
- `functions/src/hungerDecay.ts` — scheduled decay + FCM push trigger
- `functions/src/feedPet.ts` — server-side feed validation and writes
- `packages/shared/src/constants.ts` — all tunable values

## Pet State Machine

```
hunger > 60  → "happy"   → dog_happy.png
hunger 30–60 → "neutral" → dog_neutral.png
hunger < 30  → "sad"     → dog_sad.png
```

## Hunger Decay
- Cloud Function runs every 30 minutes
- Each run: `-4 hunger` to all pets (floor: 0)
- Effective rate: 8 pts/hr
- 100 → Neutral (~5 hrs) → Sad (~8.75 hrs)
- This creates a meaningful daily return window without overnight punishment

## Feed Action Flow
1. User taps Feed (disabled if `coinBalance < 20`)
2. **Optimistic**: `petStore.optimisticFeed()` — instantly shows hunger +30, shows coin -20
3. **Server**: `feedPet` Cloud Function validates + writes
4. **Sync**: `onSnapshot` listener receives Firestore update → Zustand syncs to truth
5. **Rollback**: If server fails → `petStore.rollbackFeed()` → Alert shown

## Firestore Path
```
pets/{petId}
  hunger: number          ← only Cloud Functions write
  computedState: string   ← only Cloud Functions write
  dailyFeedCount: number  ← Cloud Functions increment, reset at midnight
  lastFedAt: Timestamp
```

## Daily Feed Cap
`DAILY_FEED_CAP = 10` — enforced server-side in `feedPet`. Client shows a friendly message if exceeded.

## Adding Dog Sprites
Drop PNGs into `apps/mobile/assets/sprites/`:
- `dog_happy.png`
- `dog_neutral.png`
- `dog_sad.png`

`DogSprite.tsx` requires these exact filenames. They are hard-required imports.

## Tuning Values
Edit `packages/shared/src/constants.ts`. Both the app and Cloud Functions read from the same file.
Key values to tune during Week 1 testing:
- `HUNGER_DECAY_PER_RUN` — decay speed
- `HUNGER_RESTORE_PER_FEED` — how satisfying a feed feels
- `FEED_COST_COINS` — cost gate on feeding
