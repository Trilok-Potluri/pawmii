import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";
import {
  FEED_COST_COINS,
  HUNGER_RESTORE_PER_FEED,
  ATTR_MAX,
  DAILY_FEED_CAP,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
} from "@pawmii/shared";
import type { FeedPetPayload, FeedPetResponse, Pet } from "@pawmii/shared";


/**
 * feedPet — HTTP Callable
 *
 * Called by the mobile app when the user taps the Feed button.
 * Validates:
 *   - Caller is authenticated
 *   - Pet belongs to the calling user
 *   - User has enough coins (>= FEED_COST_COINS)
 *   - Daily feed cap has not been reached (max DAILY_FEED_CAP per day)
 *
 * On success:
 *   - Increments pet hunger by HUNGER_RESTORE_PER_FEED (capped at HUNGER_MAX)
 *   - Deducts FEED_COST_COINS from coinBalance
 *   - Recomputes computedState
 *   - Updates lastFedAt server timestamp
 *   - Increments dailyFeedCount
 */
export const feedPet = onCall(
  { region: "us-central1" },
  async (request): Promise<FeedPetResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to feed a pet."
      );
    }

    const { uid, petId } = request.data as FeedPetPayload;

    if (request.auth.uid !== uid) {
      throw new HttpsError("permission-denied", "UID mismatch.");
    }

    const petRef = getDb().collection("pets").doc(petId);
    const userRef = getDb().collection("users").doc(uid);

    try {
      const result = await getDb().runTransaction(async (tx) => {
        const [petSnap, userSnap] = await Promise.all([
          tx.get(petRef),
          tx.get(userRef),
        ]);

        if (!petSnap.exists) {
          throw new HttpsError("not-found", "Pet not found.");
        }

        const pet = petSnap.data() as Pet;
        // User doc may be missing if calculateCoins hasn't run yet (we no
        // longer initialize coinBalance client-side). Treat it as an
        // insufficient-coins failure rather than a crash.
        const userData = userSnap.exists ? userSnap.data()! : {};

        if (pet.uid !== uid) {
          throw new HttpsError("permission-denied", "You do not own this pet.");
        }

        const coinBalance: number = userData.coinBalance ?? 0;
        if (coinBalance < FEED_COST_COINS) {
          throw new HttpsError(
            "failed-precondition",
            `Insufficient coins. Need ${FEED_COST_COINS}, have ${coinBalance}.`
          );
        }

        const dailyFeedCount: number = pet.dailyFeedCount ?? 0;
        if (dailyFeedCount >= DAILY_FEED_CAP) {
          throw new HttpsError(
            "resource-exhausted",
            `Daily feed limit of ${DAILY_FEED_CAP} reached.`
          );
        }

        const newHunger = Math.min(pet.hunger + HUNGER_RESTORE_PER_FEED, ATTR_MAX);
        const newCoinBalance = coinBalance - FEED_COST_COINS;
        const lowest = Math.min(newHunger, pet.playfulness ?? 0, pet.cleanliness ?? 0);
        const newState =
          lowest > ATTR_HAPPY_THRESHOLD ? "happy" : lowest >= ATTR_SAD_THRESHOLD ? "neutral" : "sad";

        tx.update(petRef, {
          hunger: newHunger,
          computedState: newState,
          lastFedAt: admin.firestore.FieldValue.serverTimestamp(),
          dailyFeedCount: admin.firestore.FieldValue.increment(1),
        });

        // set+merge so we don't crash if the user doc doesn't exist yet.
        tx.set(userRef, { coinBalance: newCoinBalance }, { merge: true });

        return { newHunger, newCoinBalance };
      });

      logger.info(
        `[feedPet] uid=${uid} petId=${petId} newHunger=${result.newHunger} coinBalance=${result.newCoinBalance}`
      );

      return {
        success: true,
        newHunger: result.newHunger,
        newCoinBalance: result.newCoinBalance,
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("[feedPet] Unexpected error:", err);
      throw new HttpsError("internal", "Feed action failed.");
    }
  }
);
