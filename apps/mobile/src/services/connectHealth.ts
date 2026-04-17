/**
 * Unified Health permission request flow.
 * Used by onboarding AND the home-screen reconnect banner.
 *
 * Returns a discriminated result so callers can tell the difference between
 * "user denied", "Health Connect missing", and "native error" — and surface
 * the right UI for each.
 */

import { Platform } from "react-native";
import { requestHealthPermissions } from "./healthKit";
import {
  requestHealthConnectPermissions,
  isHealthConnectAvailable,
} from "./healthConnect";

export type ConnectHealthResult =
  | { outcome: "granted" }
  | { outcome: "denied" }
  | { outcome: "unavailable" } // Android only — HC not installed / not supported
  | { outcome: "error"; message: string };

export async function connectHealth(): Promise<ConnectHealthResult> {
  try {
    if (Platform.OS === "ios") {
      const granted = await requestHealthPermissions();
      return { outcome: granted ? "granted" : "denied" };
    }

    const available = await isHealthConnectAvailable();
    if (!available) return { outcome: "unavailable" };

    const granted = await requestHealthConnectPermissions();
    return { outcome: granted ? "granted" : "denied" };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error requesting permissions";
    console.error("[connectHealth] error:", err);
    return { outcome: "error", message };
  }
}
