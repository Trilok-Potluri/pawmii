import { useCallback } from "react";
import { Platform } from "react-native";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, getFirebaseAuth, signInAnonymously } from "../services/firebase";
import { readTodaySteps, readTodayActiveCalories } from "../services/healthKit";
import { readStepsAndroid, readCaloriesAndroid } from "../services/healthConnect";
import { useHealthStore } from "../store/healthStore";
import { useUserStore } from "../store/userStore";
import type { CalculateCoinsPayload } from "@pawmii/shared";

function getDateBounds() {
  const now            = new Date();
  const startOfToday   = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfToday.getDate() - 1);
  return { now, startOfToday, startOfYesterday };
}

export function useHealth(uid: string | null) {
  const setHealthData = useHealthStore((s) => s.setHealthData);
  const setIsSyncing  = useHealthStore((s) => s.setIsSyncing);
  const setSyncError  = useHealthStore((s) => s.setSyncError);
  const setUser       = useUserStore((s) => s.setUser);

  const syncHealthData = useCallback(async () => {
    if (!uid) return;

    if (uid.startsWith("local_")) {
      setSyncError("auth_error");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        const { uid: freshUid } = await signInAnonymously();
        setUser(freshUid, true);
        setIsSyncing(false);
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { now, startOfToday, startOfYesterday } = getDateBounds();

      let todaySteps = 0, todayCalories = 0;
      let yesterdaySteps = 0, yesterdayCalories = 0;

      if (Platform.OS === "ios") {
        [todaySteps, todayCalories] = await Promise.all([
          readTodaySteps(),
          readTodayActiveCalories(),
        ]);
        // iOS HealthKit: no lookback needed (HealthKit aggregates reliably)
      } else {
        // Read today and yesterday in parallel — catches late Whoop writes
        [todaySteps, todayCalories, yesterdaySteps, yesterdayCalories] = await Promise.all([
          readStepsAndroid(startOfToday, now),
          readCaloriesAndroid(startOfToday, now),
          readStepsAndroid(startOfYesterday, startOfToday),
          readCaloriesAndroid(startOfYesterday, startOfToday),
        ]);
      }

      const fn             = getFirebaseFunctions();
      const calculateCoins = httpsCallable(fn, "calculateCoins");

      const todayDate     = startOfToday.toLocaleDateString("en-CA");
      const yesterdayDate = startOfYesterday.toLocaleDateString("en-CA");

      // Fire today sync (primary) — always
      const todayPayload: CalculateCoinsPayload = {
        uid, date: todayDate, steps: todaySteps, activeCalories: todayCalories, timezone,
      };
      const todayResult = await calculateCoins(todayPayload);
      const todayData   = todayResult.data as { coinsEarnedToday: number };

      // Fire yesterday sync only if there is data — handles Whoop 11:59PM writes
      if (yesterdaySteps > 0 || yesterdayCalories > 0) {
        const yesterdayPayload: CalculateCoinsPayload = {
          uid, date: yesterdayDate, steps: yesterdaySteps, activeCalories: yesterdayCalories, timezone,
        };
        calculateCoins(yesterdayPayload).catch((err) =>
          console.warn("[useHealth] yesterday sync error (non-blocking):", err)
        );
      }

      setHealthData(todaySteps, todayCalories, todayData.coinsEarnedToday);
    } catch (err: any) {
      console.error("[useHealth] syncHealthData error:", err);
      if (err?.code === "functions/unauthenticated") {
        setSyncError("auth_error");
      } else {
        setSyncError("Health sync failed. Will retry next time you open the app.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [uid, setHealthData, setIsSyncing, setSyncError, setUser]);

  return { syncHealthData };
}
