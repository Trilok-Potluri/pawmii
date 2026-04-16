/**
 * Health Connect integration — Android only
 * Reads Steps + Active Calories for today.
 * Android 14+ (API 34) required — Health Connect is built-in.
 * Foreground fetch only in prototype.
 */

import { Platform } from "react-native";

// Dynamic import to avoid loading on iOS
let HC: typeof import("react-native-health-connect") | null = null;

async function getHC() {
  if (Platform.OS !== "android") return null;
  if (!HC) {
    HC = await import("react-native-health-connect");
  }
  return HC;
}

/**
 * Checks if Health Connect is available on the device.
 * Returns false on Android < 14 or if not installed.
 */
export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const hc = await getHC();
  if (!hc) return false;
  try {
    const status = await hc.getSdkStatus();
    // SdkAvailabilityStatus.SDK_AVAILABLE = 3
    return status === 3;
  } catch {
    return false;
  }
}

/**
 * Requests Health Connect permissions for Steps and Active Calories.
 * Returns true if both are granted.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const hc = await getHC();
  if (!hc) return false;

  try {
    await hc.initialize();
    const granted = await hc.requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
    ]);
    return granted.every((g: any) => g.granted);
  } catch (err) {
    console.error("[HealthConnect] requestPermission error:", err);
    return false;
  }
}

/**
 * Reads today's step count from Health Connect.
 */
export async function readTodayStepsAndroid(): Promise<number> {
  if (Platform.OS !== "android") return 0;
  const hc = await getHC();
  if (!hc) return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const result = await hc.readRecords("Steps", {
      timeRangeFilter: {
        operator: "between",
        startTime: startOfDay.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    return result.records.reduce(
      (sum: number, r: any) => sum + (r.count || 0),
      0
    );
  } catch (err) {
    console.error("[HealthConnect] readRecords Steps error:", err);
    return 0;
  }
}

/**
 * Reads today's active calories from Health Connect.
 */
export async function readTodayCaloriesAndroid(): Promise<number> {
  if (Platform.OS !== "android") return 0;
  const hc = await getHC();
  if (!hc) return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const result = await hc.readRecords("ActiveCaloriesBurned", {
      timeRangeFilter: {
        operator: "between",
        startTime: startOfDay.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    return Math.round(
      result.records.reduce(
        (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
        0
      )
    );
  } catch (err) {
    console.error("[HealthConnect] readRecords Calories error:", err);
    return 0;
  }
}
