import * as admin from "firebase-admin";

/**
 * Returns today's date string in "YYYY-MM-DD" format for a given timezone.
 */
export function getTodayDateString(timezone: string): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: timezone }); // "en-CA" gives YYYY-MM-DD
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
