import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";

/**
 * dailyReset — Scheduled Cloud Function
 *
 * Runs at midnight UTC every day.
 * Resets dailyFeedCount to 0 on all pet documents so the daily cap
 * (DAILY_FEED_CAP = 10) refreshes correctly each day.
 *
 * Without this, the daily cap becomes a permanent lifetime cap after day 1.
 */
export const dailyReset = onSchedule(
  { schedule: "0 0 * * *", timeZone: "UTC", region: "us-central1" },
  async () => {
    const petsSnap = await getDb().collection("pets").get();

    if (petsSnap.empty) {
      logger.info("[dailyReset] No pets to reset.");
      return;
    }

    const BATCH_SIZE = 500;
    const docs = petsSnap.docs;
    let resetCount = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = getDb().batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => {
        batch.update(doc.ref, { dailyFeedCount: 0 });
      });
      await batch.commit();
      resetCount += chunk.length;
    }

    logger.info(`[dailyReset] Reset dailyFeedCount for ${resetCount} pets.`);
  }
);
