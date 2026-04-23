import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/logger";
import { getDb, getMessaging } from "./utils/admin";
import {
  HUNGER_DECAY_PER_RUN,
  HUNGER_MIN,
  HUNGER_HAPPY_THRESHOLD,
  HUNGER_SAD_THRESHOLD,
  HUNGER_NOTIFY_THRESHOLD,
  HUNGER_NOTIFY_COOLDOWN_MINUTES,
  HUNGER_DECAY_SCHEDULE,
} from "@pawmii/shared";
import type { Pet } from "@pawmii/shared";


/**
 * hungerDecay — Scheduled Cloud Function
 *
 * Runs every 30 minutes.
 * For every pet document:
 *   1. Decrements hunger by HUNGER_DECAY_PER_RUN (4 pts)
 *   2. Floors at HUNGER_MIN (0)
 *   3. Recomputes computedState ("happy" | "neutral" | "sad")
 *   4. Sends FCM push if hunger just crossed below threshold
 *      (and cooldown has elapsed)
 */
export const hungerDecay = onSchedule(
  { schedule: HUNGER_DECAY_SCHEDULE, timeZone: "UTC", region: "us-central1" },
  async () => {
    const petsSnap = await getDb().collection("pets").get();

    if (petsSnap.empty) {
      logger.info("[hungerDecay] No pets found.");
      return;
    }

    const batch = getDb().batch();
    const notificationPromises: Promise<void>[] = [];

    petsSnap.forEach((doc) => {
      const pet = doc.data() as Pet;
      const prevHunger = pet.hunger;
      const newHunger = Math.max(prevHunger - HUNGER_DECAY_PER_RUN, HUNGER_MIN);

      const newState =
        newHunger > HUNGER_HAPPY_THRESHOLD ? "happy" : newHunger >= HUNGER_SAD_THRESHOLD ? "neutral" : "sad";

      batch.update(doc.ref, {
        hunger: newHunger,
        computedState: newState,
      });

      const crossedThreshold =
        prevHunger >= HUNGER_NOTIFY_THRESHOLD &&
        newHunger < HUNGER_NOTIFY_THRESHOLD;

      if (crossedThreshold) {
        notificationPromises.push(
          sendHungerNotification(pet.uid, pet.name)
        );
      }
    });

    await batch.commit();
    await Promise.allSettled(notificationPromises);

    logger.info(
      `[hungerDecay] Decayed ${petsSnap.size} pets by ${HUNGER_DECAY_PER_RUN} pts.`
    );
  }
);

/**
 * Sends a single FCM push notification if the user has a valid token
 * and hasn't received a hunger notification within the cooldown window.
 */
async function sendHungerNotification(uid: string, petName: string): Promise<void> {
  const userRef = getDb().collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return;

  const userData = userSnap.data()!;
  const fcmToken: string | null = userData.fcmToken ?? null;
  if (!fcmToken) return;

  const lastNotifiedAt: admin.firestore.Timestamp | null =
    userData.lastHungerNotifiedAt ?? null;
  if (lastNotifiedAt) {
    const minutesSinceLast =
      (Date.now() - lastNotifiedAt.toMillis()) / 60_000;
    if (minutesSinceLast < HUNGER_NOTIFY_COOLDOWN_MINUTES) {
      logger.info(
        `[sendHungerNotification] Cooldown active for uid=${uid}, skipping.`
      );
      return;
    }
  }

  const message: admin.messaging.Message = {
    token: fcmToken,
    notification: {
      title: `${petName} is hungry!`,
      body: "Head back and give them some love.",
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
      },
    },
  };

  try {
    await getMessaging().send(message);
    await userRef.update({
      lastHungerNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`[sendHungerNotification] Sent to uid=${uid}`);
  } catch (err) {
    logger.error(`[sendHungerNotification] Failed for uid=${uid}:`, err);
  }
}
