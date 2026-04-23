import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { storeFcmToken } from "./firestore";

let cachedToken: string | null = null;
let pendingUid: string | null = null;

/**
 * Requests push notification permissions and sets up the foreground handler.
 * Does NOT store the token — call storePushTokenForUser(uid) once uid is available.
 *
 * IMPORTANT: we fetch the *native device* push token (FCM on Android, APNs on
 * iOS) via `getDevicePushTokenAsync`, NOT Expo's `getExpoPushTokenAsync`. Our
 * Cloud Function uses `admin.messaging().send({ token })` which only accepts
 * FCM tokens; Expo push tokens (ExponentPushToken[...]) would silently fail.
 */
export async function setupNotifications(): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Pawmii Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7B5CF6",
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn("[Notifications] No EAS projectId — push token skipped.");
    return;
  }

  try {
    // Native FCM / APNs device token — compatible with admin.messaging().send()
    const tokenData = await Notifications.getDevicePushTokenAsync();
    cachedToken = tokenData.data as string;
    // If a uid request raced ahead of us, flush it now.
    if (pendingUid) {
      await flushToken(pendingUid);
      pendingUid = null;
    }
  } catch (err) {
    console.error("[Notifications] getDevicePushTokenAsync error:", err);
  }
}

async function flushToken(uid: string): Promise<void> {
  if (!cachedToken || !uid) return;
  try {
    await storeFcmToken(uid, cachedToken);
  } catch (err) {
    console.error("[Notifications] storeFcmToken error:", err);
  }
}

/**
 * Stores the cached push token for the given uid in Firestore.
 * Safe to call multiple times. If the token isn't cached yet (setupNotifications
 * is still running), we queue the uid and flush as soon as the token arrives.
 */
export async function storePushTokenForUser(uid: string): Promise<void> {
  if (!uid) return;
  if (!cachedToken) {
    pendingUid = uid;
    return;
  }
  await flushToken(uid);
}
