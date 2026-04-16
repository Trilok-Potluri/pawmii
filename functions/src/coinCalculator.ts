import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  COINS_PER_1000_STEPS,
  COINS_PER_100_CALORIES,
  DAILY_BOTH_METRICS_BONUS,
  DAILY_COIN_CAP,
  STEPS_COIN_CAP,
  CALORIES_COIN_CAP,
} from "@pawmii/shared";
import type { CalculateCoinsPayload, HealthLog } from "@pawmii/shared";
import { getHealthLogRef, getTodayDateString } from "./utils/firestore";

const db = admin.firestore();

/**
 * calculateCoins — HTTP Callable
 *
 * Called by the mobile app on every foreground health sync.
 * Receives raw step + calorie data from HealthKit / Health Connect.
 * Calculates coins, enforces daily cap, writes authoritative record to Firestore.
 * Client NEVER writes coin values — this function is the only writer.
 */
export const calculateCoins = functions
  .region("us-central1")
  .https.onCall(async (data: CalculateCoinsPayload, context) => {
    // Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to calculate coins."
      );
    }

    const { uid, date, steps, activeCalories, timezone } = data;

    // Validate caller matches UID in payload
    if (context.auth.uid !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "UID mismatch."
      );
    }

    // Validate date matches today in the user's timezone
    const todayForUser = getTodayDateString(timezone);
    if (date !== todayForUser) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Date ${date} does not match today (${todayForUser}) in timezone ${timezone}.`
      );
    }

    // Calculate coins — server side only
    const effectiveSteps = Math.min(steps, STEPS_COIN_CAP);
    const effectiveCalories = Math.min(activeCalories, CALORIES_COIN_CAP);

    const stepsCoins = Math.floor(effectiveSteps / 1000) * COINS_PER_1000_STEPS;
    const calorieCoins = Math.floor(effectiveCalories / 100) * COINS_PER_100_CALORIES;
    const bothContribute = stepsCoins > 0 && calorieCoins > 0;
    const bonus = bothContribute ? DAILY_BOTH_METRICS_BONUS : 0;

    const totalCoinsToday = Math.min(
      stepsCoins + calorieCoins + bonus,
      DAILY_COIN_CAP
    );

    const healthLogRef = getHealthLogRef(db, uid, date);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (tx) => {
      const existingLog = await tx.get(healthLogRef);
      const previousCoinsToday = existingLog.exists
        ? (existingLog.data() as HealthLog).coinsEarned
        : 0;

      const coinDelta = totalCoinsToday - previousCoinsToday;

      // Write updated health log
      const healthLogData: HealthLog = {
        date,
        steps,
        activeCalories,
        coinsEarned: totalCoinsToday,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as any,
      };
      tx.set(healthLogRef, healthLogData, { merge: true });

      // Increment coin balance by delta (only add new coins earned today)
      if (coinDelta > 0) {
        tx.update(userRef, {
          coinBalance: admin.firestore.FieldValue.increment(coinDelta),
        });
      }
    });

    functions.logger.info(`[calculateCoins] uid=${uid} date=${date} steps=${steps} cals=${activeCalories} coins=${totalCoinsToday}`);

    return {
      coinsEarnedToday: totalCoinsToday,
      breakdown: { stepsCoins, calorieCoins, bonus },
    };
  });
