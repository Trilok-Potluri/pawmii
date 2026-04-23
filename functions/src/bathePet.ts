import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";
import {
  BATHE_COST_COINS,
  CLEANLINESS_RESTORE_PER_BATHE,
  ATTR_MAX,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
  DAILY_BATHE_CAP,
} from "@pawmii/shared";
import type { BathePetPayload, BathePetResponse, Pet } from "@pawmii/shared";

function computeState(hunger: number, playfulness: number, cleanliness: number) {
  const lowest = Math.min(hunger, playfulness, cleanliness);
  return lowest > ATTR_HAPPY_THRESHOLD ? "happy" : lowest >= ATTR_SAD_THRESHOLD ? "neutral" : "sad";
}

export const bathePet = onCall(
  { region: "us-central1" },
  async (request): Promise<BathePetResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated to bathe a pet.");
    }

    const { uid, petId } = request.data as BathePetPayload;

    if (request.auth.uid !== uid) {
      throw new HttpsError("permission-denied", "UID mismatch.");
    }

    const petRef  = getDb().collection("pets").doc(petId);
    const userRef = getDb().collection("users").doc(uid);

    try {
      const result = await getDb().runTransaction(async (tx) => {
        const [petSnap, userSnap] = await Promise.all([tx.get(petRef), tx.get(userRef)]);

        if (!petSnap.exists) throw new HttpsError("not-found", "Pet not found.");

        const pet      = petSnap.data() as Pet;
        const userData = userSnap.exists ? userSnap.data()! : {};

        if (pet.uid !== uid) throw new HttpsError("permission-denied", "You do not own this pet.");

        const coinBalance: number = userData.coinBalance ?? 0;
        if (coinBalance < BATHE_COST_COINS) {
          throw new HttpsError(
            "failed-precondition",
            `Insufficient coins. Need ${BATHE_COST_COINS}, have ${coinBalance}.`
          );
        }

        const dailyBatheCount: number = pet.dailyBatheCount ?? 0;
        if (dailyBatheCount >= DAILY_BATHE_CAP) {
          throw new HttpsError("resource-exhausted", `Daily bathe limit of ${DAILY_BATHE_CAP} reached.`);
        }

        const newCleanliness = Math.min((pet.cleanliness ?? 0) + CLEANLINESS_RESTORE_PER_BATHE, ATTR_MAX);
        const newCoinBalance  = coinBalance - BATHE_COST_COINS;
        const newState        = computeState(pet.hunger ?? 0, pet.playfulness ?? 0, newCleanliness);

        tx.update(petRef, {
          cleanliness:    newCleanliness,
          computedState:  newState,
          lastBathedAt:   admin.firestore.FieldValue.serverTimestamp(),
          dailyBatheCount: admin.firestore.FieldValue.increment(1),
        });
        tx.set(userRef, { coinBalance: newCoinBalance }, { merge: true });

        return { newCleanliness, newCoinBalance };
      });

      logger.info(`[bathePet] uid=${uid} petId=${petId} cleanliness=${result.newCleanliness}`);

      return { success: true, newCleanliness: result.newCleanliness, newCoinBalance: result.newCoinBalance };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("[bathePet] Unexpected error:", err);
      throw new HttpsError("internal", "Bathe action failed.");
    }
  }
);
