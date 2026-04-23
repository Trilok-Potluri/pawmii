import { useCallback } from "react";
import { Platform } from "react-native";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, getFirebaseAuth, signInAnonymously } from "../services/firebase";
import { readTodaySteps, readTodayActiveCalories } from "../services/healthKit";
import {
  readTodayStepsAndroid,
  readTodayCaloriesAndroid,
} from "../services/healthConnect";
import { useHealthStore } from "../store/healthStore";
import { useUserStore } from "../store/userStore";
import type { CalculateCoinsPayload } from "@pawmii/shared";

export function useHealth(uid: string | null) {
  const setHealthData = useHealthStore((s) => s.setHealthData);
  const setIsSyncing = useHealthStore((s) => s.setIsSyncing);
  const setSyncError = useHealthStore((s) => s.setSyncError);
  const setUser = useUserStore((s) => s.setUser);

  const syncHealthData = useCallback(async () => {
    if (!uid) return;

    // Reject local fallback UIDs — they have no Firebase auth token.
    if (uid.startsWith('local_')) {
      setSyncError('auth_error');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Ensure there is a valid Firebase user before hitting the callable.
      // This guards against edge cases where the auth session expired between launches.
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        const { uid: freshUid } = await signInAnonymously();
        setUser(freshUid, true);
        // After re-auth, the uid prop the caller passed is stale — abort this
        // tick and let the store update re-trigger syncHealthData via useEffect.
        setIsSyncing(false);
        return;
      }

      let steps = 0;
      let activeCalories = 0;

      if (Platform.OS === "ios") {
        [steps, activeCalories] = await Promise.all([
          readTodaySteps(),
          readTodayActiveCalories(),
        ]);
      } else {
        [steps, activeCalories] = await Promise.all([
          readTodayStepsAndroid(),
          readTodayCaloriesAndroid(),
        ]);
      }

      const today = new Date().toLocaleDateString("en-CA");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const payload: CalculateCoinsPayload = {
        uid,
        date: today,
        steps,
        activeCalories,
        timezone,
      };

      const fn = getFirebaseFunctions();
      const calculateCoins = httpsCallable(fn, "calculateCoins");
      const result = await calculateCoins(payload);
      const data = result.data as { coinsEarnedToday: number };

      setHealthData(steps, activeCalories, data.coinsEarnedToday);
    } catch (err: any) {
      console.error("[useHealth] syncHealthData error:", err);
      if (err?.code === "functions/unauthenticated") {
        setSyncError('auth_error');
      } else {
        setSyncError("Health sync failed. Will retry next time you open the app.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [uid, setHealthData, setIsSyncing, setSyncError, setUser]);

  return { syncHealthData };
}
