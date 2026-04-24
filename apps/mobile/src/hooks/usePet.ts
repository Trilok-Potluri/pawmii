import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebase";
import { subscribeToPet } from "../services/firestore";
import { usePetStore } from "../store/petStore";
import {
  FEED_COST_COINS,
  PLAY_COST_COINS,
  BATHE_COST_COINS,
  DAILY_FEED_CAP,
  DAILY_PLAY_CAP,
  DAILY_BATHE_CAP,
} from "@pawmii/shared";
import type {
  FeedPetPayload,
  FeedPetResponse,
  PlayPetPayload,
  PlayPetResponse,
  BathePetPayload,
  BathePetResponse,
} from "@pawmii/shared";

export function usePet(uid: string | null) {
  const pet             = usePetStore((s) => s.pet);
  const setPet          = usePetStore((s) => s.setPet);
  const optimisticFeed  = usePetStore((s) => s.optimisticFeed);
  const rollbackFeed    = usePetStore((s) => s.rollbackFeed);
  const optimisticPlay  = usePetStore((s) => s.optimisticPlay);
  const rollbackPlay    = usePetStore((s) => s.rollbackPlay);
  const optimisticBathe = usePetStore((s) => s.optimisticBathe);
  const rollbackBathe   = usePetStore((s) => s.rollbackBathe);

  const [isFeedLoading,  setIsFeedLoading]  = useState(false);
  const [isPlayLoading,  setIsPlayLoading]  = useState(false);
  const [isBatheLoading, setIsBatheLoading] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToPet(uid, setPet);
    return () => unsub();
  }, [uid]);

  const feedPetAction = async (petId: string) => {
    if (!uid || !petId) return;
    optimisticFeed();
    setIsFeedLoading(true);
    try {
      const fn      = getFirebaseFunctions();
      const feedPet = httpsCallable<FeedPetPayload, FeedPetResponse>(fn, "feedPet");
      const result  = await feedPet({ uid, petId, timestamp: new Date().toISOString() });
      if (!result.data.success) {
        rollbackFeed();
        Alert.alert("Couldn't feed", result.data.error || "Try again.");
      }
    } catch (err: any) {
      rollbackFeed();
      Alert.alert("Oops", _actionErrorMessage(err, "feed", FEED_COST_COINS, DAILY_FEED_CAP));
      console.error("[usePet] feedPetAction error:", err);
    } finally {
      setIsFeedLoading(false);
    }
  };

  const playPetAction = async (petId: string) => {
    if (!uid || !petId) return;
    optimisticPlay();
    setIsPlayLoading(true);
    try {
      const fn           = getFirebaseFunctions();
      const playWithPet  = httpsCallable<PlayPetPayload, PlayPetResponse>(fn, "playWithPet");
      const result       = await playWithPet({ uid, petId, timestamp: new Date().toISOString() });
      if (!result.data.success) {
        rollbackPlay();
        Alert.alert("Couldn't play", result.data.error || "Try again.");
      }
    } catch (err: any) {
      rollbackPlay();
      Alert.alert("Oops", _actionErrorMessage(err, "play", PLAY_COST_COINS, DAILY_PLAY_CAP));
      console.error("[usePet] playPetAction error:", err);
    } finally {
      setIsPlayLoading(false);
    }
  };

  const bathePetAction = async (petId: string) => {
    if (!uid || !petId) return;
    optimisticBathe();
    setIsBatheLoading(true);
    try {
      const fn       = getFirebaseFunctions();
      const bathePet = httpsCallable<BathePetPayload, BathePetResponse>(fn, "bathePet");
      const result   = await bathePet({ uid, petId, timestamp: new Date().toISOString() });
      if (!result.data.success) {
        rollbackBathe();
        Alert.alert("Couldn't bathe", result.data.error || "Try again.");
      }
    } catch (err: any) {
      rollbackBathe();
      Alert.alert("Oops", _actionErrorMessage(err, "bathe", BATHE_COST_COINS, DAILY_BATHE_CAP));
      console.error("[usePet] bathePetAction error:", err);
    } finally {
      setIsBatheLoading(false);
    }
  };

  return {
    pet,
    feedPetAction,
    playPetAction,
    bathePetAction,
    isFeedLoading,
    isPlayLoading,
    isBatheLoading,
  };
}

function _actionErrorMessage(err: any, action: string, cost: number, cap: number): string {
  const msg = err?.message ?? "";
  if (msg.includes("Insufficient coins"))
    return `Not enough coins! Need ${cost} 🪙 — go move to earn some 💪`;
  if (msg.includes("Daily") && msg.includes("limit"))
    return `You've already done this ${cap} times today. Come back tomorrow!`;
  return `${action.charAt(0).toUpperCase() + action.slice(1)} failed. Please try again.`;
}
