/**
 * Firestore operations — all client-readable, server-writable-only paths.
 * Client writes: user doc creation, onboarding flags, pet name (creation only).
 * Coin balance, hunger — written by Cloud Functions only.
 */

import {
  doc,
  setDoc,
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
  await setDoc(
    ref,
    {
      uid,
      coinBalance: 0,
      fcmToken: null,
      healthPermissionGranted: false,
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    },
    { merge: true }
  );
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
