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
    await hc.initialize();
    const status = await hc.getSdkStatus();
    // SdkAvailabilityStatus.SDK_AVAILABLE = 3
    return status === 3;
  } catch {
    return false;
  }
}

const REQUIRED_PERMISSIONS = [
  { accessType: "read" as const, recordType: "Steps" as const },
  { accessType: "read" as const, recordType: "ActiveCaloriesBurned" as const },
];

function allRequiredGranted(granted: readonly { accessType: string; recordType: string }[]): boolean {
  return REQUIRED_PERMISSIONS.every((req) =>
    granted.some(
      (g) => g.accessType === req.accessType && g.recordType === req.recordType,
    ),
  );
}

/**
 * Requests Health Connect permissions for Steps + Active Calories.
 * Returns true only if both are granted.
 *
 * Throws the underlying native error on failure so the caller can surface it
 * (e.g. show an Alert). The native error usually means the MainActivity
 * permission delegate wasn't registered, or Health Connect isn't installed.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const hc = await getHC();
  if (!hc) return false;

  await hc.initialize();

  // requestPermission returns the list of granted permissions (no `granted`
  // field on the items). Cross-check against what we asked for.
  const granted = await hc.requestPermission([...REQUIRED_PERMISSIONS]);
  if (allRequiredGranted(granted)) return true;

  // Fallback: some devices return an incomplete array from requestPermission.
  // Re-check via the dedicated accessor before giving up.
  const current = await hc.getGrantedPermissions();
  return allRequiredGranted(current);
}

/**
 * Returns true iff Steps + ActiveCaloriesBurned read are already granted.
 * Does NOT trigger the system UI — use for silent checks on cold start.
 */
export async function hasHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const hc = await getHC();
  if (!hc) return false;
  try {
    await hc.initialize();
    const current = await hc.getGrantedPermissions();
    return allRequiredGranted(current);
  } catch {
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
