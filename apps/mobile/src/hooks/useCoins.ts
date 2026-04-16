/**
 * useCoins — subscribes to Firestore coin balance via onSnapshot.
 * Client NEVER calculates coins. This is purely a read listener.
 */

import { useEffect } from "react";
import { subscribeToCoinBalance } from "../services/firestore";
import { useUserStore } from "../store/userStore";

export function useCoins(uid: string | null) {
  const coinBalance = useUserStore((s) => s.coinBalance);
  const setCoinBalance = useUserStore((s) => s.setCoinBalance);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToCoinBalance(uid, setCoinBalance);
    return () => unsub();
  }, [uid]);

  return { coinBalance };
}
