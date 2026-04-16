import { create } from "zustand";
import type { PetStoreState, Pet } from "@pawmii/shared";
import { FEED_COST_COINS, HUNGER_RESTORE_PER_FEED, HUNGER_MAX } from "@pawmii/shared";
import { useUserStore } from "./userStore";

export const usePetStore = create<PetStoreState>((set, get) => ({
  pet: null,
  isLoading: false,
  error: null,

  setPet: (pet: Pet) => set({ pet }),

  /** Optimistic update — apply immediately before server confirms */
  optimisticFeed: () => {
    const { pet } = get();
    if (!pet) return;

    const newHunger = Math.min(pet.hunger + HUNGER_RESTORE_PER_FEED, HUNGER_MAX);
    const newState =
      newHunger > 60 ? "happy" : newHunger >= 30 ? "neutral" : "sad";

    set({
      pet: { ...pet, hunger: newHunger, computedState: newState },
    });

    // Also update coin balance optimistically
    useUserStore.getState().setCoinBalance(
      Math.max(0, useUserStore.getState().coinBalance - FEED_COST_COINS)
    );
  },

  /** Roll back optimistic update if server call fails */
  rollbackFeed: () => {
    // Re-sync will happen via onSnapshot listener; just restore coins
    useUserStore.getState().setCoinBalance(
      useUserStore.getState().coinBalance + FEED_COST_COINS
    );
  },

  reset: () => set({ pet: null, isLoading: false, error: null }),
}));
