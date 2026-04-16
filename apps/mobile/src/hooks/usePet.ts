/**
 * usePet — subscribes to pet via Firestore onSnapshot,
 * exposes feedPetAction (optimistic + server confirm).
 */

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebase";
import { subscribeToPet } from "../services/firestore";
import { usePetStore } from "../store/petStore";
import type { FeedPetPayload, FeedPetResponse } from "@pawmii/shared";

export function usePet(uid: string | null) {
  const pet = usePetStore((s) => s.pet);
  const setPet = usePetStore((s) => s.setPet);
  const optimisticFeed = usePetStore((s) => s.optimisticFeed);
  const rollbackFeed = usePetStore((s) => s.rollbackFeed);
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  // Subscribe to Firestore pet document
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToPet(uid, setPet);
    return () => unsub();
  }, [uid]);

  const feedPetAction = async (petId: string) => {
    if (!uid || !petId) return;

    // 1. Optimistic update
    optimisticFeed();
    setIsFeedLoading(true);

    try {
      const fn = getFirebaseFunctions();
      const feedPet = httpsCallable<FeedPetPayload, FeedPetResponse>(fn, "feedPet");

      const result = await feedPet({
        uid,
        petId,
        timestamp: new Date().toISOString(),
      });

      if (!result.data.success) {
        rollbackFeed();
        Alert.alert("Couldn't feed", result.data.error || "Try again.");
      }
      // onSnapshot will sync the confirmed server state automatically
    } catch (err: any) {
      rollbackFeed();
      const msg =
        err?.message?.includes("Insufficient coins")
          ? "Not enough coins! Go earn some by moving 💪"
          : err?.message?.includes("Daily feed limit")
          ? "You've already fed your dog 10 times today! Come back tomorrow."
          : "Feed failed. Please try again.";
      Alert.alert("Oops", msg);
      console.error("[usePet] feedPetAction error:", err);
    } finally {
      setIsFeedLoading(false);
    }
  };

  return { pet, feedPetAction, isFeedLoading };
}
