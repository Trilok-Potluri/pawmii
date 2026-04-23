import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";
import {
  PLAY_COST_COINS,
  PLAYFULNESS_RESTORE_PER_PLAY,
  ATTR_MAX,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
  DAILY_PLAY_CAP,
} from "@pawmii/shared";
import type { PlayPetPayload, PlayPetResponse, Pet } from "@pawmii/shared";

function computeState(hunger: number, playfulness: number, cleanliness: number) {
  const lowest = Math.min(hunger, playfulness, cleanliness);
  return lowest > ATTR_HAPPY_THRESHOLD ? "happy" : lowest >= ATTR_SAD_THRESHOLD ? "neutral" : "sad";
}

export const playWithPet = onCall(
  { region: "us-central1" },
  async (request): Promise<PlayPetResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated to play with a pet.");
    }

    const { uid, petId } = request.data as PlayPetPayload;

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
        if (coinBalance < PLAY_COST_COINS) {
          throw new HttpsError(
            "failed-precondition",
            `Insufficient coins. Need ${PLAY_COST_COINS}, have ${coinBalance}.`
          );
        }

        const dailyPlayCount: number = pet.dailyPlayCount ?? 0;
        if (dailyPlayCount >= DAILY_PLAY_CAP) {
          throw new HttpsError("resource-exhausted", `Daily play limit of ${DAILY_PLAY_CAP} reached.`);
        }

        const newPlayfulness = Math.min((pet.playfulness ?? 0) + PLAYFULNESS_RESTORE_PER_PLAY, ATTR_MAX);
        const newCoinBalance = coinBalance - PLAY_COST_COINS;
        const newState       = computeState(pet.hunger ?? 0, newPlayfulness, pet.cleanliness ?? 0);

        tx.update(petRef, {
          playfulness:   newPlayfulness,
          computedState: newState,
          lastPlayedAt:  admin.firestore.FieldValue.serverTimestamp(),
          dailyPlayCount: admin.firestore.FieldValue.increment(1),
        });
        tx.set(userRef, { coinBalance: newCoinBalance }, { merge: true });

        return { newPlayfulness, newCoinBalance };
      });

      logger.info(`[playWithPet] uid=${uid} petId=${petId} playfulness=${result.newPlayfulness}`);

      return { success: true, newPlayfulness: result.newPlayfulness, newCoinBalance: result.newCoinBalance };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("[playWithPet] Unexpected error:", err);
      throw new HttpsError("internal", "Play action failed.");
    }
  }
);
