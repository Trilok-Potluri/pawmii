import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { storeFcmToken } from "./firestore";
import { useUserStore } from "../store/userStore";

/**
 * Requests push notification permissions and stores the FCM/Expo push token.
 * Called once on app launch (App.tsx).
 * Prototype: single notification type (hunger alert), no re-prompt on denial.
 */
export async function setupNotifications(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== "granted") {
    return;
  }

  // Handle notifications while app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Android: set default notification channel before requesting token
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Pawmii Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7B5CF6",
    });
  }

  // Expo push token — projectId required for production builds
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn("[Notifications] No EAS projectId found — push token skipped.");
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const uid = useUserStore.getState().uid;
    if (uid && token) {
      await storeFcmToken(uid, token);
    }
  } catch (err) {
    console.error("[Notifications] getExpoPushTokenAsync error:", err);
  }
}
