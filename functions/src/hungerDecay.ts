import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
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

const db = admin.firestore();
const messaging = admin.messaging();

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
export const hungerDecay = functions
  .region("us-central1")
  .pubsub.schedule(HUNGER_DECAY_SCHEDULE)
  .timeZone("UTC")
  .onRun(async () => {
    const petsSnap = await db.collection("pets").get();

    if (petsSnap.empty) {
      functions.logger.info("[hungerDecay] No pets found.");
      return null;
    }

    const batch = db.batch();
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

      // Trigger notification if crossing the sad threshold for the first time
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

    functions.logger.info(
      `[hungerDecay] Decayed ${petsSnap.size} pets by ${HUNGER_DECAY_PER_RUN} pts.`
    );
    return null;
  });

/**
 * Sends a single FCM push notification if the user has a valid token
 * and hasn't received a hunger notification within the cooldown window.
 */
async function sendHungerNotification(uid: string, petName: string): Promise<void> {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return;

  const userData = userSnap.data()!;
  const fcmToken: string | null = userData.fcmToken ?? null;
  if (!fcmToken) return;

  // Cooldown check
  const lastNotifiedAt: admin.firestore.Timestamp | null =
    userData.lastHungerNotifiedAt ?? null;
  if (lastNotifiedAt) {
    const minutesSinceLast =
      (Date.now() - lastNotifiedAt.toMillis()) / 60_000;
    if (minutesSinceLast < HUNGER_NOTIFY_COOLDOWN_MINUTES) {
      functions.logger.info(
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
    await messaging.send(message);
    await userRef.update({
      lastHungerNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info(`[sendHungerNotification] Sent to uid=${uid}`);
  } catch (err) {
    functions.logger.error(`[sendHungerNotification] Failed for uid=${uid}:`, err);
  }
}
