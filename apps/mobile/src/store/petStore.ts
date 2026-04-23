import { create } from "zustand";
import type { PetStoreState, Pet } from "@pawmii/shared";
import { FEED_COST_COINS, HUNGER_RESTORE_PER_FEED, HUNGER_MAX } from "@pawmii/shared";
import { useUserStore } from "./userStore";

// Holds the snapshot before an optimistic feed so rollback can fully restore it
let _petBeforeFeed: Pet | null = null;
let _coinsBeforeFeed: number = 0;

export const usePetStore = create<PetStoreState>((set, get) => ({
  pet: null,
  isLoading: false,
  error: null,

  setPet: (pet: Pet) => set({ pet }),

  optimisticFeed: () => {
    const { pet } = get();
    if (!pet) return;

    // Snapshot current state for rollback
    _petBeforeFeed = { ...pet };
    _coinsBeforeFeed = useUserStore.getState().coinBalance;

    const newHunger = Math.min(pet.hunger + HUNGER_RESTORE_PER_FEED, HUNGER_MAX);
    const newState =
      newHunger > 60 ? "happy" : newHunger >= 30 ? "neutral" : "sad";

    set({ pet: { ...pet, hunger: newHunger, computedState: newState } });
    useUserStore.getState().setCoinBalance(
      Math.max(0, _coinsBeforeFeed - FEED_COST_COINS)
    );
  },

  rollbackFeed: () => {
    if (_petBeforeFeed) {
      set({ pet: _petBeforeFeed });
      _petBeforeFeed = null;
    }
    useUserStore.getState().setCoinBalance(_coinsBeforeFeed);
    _coinsBeforeFeed = 0;
  },

  reset: () => set({ pet: null, isLoading: false, error: null }),
}));
