import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  FEED_COST_COINS,
  HUNGER_RESTORE_PER_FEED,
  HUNGER_MAX,
  DAILY_FEED_CAP,
  HUNGER_HAPPY_THRESHOLD,
  HUNGER_SAD_THRESHOLD,
} from "@pawmii/shared";
import type { FeedPetPayload, FeedPetResponse, Pet } from "@pawmii/shared";

const db = admin.firestore();

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
export const feedPet = functions
  .region("us-central1")
  .https.onCall(async (data: FeedPetPayload, context): Promise<FeedPetResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to feed a pet."
      );
    }

    const { uid, petId } = data;

    if (context.auth.uid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "UID mismatch.");
    }

    const petRef = db.collection("pets").doc(petId);
    const userRef = db.collection("users").doc(uid);

    try {
      const result = await db.runTransaction(async (tx) => {
        const [petSnap, userSnap] = await Promise.all([
          tx.get(petRef),
          tx.get(userRef),
        ]);

        if (!petSnap.exists) {
          throw new functions.https.HttpsError("not-found", "Pet not found.");
        }

        const pet = petSnap.data() as Pet;
        const userData = userSnap.data()!;

        // Verify pet ownership
        if (pet.uid !== uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "You do not own this pet."
          );
        }

        // Check coin balance
        const coinBalance: number = userData.coinBalance ?? 0;
        if (coinBalance < FEED_COST_COINS) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            `Insufficient coins. Need ${FEED_COST_COINS}, have ${coinBalance}.`
          );
        }

        // Check daily feed cap
        const dailyFeedCount: number = pet.dailyFeedCount ?? 0;
        if (dailyFeedCount >= DAILY_FEED_CAP) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            `Daily feed limit of ${DAILY_FEED_CAP} reached.`
          );
        }

        // Calculate new values
        const newHunger = Math.min(pet.hunger + HUNGER_RESTORE_PER_FEED, HUNGER_MAX);
        const newCoinBalance = coinBalance - FEED_COST_COINS;
        const newState =
          newHunger > HUNGER_HAPPY_THRESHOLD
            ? "happy"
            : newHunger >= HUNGER_SAD_THRESHOLD
            ? "neutral"
            : "sad";

        // Apply writes
        tx.update(petRef, {
          hunger: newHunger,
          computedState: newState,
          lastFedAt: admin.firestore.FieldValue.serverTimestamp(),
          dailyFeedCount: admin.firestore.FieldValue.increment(1),
        });

        tx.update(userRef, {
          coinBalance: newCoinBalance,
        });

        return { newHunger, newCoinBalance };
      });

      functions.logger.info(
        `[feedPet] uid=${uid} petId=${petId} newHunger=${result.newHunger} coinBalance=${result.newCoinBalance}`
      );

      return {
        success: true,
        newHunger: result.newHunger,
        newCoinBalance: result.newCoinBalance,
      };
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      functions.logger.error("[feedPet] Unexpected error:", err);
      throw new functions.https.HttpsError("internal", "Feed action failed.");
    }
  });
