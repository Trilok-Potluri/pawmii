import { create } from "zustand";
import type { HealthPermissionStatus } from "@pawmii/shared";

interface OnboardingStore {
  petName: string;
  healthPermissionStatus: HealthPermissionStatus;
  setPetName: (name: string) => void;
  setHealthPermissionStatus: (status: HealthPermissionStatus) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  petName: "",
  healthPermissionStatus: "unknown",
  setPetName: (petName) => set({ petName }),
  setHealthPermissionStatus: (healthPermissionStatus) =>
    set({ healthPermissionStatus }),
  reset: () => set({ petName: "", healthPermissionStatus: "unknown" }),
}));
