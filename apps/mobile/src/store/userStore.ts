import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserStoreState } from "@pawmii/shared";

export const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      uid: null,
      coinBalance: 0,
      isAnonymous: true,
      onboardingCompleted: false,

      setUser:                (uid, isAnonymous) => set({ uid, isAnonymous }),
      setCoinBalance:         (coinBalance) => set({ coinBalance }),
      setOnboardingCompleted: (val) => set({ onboardingCompleted: val }),
      reset: () => set({ uid: null, coinBalance: 0, isAnonymous: true, onboardingCompleted: false }),
    }),
    {
      name:    "pawmii-user-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the coin balance — uid + auth state comes from Firebase on every launch
      partialize: (state) => ({ coinBalance: state.coinBalance }),
    }
  )
);
