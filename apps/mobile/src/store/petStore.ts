import { create } from "zustand";
import type { PetStoreState, Pet } from "@pawmii/shared";
import {
  FEED_COST_COINS,
  PLAY_COST_COINS,
  BATHE_COST_COINS,
  HUNGER_RESTORE_PER_FEED,
  PLAYFULNESS_RESTORE_PER_PLAY,
  CLEANLINESS_RESTORE_PER_BATHE,
  ATTR_MAX,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
} from "@pawmii/shared";
import { useUserStore } from "./userStore";

function computeState(hunger: number, playfulness: number, cleanliness: number) {
  const lowest = Math.min(hunger, playfulness, cleanliness);
  return lowest > ATTR_HAPPY_THRESHOLD ? "happy" : lowest >= ATTR_SAD_THRESHOLD ? "neutral" : "sad";
}

// Snapshots for rollback — one set per action type
let _petBeforeFeed: Pet | null  = null;
let _coinsBeforeFeed: number    = 0;
let _petBeforePlay: Pet | null  = null;
let _coinsBeforePlay: number    = 0;
let _petBeforeBathe: Pet | null = null;
let _coinsBeforeBathe: number   = 0;

export const usePetStore = create<PetStoreState>((set, get) => ({
  pet: null,
  isLoading: false,
  error: null,

  setPet: (pet: Pet) => set({ pet }),

  optimisticFeed: () => {
    const { pet } = get();
    if (!pet) return;
    _petBeforeFeed  = { ...pet };
    _coinsBeforeFeed = useUserStore.getState().coinBalance;
    const newHunger = Math.min(pet.hunger + HUNGER_RESTORE_PER_FEED, ATTR_MAX);
    set({
      pet: {
        ...pet,
        hunger:        newHunger,
        computedState: computeState(newHunger, pet.playfulness ?? 0, pet.cleanliness ?? 0),
      },
    });
    useUserStore.getState().setCoinBalance(Math.max(0, _coinsBeforeFeed - FEED_COST_COINS));
  },

  rollbackFeed: () => {
    if (_petBeforeFeed) { set({ pet: _petBeforeFeed }); _petBeforeFeed = null; }
    useUserStore.getState().setCoinBalance(_coinsBeforeFeed);
    _coinsBeforeFeed = 0;
  },

  optimisticPlay: () => {
    const { pet } = get();
    if (!pet) return;
    _petBeforePlay  = { ...pet };
    _coinsBeforePlay = useUserStore.getState().coinBalance;
    const newPlayfulness = Math.min((pet.playfulness ?? 0) + PLAYFULNESS_RESTORE_PER_PLAY, ATTR_MAX);
    set({
      pet: {
        ...pet,
        playfulness:   newPlayfulness,
        computedState: computeState(pet.hunger, newPlayfulness, pet.cleanliness ?? 0),
      },
    });
    useUserStore.getState().setCoinBalance(Math.max(0, _coinsBeforePlay - PLAY_COST_COINS));
  },

  rollbackPlay: () => {
    if (_petBeforePlay) { set({ pet: _petBeforePlay }); _petBeforePlay = null; }
    useUserStore.getState().setCoinBalance(_coinsBeforePlay);
    _coinsBeforePlay = 0;
  },

  optimisticBathe: () => {
    const { pet } = get();
    if (!pet) return;
    _petBeforeBathe  = { ...pet };
    _coinsBeforeBathe = useUserStore.getState().coinBalance;
    const newCleanliness = Math.min((pet.cleanliness ?? 0) + CLEANLINESS_RESTORE_PER_BATHE, ATTR_MAX);
    set({
      pet: {
        ...pet,
        cleanliness:   newCleanliness,
        computedState: computeState(pet.hunger, pet.playfulness ?? 0, newCleanliness),
      },
    });
    useUserStore.getState().setCoinBalance(Math.max(0, _coinsBeforeBathe - BATHE_COST_COINS));
  },

  rollbackBathe: () => {
    if (_petBeforeBathe) { set({ pet: _petBeforeBathe }); _petBeforeBathe = null; }
    useUserStore.getState().setCoinBalance(_coinsBeforeBathe);
    _coinsBeforeBathe = 0;
  },

  reset: () => set({ pet: null, isLoading: false, error: null }),
}));
