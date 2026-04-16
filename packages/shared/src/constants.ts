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

// ─── Pet Mechanics ───────────────────────────────────────────────────────────

/** Hunger points lost per scheduled Cloud Function run (every 30 min) */
export const HUNGER_DECAY_PER_RUN = 4; // = 8 pts/hr effective rate

/** Hunger points restored per feed action */
export const HUNGER_RESTORE_PER_FEED = 30;

/** Cost in coins per feed action */
export const FEED_COST_COINS = 20;

/** Max hunger value */
export const HUNGER_MAX = 100;

/** Min hunger value (floor) */
export const HUNGER_MIN = 0;

/** Daily feed action cap per pet */
export const DAILY_FEED_CAP = 10;

// ─── Hunger State Thresholds ─────────────────────────────────────────────────

/** Hunger level above which dog is Happy */
export const HUNGER_HAPPY_THRESHOLD = 60;

/** Hunger level below which dog is Sad */
export const HUNGER_SAD_THRESHOLD = 30;

// ─── Push Notification ───────────────────────────────────────────────────────

/** Hunger threshold that triggers push notification */
export const HUNGER_NOTIFY_THRESHOLD = 30;

/** Minimum minutes between hunger notifications per user */
export const HUNGER_NOTIFY_COOLDOWN_MINUTES = 360; // 6 hours

// ─── Cloud Function Schedule ─────────────────────────────────────────────────

/** Cron expression for the hunger decay scheduler (every 30 min) */
export const HUNGER_DECAY_SCHEDULE = "every 30 minutes";

// ─── App Constants ───────────────────────────────────────────────────────────

/** Max characters for pet name */
export const PET_NAME_MAX_LENGTH = 20;

/** App bundle ID */
export const BUNDLE_ID = "com.lucratech.pawmii";

/** Firebase project ID */
export const FIREBASE_PROJECT_ID = "pawmii-app";

/** Firestore region */
export const FIRESTORE_REGION = "us-central1";
