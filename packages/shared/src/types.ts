/**
 * Pawmii Shared TypeScript Types
 * Used by both apps/mobile and functions/
 */

// ─── Pet ──────────────────────────────────────────────────────────────────────

export type PetSpecies = "dog"; // Cat and bunny deferred to full MVP

export type PetComputedState = "happy" | "neutral" | "sad";

export interface Pet {
  petId: string;
  uid: string;
  name: string;
  species: PetSpecies;
  hunger: number; // 0–100, decays server-side
  lastFedAt: FirestoreTimestamp | null;
  computedState: PetComputedState;
  createdAt: FirestoreTimestamp;
  dailyFeedCount: number; // resets at midnight
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type HealthPermissionStatus = "granted" | "denied" | "skipped" | "unknown";

export interface UserDoc {
  uid: string;
  coinBalance: number;
  fcmToken: string | null;
  healthPermissionGranted: boolean;
  onboardingCompleted: boolean;
  createdAt: FirestoreTimestamp;
  lastActiveAt: FirestoreTimestamp;
}

// ─── Health Logs ─────────────────────────────────────────────────────────────

/** Firestore path: users/{uid}/healthLogs/{date} where date = "YYYY-MM-DD" */
export interface HealthLog {
  date: string; // "YYYY-MM-DD"
  steps: number;
  activeCalories: number;
  coinsEarned: number; // Authoritative, enforces daily cap
  lastUpdated: FirestoreTimestamp;
}

// ─── Cloud Function Payloads ─────────────────────────────────────────────────

/** POST payload to calculateCoins Cloud Function */
export interface CalculateCoinsPayload {
  uid: string;
  date: string; // "YYYY-MM-DD"
  steps: number;
  activeCalories: number;
  timezone: string; // e.g. "Asia/Kolkata"
}

/** POST payload to feedPet Cloud Function */
export interface FeedPetPayload {
  uid: string;
  petId: string;
  timestamp: string; // ISO 8601
}

/** Response from feedPet Cloud Function */
export interface FeedPetResponse {
  success: boolean;
  newHunger: number;
  newCoinBalance: number;
  error?: string;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingState {
  petName: string;
  healthPermissionStatus: HealthPermissionStatus;
  completed: boolean;
}

// ─── Zustand Store Shapes ────────────────────────────────────────────────────

export interface PetStoreState {
  pet: Pet | null;
  isLoading: boolean;
  error: string | null;
  setPet: (pet: Pet) => void;
  optimisticFeed: () => void;
  rollbackFeed: () => void;
  reset: () => void;
}

export interface HealthStoreState {
  steps: number;
  activeCalories: number;
  coinsEarnedToday: number;
  permissionStatus: HealthPermissionStatus;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  setPermissionStatus: (status: HealthPermissionStatus) => void;
  setHealthData: (steps: number, calories: number, coins: number) => void;
  setIsSyncing: (val: boolean) => void;
}

export interface UserStoreState {
  uid: string | null;
  coinBalance: number;
  isAnonymous: boolean;
  onboardingCompleted: boolean;
  setCoinBalance: (balance: number) => void;
  setUser: (uid: string, isAnonymous: boolean) => void;
  setOnboardingCompleted: (val: boolean) => void;
  reset: () => void;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Firestore server timestamp — typed loosely to avoid firebase dependency in shared */
export type FirestoreTimestamp = {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
};
