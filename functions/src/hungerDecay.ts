import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/logger";
import { getDb } from "./utils/admin";
import {
  HUNGER_DECAY_PER_RUN,
  PLAYFULNESS_DECAY_PER_RUN,
  CLEANLINESS_DECAY_PER_RUN,
  ATTR_MAX,
  ATTR_MIN,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
  PET_DECAY_SCHEDULE,
} from "@pawmii/shared";
import type { Pet, PetComputedState } from "@pawmii/shared";

function computeState(hunger: number, playfulness: number, cleanliness: number): PetComputedState {
  const lowest = Math.min(hunger, playfulness, cleanliness);
  if (lowest > ATTR_HAPPY_THRESHOLD) return "happy";
  if (lowest >= ATTR_SAD_THRESHOLD) return "neutral";
  return "sad";
}

/**
 * petDecay — Scheduled Cloud Function
 *
 * Runs every 30 minutes. For every pet document:
 *   - Hunger decays 4 pts/run  (8 pts/hr  → empty ~12.5h)
 *   - Playfulness decays 2 pts/run (4 pts/hr → empty ~25h)
 *   - Cleanliness decays 1 pt/run  (2 pts/hr → empty ~50h)
 *   - computedState is driven by min(hunger, playfulness, cleanliness)
 */
export const hungerDecay = onSchedule(
  { schedule: PET_DECAY_SCHEDULE, timeZone: "UTC", region: "us-central1" },
  async () => {
    const petsSnap = await getDb().collection("pets").get();

    if (petsSnap.empty) {
      logger.info("[petDecay] No pets found.");
      return;
    }

    const batch = getDb().batch();

    petsSnap.forEach((doc) => {
      const pet = doc.data() as Pet;

      const newHunger      = Math.max((pet.hunger      ?? ATTR_MAX) - HUNGER_DECAY_PER_RUN,      ATTR_MIN);
      const newPlayfulness = Math.max((pet.playfulness  ?? ATTR_MAX) - PLAYFULNESS_DECAY_PER_RUN, ATTR_MIN);
      const newCleanliness = Math.max((pet.cleanliness  ?? ATTR_MAX) - CLEANLINESS_DECAY_PER_RUN, ATTR_MIN);
      const newState       = computeState(newHunger, newPlayfulness, newCleanliness);

      batch.update(doc.ref, {
        hunger:      newHunger,
        playfulness: newPlayfulness,
        cleanliness: newCleanliness,
        computedState: newState,
      });
    });

    await batch.commit();

    logger.info(
      `[petDecay] Decayed ${petsSnap.size} pets. ` +
      `hunger-${HUNGER_DECAY_PER_RUN} playfulness-${PLAYFULNESS_DECAY_PER_RUN} cleanliness-${CLEANLINESS_DECAY_PER_RUN}`
    );
  }
);
