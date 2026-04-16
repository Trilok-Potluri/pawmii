/**
 * Screen 4 / Main — Home Screen
 * The core loop: dog sprite + hunger bar + feed button + coin balance.
 * Sets onboarding.completed on first mount. Subscribes to Firestore via onSnapshot.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DogSprite } from '../components/DogSprite';
import { HungerBar } from '../components/HungerBar';
import { FeedButton } from '../components/FeedButton';
import { CoinBalance } from '../components/CoinBalance';
import { BannerNotification } from '../components/BannerNotification';

import { usePet } from '../hooks/usePet';
import { useHealth } from '../hooks/useHealth';
import { useCoins } from '../hooks/useCoins';
import { useUserStore } from '../store/userStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { completeOnboarding } from '../services/firestore';
import { COLORS } from '../utils/theme';

export function HomeScreen() {
  const uid = useUserStore((s) => s.uid);
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useUserStore((s) => s.setOnboardingCompleted);
  const petName = useOnboardingStore((s) => s.petName);

  const { pet, feedPetAction, isFeedLoading } = usePet(uid);
  const { syncHealthData } = useHealth(uid);
  const { coinBalance } = useCoins(uid);

  const permissionStatus = useOnboardingStore((s) => s.healthPermissionStatus);

  useEffect(() => {
    if (uid && !onboardingCompleted) {
      completeOnboarding(uid).then(() => setOnboardingCompleted(true));
    }
  }, [uid, onboardingCompleted]);

  const syncHealth = useCallback(() => {
    if (uid && permissionStatus === 'granted') {
      syncHealthData();
    }
  }, [uid, permissionStatus]);

  useEffect(() => {
    syncHealth();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') syncHealth();
    });
    return () => subscription.remove();
  }, [syncHealth]);

  const displayName = pet?.name ?? petName ?? 'your dog';
  const hunger = pet?.hunger ?? 50;
  const computedState = pet?.computedState ?? 'neutral';
  const canFeed = coinBalance >= 20 && !isFeedLoading;

  // Dynamic accent color tracks the dog's state
  const stateAccent =
    computedState === 'happy'
      ? COLORS.happy
      : computedState === 'sad'
      ? COLORS.sad
      : COLORS.neutral;

  return (
    <View style={styles.root}>
      {/* Atmospheric background blobs */}
      <View style={[styles.blobTopRight, { backgroundColor: COLORS.accentDim }]} />
      <View style={[styles.blobBottomLeft, { backgroundColor: stateAccent + '18' }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Pawmii</Text>
          <CoinBalance balance={coinBalance} />
        </View>

        {/* Reconnect banner */}
        {(permissionStatus === 'denied' || permissionStatus === 'skipped') && (
          <View style={styles.bannerWrap}>
            <BannerNotification type="reconnect" petName={displayName} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Pet name + state label */}
          <View style={styles.nameRow}>
            <Text style={styles.petName}>{displayName}</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateAccent + '22', borderColor: stateAccent + '55' }]}>
              <Text style={[styles.stateBadgeText, { color: stateAccent }]}>
                {computedState === 'happy' ? '😄 Happy' : computedState === 'sad' ? '😢 Hungry' : '😐 Neutral'}
              </Text>
            </View>
          </View>

          {/* Dog GIF with glow ring */}
          <View style={styles.spriteWrap}>
            <DogSprite state={computedState} />
          </View>

          {/* Hunger bar */}
          <View style={styles.section}>
            <HungerBar hunger={hunger} />
          </View>

          {/* Feed button */}
          <View style={styles.section}>
            <FeedButton
              petName={displayName}
              canFeed={canFeed}
              isLoading={isFeedLoading}
              onFeed={() => pet && feedPetAction(pet.petId)}
            />
            {!canFeed && !isFeedLoading && coinBalance < 20 && (
              <Text style={styles.notEnoughCoins}>
                Need 20 🪙 to feed · Go earn some by moving 💪
              </Text>
            )}
          </View>

          {/* Activity banner */}
          {permissionStatus === 'granted' && (
            <View style={styles.section}>
              <BannerNotification type="coins" uid={uid} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  // Atmospheric depth layers
  blobTopRight: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.55,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    opacity: 0.6,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 10,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accentBright,
    letterSpacing: -0.5,
  },
  bannerWrap: {
    paddingHorizontal: 22,
    marginBottom: 6,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  petName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  stateBadge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  spriteWrap: {
    marginVertical: 8,
    alignItems: 'center',
  },
  section: {
    width: '100%',
    marginTop: 16,
  },
  notEnoughCoins: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
