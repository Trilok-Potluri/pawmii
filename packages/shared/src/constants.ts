/**
 * Pawmii Shared Constants
 * Source of truth for coin formula, pet mechanics, and caps.
 * Both the mobile app and Cloud Functions import from here.
 * To tune the prototype loop, edit values here ONLY.
 */

// ─── Coin Formula ────────────────────────────────────────────────────────────

/** Coins earned per 1,000 steps */
export const COINS_PER_1000_STEPS = 10;

/** Coins earned per 100 active calories burned */
export const COINS_PER_100_CALORIES = 8;

/** Flat bonus awarded when BOTH steps AND calories contribute on the same day */
export const DAILY_BOTH_METRICS_BONUS = 65;

/** Hard daily coin cap (200 steps + 200 calories + 65 bonus) */
export const DAILY_COIN_CAP = 465;

/** Steps cap that contributes to coins (20,000 steps = 200 coins) */
export const STEPS_COIN_CAP = 20_000;

/** Calories cap that contributes to coins (2,500 cal = 200 coins) */
export const CALORIES_COIN_CAP = 2_500;

// ─── Shared Attribute Bounds ──────────────────────────────────────────────────

/** Maximum value for any pet attribute */
export const ATTR_MAX = 100;

/** Minimum value for any pet attribute (floor) */
export const ATTR_MIN = 0;

/** Attribute level above which the dog is Happy */
export const ATTR_HAPPY_THRESHOLD = 60;

/** Attribute level below which the dog is Sad */
export const ATTR_SAD_THRESHOLD = 30;

// ─── Hunger ──────────────────────────────────────────────────────────────────

/** Points lost per scheduled run (every 30 min) → 8 pts/hr, empty in ~12.5h */
export const HUNGER_DECAY_PER_RUN = 4;

/** Points restored per feed action */
export const HUNGER_RESTORE_PER_FEED = 30;

/** Cost in coins per feed action */
export const FEED_COST_COINS = 20;

/** Daily feed action cap per pet */
export const DAILY_FEED_CAP = 10;

// ─── Playfulness ─────────────────────────────────────────────────────────────

/** Points lost per scheduled run (every 30 min) → 4 pts/hr, empty in ~25h */
export const PLAYFULNESS_DECAY_PER_RUN = 2;

/** Points restored per play action */
export const PLAYFULNESS_RESTORE_PER_PLAY = 30;

/** Cost in coins per play action */
export const PLAY_COST_COINS = 15;

/** Daily play action cap per pet */
export const DAILY_PLAY_CAP = 10;

// ─── Cleanliness ─────────────────────────────────────────────────────────────

/** Points lost per scheduled run (every 30 min) → 2 pts/hr, empty in ~50h */
export const CLEANLINESS_DECAY_PER_RUN = 1;

/** Points restored per bathe action */
export const CLEANLINESS_RESTORE_PER_BATHE = 30;

/** Cost in coins per bathe action */
export const BATHE_COST_COINS = 10;

/** Daily bathe action cap per pet */
export const DAILY_BATHE_CAP = 10;

// ─── Cloud Function Schedule ─────────────────────────────────────────────────

/** Cron expression for the pet attribute decay scheduler (every 30 min) */
export const PET_DECAY_SCHEDULE = "every 30 minutes";

// ─── App Constants ───────────────────────────────────────────────────────────

/** Max characters for pet name */
export const PET_NAME_MAX_LENGTH = 20;

/** App bundle ID */
export const BUNDLE_ID = "com.lucratech.pawmii";

/** Firebase project ID */
export const FIREBASE_PROJECT_ID = "pawmii-app";

/** Firestore region */
export const FIRESTORE_REGION = "us-central1";
