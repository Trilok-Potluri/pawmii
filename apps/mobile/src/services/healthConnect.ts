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

// Mirrors androidx.health.connect.client.HealthConnectClient.SdkAvailabilityStatus
// 0 = unavailable, 1 = provider update required, 2 = (reserved), 3 = available
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
    await hc.initialize();
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

/**
 * Back-compat helper — true iff HC is available. Prefer
 * getHealthConnectAvailability() for richer outcomes.
 */
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
    granted.some(
      (g) => g.accessType === req.accessType && g.recordType === req.recordType,
    ),
  );
}

function countRequiredGranted(granted: readonly GrantedPerm[]): number {
  return REQUIRED_PERMISSIONS.filter((req) =>
    granted.some(
      (g) => g.accessType === req.accessType && g.recordType === req.recordType,
    ),
  ).length;
}

export type RequestPermissionOutcome =
  /** All required permissions are granted. */
  | { kind: "granted" }
  /** User saw the UI and declined (at least one required perm missing). */
  | { kind: "denied"; grantedCount: number }
  /**
   * The request resolved but nothing changed AND nothing is granted — Health
   * Connect silently suppressed the UI (typical after 2+ denies, or when the
   * system blocks the request). User must grant manually via settings.
   */
  | { kind: "needs_settings" }
  /** Native error while talking to Health Connect. */
  | { kind: "error"; message: string };

/**
 * Requests Health Connect permissions for Steps + Active Calories.
 *
 * Distinguishes three failure shapes so the UI can respond appropriately:
 *   - granted:        everything we need
 *   - denied:         user interacted with the sheet and declined
 *   - needs_settings: sheet never appeared (rate-limited or system-suppressed)
 *   - error:          native call failed
 */
export async function requestHealthConnectPermissions(): Promise<RequestPermissionOutcome> {
  if (Platform.OS !== "android") {
    return { kind: "error", message: "Health Connect is Android-only" };
  }
  const hc = await getHC();
  if (!hc) return { kind: "error", message: "Module not linked" };

  try {
    await hc.initialize();

    // Snapshot state BEFORE, so we can detect "UI never showed" (nothing
    // changed AND nothing is granted).
    const before = (await hc.getGrantedPermissions()) as GrantedPerm[];
    const beforeCount = countRequiredGranted(before);
    console.log("[HealthConnect] granted before request:", before);

    if (beforeCount === REQUIRED_PERMISSIONS.length) {
      return { kind: "granted" };
    }

    const requested = await hc.requestPermission([...REQUIRED_PERMISSIONS]);
    console.log("[HealthConnect] requestPermission returned:", requested);

    // Some devices return an incomplete array from requestPermission — re-poll
    // via the dedicated accessor as the authoritative source of truth.
    const after = (await hc.getGrantedPermissions()) as GrantedPerm[];
    const afterCount = countRequiredGranted(after);
    console.log("[HealthConnect] granted after request:", after);

    if (allRequiredGranted(after)) {
      return { kind: "granted" };
    }

    // Nothing was granted AND nothing changed vs before → the UI never
    // appeared. This is the rate-limit / suppression case.
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
    const current = (await hc.getGrantedPermissions()) as GrantedPerm[];
    return allRequiredGranted(current);
  } catch {
    return false;
  }
}

/**
 * Opens the Health Connect settings screen so the user can grant permissions
 * manually. This is the escape hatch when requestPermission() is rate-limited
 * by Android (i.e. after 2 prior denies).
 */
export async function openHealthConnectSettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  const hc = await getHC();
  if (!hc) return;
  try {
    await hc.initialize();
    hc.openHealthConnectSettings();
  } catch (err) {
    console.error("[HealthConnect] openHealthConnectSettings error:", err);
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
