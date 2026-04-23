import * as admin from "firebase-admin";

/**
 * Returns today's date string in "YYYY-MM-DD" format for a given timezone.
 */
export function getTodayDateString(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Returns yesterday's date string in "YYYY-MM-DD" format for a given timezone.
 * Used to accept late-written health data (e.g. Whoop writes at 11:59 PM).
 */
export function getYesterdayDateString(timezone: string): string {
  const yesterday = new Date(Date.now() - 86_400_000);
  return yesterday.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Returns today's UTC date string in "YYYY-MM-DD" format.
 */
export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Gets a Firestore document reference for a user's health log for a given date.
 */
export function getHealthLogRef(
  db: admin.firestore.Firestore,
  uid: string,
  date: string
): admin.firestore.DocumentReference {
  return db.collection("users").doc(uid).collection("healthLogs").doc(date);
}

/**
 * Gets all active pet documents (hunger > 0 OR all pets for scheduled runs).
 */
export async function getAllPets(
  db: admin.firestore.Firestore
): Promise<admin.firestore.QuerySnapshot> {
  return db.collection("pets").get();
}
