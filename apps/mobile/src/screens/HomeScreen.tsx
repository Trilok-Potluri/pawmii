import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AppState,
  AppStateStatus,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { DogSprite } from '../components/DogSprite';
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
import { openHealthConnectSettings } from '../services/healthConnect';
import { signInAnonymously } from '../services/firebase';
import { COLORS } from '../utils/theme';
import {
  FEED_COST_COINS,
  PLAY_COST_COINS,
  BATHE_COST_COINS,
  ATTR_HAPPY_THRESHOLD,
  ATTR_SAD_THRESHOLD,
  STEPS_COIN_CAP,
  COINS_PER_1000_STEPS,
  CALORIES_COIN_CAP,
  COINS_PER_100_CALORIES,
  DAILY_BOTH_METRICS_BONUS,
} from '@pawmii/shared';

const HEALTH_CONNECT_PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

// ─── Attribute bar ────────────────────────────────────────────────────────────

interface AttrBarProps {
  label: string;
  emoji: string;
  value: number; // 0–100
  color: string;
}

function AttrBar({ label, emoji, value, color }: AttrBarProps) {
  const pct = Math.max(0, Math.min(value, 100));
  return (
    <View style={attrStyles.row}>
      <Text style={attrStyles.emoji}>{emoji}</Text>
      <Text style={attrStyles.label}>{label}</Text>
      <View style={attrStyles.track}>
        <View style={[attrStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[attrStyles.value, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

const attrStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  emoji: { fontSize: 16, width: 22, textAlign: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 78,
    letterSpacing: 0.3,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  value: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
});

// ─── Action button ────────────────────────────────────────────────────────────

interface ActionBtnProps {
  emoji: string;
  label: string;
  cost: number;
  color: string;
  canAfford: boolean;
  isLoading: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActionBtn({ emoji, label, cost, color, canAfford, isLoading, onPress }: ActionBtnProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[
        actionStyles.btn,
        { borderColor: color + '55', shadowColor: color },
        (!canAfford || isLoading) && actionStyles.disabled,
        animStyle,
      ]}
      disabled={!canAfford || isLoading}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 18, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
    >
      {isLoading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <>
          <Text style={actionStyles.emoji}>{emoji}</Text>
          <Text style={[actionStyles.label, { color: canAfford ? COLORS.textPrimary : COLORS.textMuted }]}>
            {label}
          </Text>
          <View style={[actionStyles.costPill, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={[actionStyles.cost, { color: canAfford ? color : COLORS.textMuted }]}>
              {cost} 🪙
            </Text>
          </View>
        </>
      )}
    </AnimatedPressable>
  );
}

const actionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  disabled: { opacity: 0.35, shadowOpacity: 0, elevation: 0 },
  emoji: { fontSize: 22 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  costPill: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  cost: { fontSize: 11, fontWeight: '700' },
});

// ─── Coin progress card ───────────────────────────────────────────────────────

function CoinProgressCard() {
  const steps            = useHealthStore((s) => s.steps);
  const activeCalories   = useHealthStore((s) => s.activeCalories);
  const coinsEarnedToday = useHealthStore((s) => s.coinsEarnedToday);
  const isSyncing        = useHealthStore((s) => s.isSyncing);

  const stepsCoins = Math.floor(Math.min(steps, STEPS_COIN_CAP) / 1000) * COINS_PER_1000_STEPS;
  const calCoins   = Math.floor(Math.min(activeCalories, CALORIES_COIN_CAP) / 100) * COINS_PER_100_CALORIES;
  const bonus      = stepsCoins > 0 && calCoins > 0 ? DAILY_BOTH_METRICS_BONUS : 0;

  return (
    <View style={coinCardStyles.card}>
      <View style={coinCardStyles.header}>
        <Text style={coinCardStyles.title}>Daily Coins</Text>
        <Text style={coinCardStyles.total}>
          {isSyncing ? '…' : coinsEarnedToday} 🪙
        </Text>
      </View>
      <View style={coinCardStyles.divider} />
      <View style={coinCardStyles.row}>
        <Text style={coinCardStyles.metricIcon}>👣</Text>
        <Text style={coinCardStyles.metricLabel}>{steps.toLocaleString()} steps</Text>
        <Text style={coinCardStyles.metricCoins}>+{stepsCoins} 🪙</Text>
      </View>
      <View style={coinCardStyles.row}>
        <Text style={coinCardStyles.metricIcon}>🔥</Text>
        <Text style={coinCardStyles.metricLabel}>{activeCalories} kcal</Text>
        <Text style={coinCardStyles.metricCoins}>+{calCoins} 🪙</Text>
      </View>
      {bonus > 0 && (
        <View style={coinCardStyles.row}>
          <Text style={coinCardStyles.metricIcon}>⭐</Text>
          <Text style={coinCardStyles.metricLabel}>Both metrics bonus</Text>
          <Text style={coinCardStyles.metricCoins}>+{bonus} 🪙</Text>
        </View>
      )}
    </View>
  );
}

const coinCardStyles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:  { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  total:  { fontSize: 20, fontWeight: '900', color: COLORS.gold },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  metricIcon:  { fontSize: 14, width: 20 },
  metricLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  metricCoins: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const uid                    = useUserStore((s) => s.uid);
  const setUser                = useUserStore((s) => s.setUser);
  const onboardingCompleted    = useUserStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useUserStore((s) => s.setOnboardingCompleted);
  const petName                = useOnboardingStore((s) => s.petName);

  const { pet, feedPetAction, playPetAction, bathePetAction, isFeedLoading, isPlayLoading, isBatheLoading } =
    usePet(uid);
  const { syncHealthData } = useHealth(uid);
  const { coinBalance }    = useCoins(uid);

  const permissionStatus         = useOnboardingStore((s) => s.healthPermissionStatus);
  const setHealthPermissionStatus = useOnboardingStore((s) => s.setHealthPermissionStatus);
  const setHealthStorePermission  = useHealthStore((s) => s.setPermissionStatus);
  const setSyncError              = useHealthStore((s) => s.setSyncError);
  const syncError                 = useHealthStore((s) => s.syncError);
  const [reconnecting,  setReconnecting]  = useState(false);
  const [authRetrying,  setAuthRetrying]  = useState(false);

  const handleAuthRetry = useCallback(async () => {
    if (authRetrying) return;
    setAuthRetrying(true);
    try {
      const { uid: freshUid } = await signInAnonymously();
      setUser(freshUid, true);
      setSyncError(null);
    } catch {
      Alert.alert('Sign-in failed', 'Could not connect to Pawmii servers. Check your internet and try again.');
    } finally {
      setAuthRetrying(false);
    }
  }, [authRetrying, setUser, setSyncError]);

  const handleReconnect = useCallback(async () => {
    if (reconnecting) return;
    setReconnecting(true);
    const result = await connectHealth();
    setReconnecting(false);

    if (result.outcome === 'unavailable_not_installed' || result.outcome === 'unavailable_update_required') {
      Alert.alert(
        result.outcome === 'unavailable_update_required' ? 'Update Health Connect' : 'Health Connect required',
        'Pawmii needs Health Connect to read your activity data on Android.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Play Store', onPress: () => Linking.openURL(HEALTH_CONNECT_PLAY_STORE) },
        ]
      );
      return;
    }

    if (result.outcome === 'error') { Alert.alert('Could not open Health Connect', result.message); return; }

    if (result.outcome === 'granted') {
      setHealthPermissionStatus('granted');
      setHealthStorePermission('granted');
      if (uid) updateHealthPermission(uid, true).catch(console.error);
      syncHealthData();
      return;
    }

    if (result.outcome === 'needs_settings') {
      Alert.alert(
        'Grant access in Health Connect',
        'Open Health Connect, find Pawmii in App permissions, and enable Steps and Active calories.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Health Connect', onPress: () => openHealthConnectSettings() },
        ]
      );
      return;
    }

    setHealthPermissionStatus('denied');
    setHealthStorePermission('denied');
    Alert.alert(
      'Permission not granted',
      'You can grant access anytime in Health Connect.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Health Connect', onPress: () => openHealthConnectSettings() },
      ]
    );
  }, [reconnecting, uid, setHealthPermissionStatus, setHealthStorePermission, syncHealthData]);

  useEffect(() => {
    if (uid && !onboardingCompleted) {
      completeOnboarding(uid)
        .then(() => setOnboardingCompleted(true))
        .catch(console.error);
    }
  }, [uid, onboardingCompleted]);

  useEffect(() => {
    if (!uid || permissionStatus !== 'unknown') return;
    let cancelled = false;
    fetchUserDoc(uid).then((doc) => {
      if (cancelled || !doc) return;
      setHealthPermissionStatus(doc.healthPermissionGranted ? 'granted' : 'denied');
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [uid, permissionStatus, setHealthPermissionStatus]);

  const syncHealth = useCallback(() => {
    if (uid && permissionStatus === 'granted') syncHealthData();
  }, [uid, permissionStatus, syncHealthData]);

  useEffect(() => {
    syncHealth();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') syncHealth();
    });
    return () => sub.remove();
  }, [syncHealth]);

  const displayName    = pet?.name ?? petName ?? 'your dog';
  const hunger         = pet?.hunger      ?? 50;
  const playfulness    = pet?.playfulness  ?? 50;
  const cleanliness    = pet?.cleanliness  ?? 50;
  const computedState  = pet?.computedState ?? 'neutral';

  const lowest = Math.min(hunger, playfulness, cleanliness);
  const stateAccent =
    lowest > ATTR_HAPPY_THRESHOLD
      ? COLORS.happy
      : lowest >= ATTR_SAD_THRESHOLD
      ? COLORS.neutral
      : COLORS.sad;

  const canFeed  = coinBalance >= FEED_COST_COINS  && !isFeedLoading;
  const canPlay  = coinBalance >= PLAY_COST_COINS  && !isPlayLoading;
  const canBathe = coinBalance >= BATHE_COST_COINS && !isBatheLoading;

  const stateBadgeLabel =
    computedState === 'happy' ? '😄 Happy' : computedState === 'sad' ? '😢 Sad' : '😐 Neutral';

  return (
    <View style={styles.root}>
      <View style={[styles.blobTopRight, { backgroundColor: COLORS.accentDim }]} />
      <View style={[styles.blobBottomLeft, { backgroundColor: stateAccent + '18' }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Pawmii</Text>
          <CoinBalance balance={coinBalance} />
        </View>

        {/* Banners */}
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
        {syncError === 'auth_error' && (
          <View style={styles.bannerWrap}>
            <Pressable
              style={({ pressed }) => [styles.errorBanner, pressed && { opacity: 0.75 }]}
              onPress={handleAuthRetry}
              disabled={authRetrying}
            >
              <Text style={styles.errorBannerText}>
                {authRetrying ? '⏳  Signing in…' : '⚠️  Tap to sign in and sync health data'}
              </Text>
            </Pressable>
          </View>
        )}
        {syncError && syncError !== 'auth_error' && (
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
          {/* Pet name + state badge */}
          <View style={styles.nameRow}>
            <Text style={styles.petName}>{displayName}</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateAccent + '22', borderColor: stateAccent + '55' }]}>
              <Text style={[styles.stateBadgeText, { color: stateAccent }]}>{stateBadgeLabel}</Text>
            </View>
          </View>

          {/* Three attribute bars */}
          <View style={styles.attrCard}>
            <AttrBar label="Hunger"      emoji="🍖" value={hunger}      color={COLORS.sad} />
            <AttrBar label="Playful"     emoji="🎾" value={playfulness} color={COLORS.accentBright} />
            <AttrBar label="Cleanliness" emoji="🛁" value={cleanliness} color={COLORS.happy} />
          </View>

          {/* Dog sprite */}
          <View style={styles.spriteWrap}>
            <DogSprite state={computedState} />
          </View>

          {/* Daily coin progress */}
          {permissionStatus === 'granted' && (
            <View style={styles.section}>
              <CoinProgressCard />
            </View>
          )}

          {/* Three action buttons */}
          <View style={styles.actionRow}>
            <ActionBtn
              emoji="🍖"
              label="Feed"
              cost={FEED_COST_COINS}
              color={COLORS.neutral}
              canAfford={canFeed}
              isLoading={isFeedLoading}
              onPress={() => pet && feedPetAction(pet.petId)}
            />
            <ActionBtn
              emoji="🎾"
              label="Play"
              cost={PLAY_COST_COINS}
              color={COLORS.accentBright}
              canAfford={canPlay}
              isLoading={isPlayLoading}
              onPress={() => pet && playPetAction(pet.petId)}
            />
            <ActionBtn
              emoji="🛁"
              label="Clean"
              cost={BATHE_COST_COINS}
              color={COLORS.happy}
              canAfford={canBathe}
              isLoading={isBatheLoading}
              onPress={() => pet && bathePetAction(pet.petId)}
            />
          </View>

          {/* Contextual "not enough coins" hint */}
          {coinBalance < FEED_COST_COINS && (
            <Text style={styles.hintText}>
              Walk or exercise to earn coins 💪
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, overflow: 'hidden' },
  blobTopRight: {
    position: 'absolute', top: -120, right: -120,
    width: 320, height: 320, borderRadius: 160, opacity: 0.55,
  },
  blobBottomLeft: {
    position: 'absolute', bottom: 0, left: -140,
    width: 380, height: 380, borderRadius: 190, opacity: 0.6,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10,
  },
  wordmark: { fontSize: 22, fontWeight: '900', color: COLORS.accentBright, letterSpacing: -0.5 },
  bannerWrap: { paddingHorizontal: 22, marginBottom: 6 },
  scroll: { paddingHorizontal: 22, paddingBottom: 32, alignItems: 'center' },

  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, alignSelf: 'flex-start',
  },
  petName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  stateBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  stateBadgeText: { fontSize: 12, fontWeight: '700' },

  attrCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
    marginBottom: 4,
  },

  spriteWrap: { marginVertical: 8, alignItems: 'center' },

  section: { width: '100%', marginTop: 14 },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 },

  hintText: {
    marginTop: 12, textAlign: 'center',
    fontSize: 12, color: COLORS.textMuted,
  },

  errorBanner: {
    backgroundColor: 'rgba(255,95,95,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,95,95,0.3)',
  },
  errorBannerText: { color: COLORS.sad, fontSize: 12, fontWeight: '500', lineHeight: 18 },
});
