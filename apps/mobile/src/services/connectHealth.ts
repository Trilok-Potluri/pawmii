/**
 * Unified Health permission request flow.
 * Used by onboarding AND the home-screen reconnect banner.
 *
 * Returns a discriminated result so callers can render accurate UI — e.g.
 * "Health Connect needs an update" vs "go to settings to grant manually" vs
 * "denied".
 */

import { Platform } from "react-native";
import { requestHealthPermissions } from "./healthKit";
import {
  requestHealthConnectPermissions,
  getHealthConnectAvailability,
} from "./healthConnect";

export type ConnectHealthResult =
  /** All required permissions granted. */
  | { outcome: "granted" }
  /** User interacted with the sheet and declined. */
  | { outcome: "denied" }
  /**
   * HC rate-limited or suppressed the request. User must grant manually via
   * the Health Connect settings app.
   */
  | { outcome: "needs_settings" }
  /** HC not installed on this device (pre-Android-14 without the app). */
  | { outcome: "unavailable_not_installed" }
  /** HC is installed but needs to be updated from Play Store. */
  | { outcome: "unavailable_update_required" }
  /** Native error from the HC bridge. */
  | { outcome: "error"; message: string };

export async function connectHealth(): Promise<ConnectHealthResult> {
  try {
    if (Platform.OS === "ios") {
      const granted = await requestHealthPermissions();
      return { outcome: granted ? "granted" : "denied" };
    }

    const availability = await getHealthConnectAvailability();
    if (availability === "not_installed" || availability === "unknown") {
      return { outcome: "unavailable_not_installed" };
    }
    if (availability === "update_required") {
      return { outcome: "unavailable_update_required" };
    }

    const result = await requestHealthConnectPermissions();
    switch (result.kind) {
      case "granted":
        return { outcome: "granted" };
      case "denied":
        return { outcome: "denied" };
      case "needs_settings":
        return { outcome: "needs_settings" };
      case "error":
        return { outcome: "error", message: result.message };
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error requesting permissions";
    console.error("[connectHealth] error:", err);
    return { outcome: "error", message };
  }
}
