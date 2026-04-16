/**
 * HealthKit integration — iOS only
 * Reads Steps + Active Calories for today (current calendar day).
 * No background delivery in prototype — foreground fetch on app open only.
 */

import { Platform } from "react-native";
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from "react-native-health";

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [],
  },
};

/**
 * Requests HealthKit permissions.
 * Returns true if granted (iOS always shows the OS sheet; partial grants possible).
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) {
        console.error("[HealthKit] initHealthKit error:", err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

/**
 * Reads today's step count from HealthKit.
 * Uses calendar day (midnight to now) in local time.
 */
export async function readTodaySteps(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(
      { startDate: startOfDay.toISOString() },
      (err: string, result: HealthValue) => {
        if (err) {
          console.error("[HealthKit] getStepCount error:", err);
          resolve(0);
          return;
        }
        resolve(Math.round(result.value || 0));
      }
    );
  });
}

/**
 * Reads today's active energy burned (calories) from HealthKit.
 */
export async function readTodayActiveCalories(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: startOfDay.toISOString(),
        endDate: new Date().toISOString(),
      },
      (err: string, results: HealthValue[]) => {
        if (err) {
          console.error("[HealthKit] getActiveEnergyBurned error:", err);
          resolve(0);
          return;
        }
        const total = results.reduce((sum, r) => sum + (r.value || 0), 0);
        resolve(Math.round(total));
      }
    );
  });
}
