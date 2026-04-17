/**
 * Screen 4 / Main — Home Screen
 * The core loop: dog sprite + hunger bar + feed button + coin balance.
 * Sets onboarding.completed on first mount. Subscribes to Firestore via onSnapshot.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  ScrollView,
  Alert,
  Linking,
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
import { useHealthStore } from '../store/healthStore';
import {
  completeOnboarding,
  fetchUserDoc,
  updateHealthPermission,
} from '../services/firestore';
import { connectHealth } from '../services/connectHealth';
import { COLORS } from '../utils/theme';

const HEALTH_CONNECT_PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

export function HomeScreen() {
  const uid = useUserStore((s) => s.uid);
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useUserStore((s) => s.setOnboardingCompleted);
  const petName = useOnboardingStore((s) => s.petName);

  const { pet, feedPetAction, isFeedLoading } = usePet(uid);
  const { syncHealthData } = useHealth(uid);
  const { coinBalance } = useCoins(uid);

  const permissionStatus = useOnboardingStore((s) => s.healthPermissionStatus);
  const setHealthPermissionStatus = useOnboardingStore((s) => s.setHealthPermissionStatus);
  const setHealthStorePermission = useHealthStore((s) => s.setPermissionStatus);
  const syncError = useHealthStore((s) => s.syncError);
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = useCallback(async () => {
    if (reconnecting) return;
    setReconnecting(true);
    const result = await connectHealth();
    setReconnecting(false);

    if (result.outcome === 'unavailable') {
      Alert.alert(
        'Health Connect required',
        'Pawmii needs Health Connect to read your activity data on Android. It is free and takes 30 seconds.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Install',
            onPress: () => Linking.openURL(HEALTH_CONNECT_PLAY_STORE),
          },
        ],
      );
      return;
    }

    if (result.outcome === 'error') {
      Alert.alert('Could not open Health Connect', result.message);
      return;
    }

    if (result.outcome === 'granted') {
      setHealthPermissionStatus('granted');
      setHealthStorePermission('granted');
      if (uid) {
        updateHealthPermission(uid, true).catch((err) =>
          console.error('[HomeScreen] updateHealthPermission error:', err),
        );
      }
      syncHealthData();
    } else {
      // denied — leave banner in place, don't nag with another alert
      setHealthPermissionStatus('denied');
      setHealthStorePermission('denied');
    }
  }, [
    reconnecting,
    uid,
    setHealthPermissionStatus,
    setHealthStorePermission,
    syncHealthData,
  ]);

  useEffect(() => {
    if (uid && !onboardingCompleted) {
      completeOnboarding(uid)
        .then(() => setOnboardingCompleted(true))
        .catch((err) => console.error('[HomeScreen] completeOnboarding error:', err));
    }
  }, [uid, onboardingCompleted]);

  // Hydrate health permission status from Firestore on cold start. Zustand
  // resets on every launch; without this, returning users whose permission
  // was already granted would never trigger a health sync (because the
  // status would stay 'unknown' forever).
  useEffect(() => {
    if (!uid || permissionStatus !== 'unknown') return;
    let cancelled = false;
    fetchUserDoc(uid)
      .then((doc) => {
        if (cancelled || !doc) return;
        // Firestore is the source of truth across launches. Map both outcomes
        // so the reconnect banner reappears on re-opens if still not granted.
        setHealthPermissionStatus(doc.healthPermissionGranted ? 'granted' : 'denied');
      })
      .catch((err) => console.error('[HomeScreen] fetchUserDoc error:', err));
    return () => {
      cancelled = true;
    };
  }, [uid, permissionStatus, setHealthPermissionStatus]);

  const syncHealth = useCallback(() => {
    if (uid && permissionStatus === 'granted') {
      syncHealthData();
    }
  }, [uid, permissionStatus, syncHealthData]);

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
            <BannerNotification
              type="reconnect"
              petName={displayName}
              onPress={handleReconnect}
              loading={reconnecting}
            />
          </View>
        )}

        {/* Sync error banner */}
        {syncError && (
          <View style={styles.bannerWrap}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️  {syncError}</Text>
            </View>
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
  errorBanner: {
    backgroundColor: 'rgba(255,95,95,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,95,95,0.3)',
  },
  errorBannerText: {
    color: COLORS.sad,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
});
