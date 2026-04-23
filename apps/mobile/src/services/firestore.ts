/**
 * Firestore operations — all client-readable, server-writable-only paths.
 * Client writes: user doc creation, onboarding flags, pet name (creation only).
 * Coin balance, hunger — written by Cloud Functions only.
 */

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "./firebase";
import type { Pet, UserDoc } from "@pawmii/shared";

// ─── User Document ────────────────────────────────────────────────────────────

export async function createUserDoc(uid: string): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    // Only update lastActiveAt — never overwrite coinBalance or onboardingCompleted
    await setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true });
    return;
  }
  // NOTE: `coinBalance` is intentionally omitted here. Firestore rules forbid
  // the client from setting it (Cloud Functions own that field). The
  // calculateCoins function uses FieldValue.increment which correctly treats a
  // missing field as 0, so the balance starts at 0 by default.
  await setDoc(ref, {
    uid,
    fcmToken: null,
    healthPermissionGranted: false,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });
}

export async function completeOnboarding(uid: string): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      onboardingCompleted: true,
      lastActiveAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateHealthPermission(
  uid: string,
  granted: boolean
): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  await setDoc(ref, { healthPermissionGranted: granted }, { merge: true });
}

export async function storeFcmToken(uid: string, token: string): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  await setDoc(ref, { fcmToken: token }, { merge: true });
}

// ─── Coin Balance Listener ────────────────────────────────────────────────────

/**
 * Subscribes to the user's coin balance via onSnapshot.
 * Returns an unsubscribe function.
 */
export function subscribeToCoinBalance(
  uid: string,
  onUpdate: (balance: number) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate((snap.data() as UserDoc).coinBalance ?? 0);
    }
  });
}

/**
 * One-shot read of the user document. Returns null if it doesn't exist.
 * Used by the Home screen to hydrate state that Zustand doesn't persist
 * (e.g. healthPermissionGranted) after a cold start.
 */
export async function fetchUserDoc(uid: string): Promise<UserDoc | null> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

// ─── Pet Document ─────────────────────────────────────────────────────────────

/**
 * Creates the pet document during onboarding.
 * Hunger, computedState etc are managed by Cloud Functions after this.
 */
export async function createPetDoc(
  uid: string,
  petId: string,
  name: string
): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "pets", petId);
  // Don't overwrite an existing pet — Cloud Functions own hunger/feedCount after creation
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await setDoc(ref, {
    uid,
    name,
    species: "dog",
    hunger: 70,
    computedState: "happy",
    lastFedAt: null,
    createdAt: serverTimestamp(),
    dailyFeedCount: 0,
  });
}

/**
 * Subscribes to the user's pet document via onSnapshot.
 * Returns an unsubscribe function.
 */
export function subscribeToPet(
  uid: string,
  onUpdate: (pet: Pet) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const petsRef = collection(db, "pets");
  const q = query(petsRef, where("uid", "==", uid));

  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const petDoc = snap.docs[0];
      onUpdate({ petId: petDoc.id, ...petDoc.data() } as Pet);
    }
  });
}
