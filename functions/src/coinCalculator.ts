import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";
import {
  COINS_PER_1000_STEPS,
  COINS_PER_100_CALORIES,
  DAILY_BOTH_METRICS_BONUS,
  DAILY_COIN_CAP,
  STEPS_COIN_CAP,
  CALORIES_COIN_CAP,
} from "@pawmii/shared";
import type { CalculateCoinsPayload, HealthLog } from "@pawmii/shared";
import { getHealthLogRef, getTodayDateString, getYesterdayDateString } from "./utils/firestore";


/**
 * calculateCoins — HTTP Callable
 *
 * Called by the mobile app on every foreground health sync.
 * Receives raw step + calorie data from HealthKit / Health Connect.
 * Calculates coins, enforces daily cap, writes authoritative record to Firestore.
 * Client NEVER writes coin values — this function is the only writer.
 */
export const calculateCoins = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to calculate coins."
      );
    }

    const data = request.data as CalculateCoinsPayload;
    const { uid, date, steps, activeCalories, timezone } = data;

    if (request.auth.uid !== uid) {
      throw new HttpsError("permission-denied", "UID mismatch.");
    }

    const todayForUser     = getTodayDateString(timezone);
    const yesterdayForUser = getYesterdayDateString(timezone);
    if (date !== todayForUser && date !== yesterdayForUser) {
      throw new HttpsError(
        "invalid-argument",
        `Date ${date} is not today (${todayForUser}) or yesterday (${yesterdayForUser}) in timezone ${timezone}.`
      );
    }

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

    const healthLogRef = getHealthLogRef(getDb(), uid, date);
    const userRef = getDb().collection("users").doc(uid);

    await getDb().runTransaction(async (tx) => {
      const existingLog = await tx.get(healthLogRef);
      const previousCoinsToday = existingLog.exists
        ? (existingLog.data() as HealthLog).coinsEarned
        : 0;

      const coinDelta = totalCoinsToday - previousCoinsToday;

      const healthLogData: HealthLog = {
        date,
        steps,
        activeCalories,
        coinsEarned: totalCoinsToday,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as any,
      };
      tx.set(healthLogRef, healthLogData, { merge: true });

      if (coinDelta > 0) {
        // Use set+merge instead of update so this doesn't fail if user doc is missing
        tx.set(
          userRef,
          { coinBalance: admin.firestore.FieldValue.increment(coinDelta) },
          { merge: true }
        );
      }
    });

    logger.info(`[calculateCoins] uid=${uid} date=${date} steps=${steps} cals=${activeCalories} coins=${totalCoinsToday}`);

    return {
      coinsEarnedToday: totalCoinsToday,
      breakdown: { stepsCoins, calorieCoins, bonus },
    };
  }
);
