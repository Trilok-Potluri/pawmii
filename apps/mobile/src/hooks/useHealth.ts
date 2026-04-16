/**
 * useHealth — platform-aware health sync hook
 * Reads steps + calories from HealthKit (iOS) or Health Connect (Android),
 * POSTs to calculateCoins Cloud Function, updates health store.
 */

import { useCallback } from "react";
import { Platform } from "react-native";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebase";
import { readTodaySteps, readTodayActiveCalories } from "../services/healthKit";
import {
  readTodayStepsAndroid,
  readTodayCaloriesAndroid,
} from "../services/healthConnect";
import { useHealthStore } from "../store/healthStore";
import type { CalculateCoinsPayload } from "@pawmii/shared";

export function useHealth(uid: string | null) {
  const setHealthData = useHealthStore((s) => s.setHealthData);
  const setIsSyncing = useHealthStore((s) => s.setIsSyncing);

  const syncHealthData = useCallback(async () => {
    if (!uid) return;

    setIsSyncing(true);

    try {
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

      // Get today's date in local timezone
      const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const payload: CalculateCoinsPayload = {
        uid,
        date: today,
        steps,
        activeCalories,
        timezone,
      };

      // Call Cloud Function — server calculates and stores authoritative coins
      const fn = getFirebaseFunctions();
      const calculateCoins = httpsCallable(fn, "calculateCoins");
      const result = await calculateCoins(payload);
      const data = result.data as { coinsEarnedToday: number };

      setHealthData(steps, activeCalories, data.coinsEarnedToday);
    } catch (err) {
      console.error("[useHealth] syncHealthData error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [uid]);

  return { syncHealthData };
}
