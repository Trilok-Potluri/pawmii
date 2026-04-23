/**
 * Health Connect integration — Android only
 * Reads Steps + Active Calories for a given date range.
 * Android 14+ (API 34) required — Health Connect is built-in.
 * Foreground fetch only in prototype.
 */

import { Platform } from "react-native";

let HC: typeof import("react-native-health-connect") | null = null;
let hcInitialized = false;

async function getHC() {
  if (Platform.OS !== "android") return null;
  if (!HC) {
    HC = await import("react-native-health-connect");
  }
  if (!hcInitialized) {
    await HC.initialize();
    hcInitialized = true;
  }
  return HC;
}

// Mirrors androidx.health.connect.client.HealthConnectClient.SdkAvailabilityStatus
export type HcAvailability =
  | "available"
  | "not_installed"
  | "update_required"
  | "unknown";

export async function getHealthConnectAvailability(): Promise<HcAvailability> {
  if (Platform.OS !== "android") return "unknown";
  const hc = await getHC();
  if (!hc) return "unknown";
  try {
    const status = await hc.getSdkStatus();
    console.log("[HealthConnect] getSdkStatus =", status);
    if (status === 3) return "available";
    if (status === 2) return "update_required";
    return "not_installed";
  } catch (err) {
    console.error("[HealthConnect] getSdkStatus error:", err);
    return "unknown";
  }
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  return (await getHealthConnectAvailability()) === "available";
}

const REQUIRED_PERMISSIONS = [
  { accessType: "read" as const, recordType: "Steps" as const },
  { accessType: "read" as const, recordType: "ActiveCaloriesBurned" as const },
];

type GrantedPerm = { accessType: string; recordType: string };

function allRequiredGranted(granted: readonly GrantedPerm[]): boolean {
  return REQUIRED_PERMISSIONS.every((req) =>
    granted.some((g) => g.accessType === req.accessType && g.recordType === req.recordType)
  );
}

function countRequiredGranted(granted: readonly GrantedPerm[]): number {
  return REQUIRED_PERMISSIONS.filter((req) =>
    granted.some((g) => g.accessType === req.accessType && g.recordType === req.recordType)
  ).length;
}

export type RequestPermissionOutcome =
  | { kind: "granted" }
  | { kind: "denied"; grantedCount: number }
  | { kind: "needs_settings" }
  | { kind: "error"; message: string };

export async function requestHealthConnectPermissions(): Promise<RequestPermissionOutcome> {
  if (Platform.OS !== "android") {
    return { kind: "error", message: "Health Connect is Android-only" };
  }
  const hc = await getHC();
  if (!hc) return { kind: "error", message: "Module not linked" };

  try {
    const before      = (await hc.getGrantedPermissions()) as GrantedPerm[];
    const beforeCount = countRequiredGranted(before);
    console.log("[HealthConnect] granted before request:", before);

    if (beforeCount === REQUIRED_PERMISSIONS.length) return { kind: "granted" };

    const requested = await hc.requestPermission([...REQUIRED_PERMISSIONS]);
    console.log("[HealthConnect] requestPermission returned:", requested);

    const after      = (await hc.getGrantedPermissions()) as GrantedPerm[];
    const afterCount = countRequiredGranted(after);
    console.log("[HealthConnect] granted after request:", after);

    if (allRequiredGranted(after)) return { kind: "granted" };

    if (afterCount === 0 && beforeCount === 0 && requested.length === 0) {
      return { kind: "needs_settings" };
    }

    return { kind: "denied", grantedCount: afterCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[HealthConnect] requestPermission native error:", err);
    return { kind: "error", message };
  }
}

export async function hasHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const hc = await getHC();
  if (!hc) return false;
  try {
    const current = (await hc.getGrantedPermissions()) as GrantedPerm[];
    return allRequiredGranted(current);
  } catch {
    return false;
  }
}

export async function openHealthConnectSettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  const hc = await getHC();
  if (!hc) return;
  try {
    hc.openHealthConnectSettings();
  } catch (err) {
    console.error("[HealthConnect] openHealthConnectSettings error:", err);
  }
}

/**
 * Reads step count between two timestamps.
 * Pass startOfDay + now for today, or startOfYesterday + startOfToday for yesterday.
 */
export async function readStepsAndroid(startTime: Date, endTime: Date): Promise<number> {
  if (Platform.OS !== "android") return 0;
  const hc = await getHC();
  if (!hc) return 0;

  try {
    const result = await hc.readRecords("Steps", {
      timeRangeFilter: {
        operator: "between",
        startTime: startTime.toISOString(),
        endTime:   endTime.toISOString(),
      },
    });

    const total = result.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    console.log(`[HealthConnect] Steps ${startTime.toISOString().slice(0,10)}: ${total}`);
    return total;
  } catch (err) {
    console.error("[HealthConnect] readRecords Steps error:", err);
    return 0;
  }
}

/**
 * Reads active calories burned between two timestamps.
 * Energy is in kilocalories (kcal).
 */
export async function readCaloriesAndroid(startTime: Date, endTime: Date): Promise<number> {
  if (Platform.OS !== "android") return 0;
  const hc = await getHC();
  if (!hc) return 0;

  try {
    const result = await hc.readRecords("ActiveCaloriesBurned", {
      timeRangeFilter: {
        operator: "between",
        startTime: startTime.toISOString(),
        endTime:   endTime.toISOString(),
      },
    });

    const total = Math.round(
      result.records.reduce((sum: number, r: any) => {
        // react-native-health-connect v3 returns energy as { inKilocalories, inCalories, ... }
        const kcal = r.energy?.inKilocalories ?? r.energy?.inCalories ?? 0;
        return sum + kcal;
      }, 0)
    );
    console.log(`[HealthConnect] Calories ${startTime.toISOString().slice(0,10)}: ${total} kcal`);
    return total;
  } catch (err) {
    console.error("[HealthConnect] readRecords Calories error:", err);
    return 0;
  }
}

// Convenience wrappers kept for backward-compat callsites
export async function readTodayStepsAndroid(): Promise<number> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return readStepsAndroid(start, new Date());
}

export async function readTodayCaloriesAndroid(): Promise<number> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return readCaloriesAndroid(start, new Date());
}
