import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * dailyReset — Scheduled Cloud Function
 *
 * Runs at midnight UTC every day.
 * Resets dailyFeedCount to 0 on all pet documents so the daily cap
 * (DAILY_FEED_CAP = 10) refreshes correctly each day.
 *
 * Without this, the daily cap becomes a permanent lifetime cap after day 1.
 */
export const dailyReset = functions
  .region("us-central1")
  .pubsub.schedule("0 0 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const petsSnap = await db.collection("pets").get();

    if (petsSnap.empty) {
      functions.logger.info("[dailyReset] No pets to reset.");
      return null;
    }

    // Write in batches of 500 (Firestore batch limit)
    const BATCH_SIZE = 500;
    const docs = petsSnap.docs;
    let resetCount = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => {
        batch.update(doc.ref, { dailyFeedCount: 0 });
      });
      await batch.commit();
      resetCount += chunk.length;
    }

    functions.logger.info(`[dailyReset] Reset dailyFeedCount for ${resetCount} pets.`);
    return null;
  });
