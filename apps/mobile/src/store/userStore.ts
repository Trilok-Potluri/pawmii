import { create } from "zustand";
import type { UserStoreState } from "@pawmii/shared";

export const useUserStore = create<UserStoreState>((set) => ({
  uid: null,
  coinBalance: 0,
  isAnonymous: true,
  onboardingCompleted: false,

  setUser: (uid, isAnonymous) => set({ uid, isAnonymous }),
  setCoinBalance: (coinBalance) => set({ coinBalance }),
  setOnboardingCompleted: (val) => set({ onboardingCompleted: val }),
  reset: () =>
    set({ uid: null, coinBalance: 0, isAnonymous: true, onboardingCompleted: false }),
}));
