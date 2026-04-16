import { create } from "zustand";
import type { HealthStoreState, HealthPermissionStatus } from "@pawmii/shared";

export const useHealthStore = create<HealthStoreState>((set) => ({
  steps: 0,
  activeCalories: 0,
  coinsEarnedToday: 0,
  permissionStatus: "unknown",
  lastSyncedAt: null,
  isSyncing: false,

  setPermissionStatus: (status: HealthPermissionStatus) =>
    set({ permissionStatus: status }),

  setHealthData: (steps, activeCalories, coins) =>
    set({
      steps,
      activeCalories,
      coinsEarnedToday: coins,
      lastSyncedAt: new Date(),
    }),

  setIsSyncing: (val) => set({ isSyncing: val }),
}));
