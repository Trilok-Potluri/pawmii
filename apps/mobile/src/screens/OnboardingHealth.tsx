/**
 * Screen 3 — Connect Health Data
 * Shows data types list, triggers OS permission request, handles all outcomes.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOnboardingStore } from '../store/onboardingStore';
import { useHealthStore } from '../store/healthStore';
import { requestHealthPermissions } from '../services/healthKit';
import {
  requestHealthConnectPermissions,
  isHealthConnectAvailable,
} from '../services/healthConnect';
import { COLORS } from '../utils/theme';
import type { HealthPermissionStatus } from '@pawmii/shared';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingHealth'>;
};

const HEALTH_CONNECT_PLAY_STORE =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingHealthScreen({ navigation }: Props) {
  const petName = useOnboardingStore((s) => s.petName);
  const setHealthPermissionStatus = useOnboardingStore((s) => s.setHealthPermissionStatus);
  const setPermissionStatus = useHealthStore((s) => s.setPermissionStatus);
  const [loading, setLoading] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const scale = useSharedValue(1);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const finishWithStatus = (status: HealthPermissionStatus) => {
    setHealthPermissionStatus(status);
    setPermissionStatus(status);
    navigation.navigate('Home');
  };

  const handleConnect = async () => {
    setLoading(true);
    let status: HealthPermissionStatus = 'denied';
    try {
      if (Platform.OS === 'ios') {
        const granted = await requestHealthPermissions();
        status = granted ? 'granted' : 'denied';
      } else {
        const available = await isHealthConnectAvailable();
        if (!available) {
          setShowInstallModal(true);
          setLoading(false);
          return;
        }
        const granted = await requestHealthConnectPermissions();
        status = granted ? 'granted' : 'denied';
      }
    } catch (err) {
      console.error('[OnboardingHealth] Permission error:', err);
      status = 'denied';
    } finally {
      setLoading(false);
    }
    finishWithStatus(status);
  };

  return (
    <View style={styles.root}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.headline}>
            {petName ? `${petName} wants` : 'Your dog wants'} to celebrate{'\n'}every step with you!
          </Text>
          <Text style={styles.sub}>
            Connect your health data so they earn coins{'\n'}every time you move.
          </Text>

          {/* Data type cards */}
          <View style={styles.dataCards}>
            <View style={styles.dataCard}>
              <View style={[styles.dataIconWrap, { backgroundColor: COLORS.happyBg }]}>
                <Text style={styles.dataEmoji}>👣</Text>
              </View>
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Step Count</Text>
                <Text style={styles.dataSub}>Every 1,000 steps = 10 🪙</Text>
              </View>
            </View>

            <View style={styles.dataCard}>
              <View style={[styles.dataIconWrap, { backgroundColor: COLORS.sadBg }]}>
                <Text style={styles.dataEmoji}>🔥</Text>
              </View>
              <View style={styles.dataInfo}>
                <Text style={styles.dataTitle}>Active Calories</Text>
                <Text style={styles.dataSub}>Every 100 cal = 8 🪙</Text>
              </View>
            </View>
          </View>

          {/* Privacy reassurance */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              🔒  Read-only · Never sold · Stays on your device
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.cta, loading && styles.ctaDisabled, btnStyle]}
            onPress={handleConnect}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.ctaText}>Connect Health Data  →</Text>
            )}
          </AnimatedPressable>

          <Pressable
            onPress={() => finishWithStatus('skipped')}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Health Connect install modal (Android edge case) */}
      {showInstallModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalEmoji}>📱</Text>
            <Text style={styles.modalTitle}>Health Connect Required</Text>
            <Text style={styles.modalBody}>
              Pawmii needs Health Connect to read your activity data on Android.
              It's free and takes 30 seconds to install.
            </Text>
            <Pressable
              style={styles.cta}
              onPress={() => Linking.openURL(HEALTH_CONNECT_PLAY_STORE)}
            >
              <Text style={styles.ctaText}>Install on Play Store</Text>
            </Pressable>
            <Pressable
              onPress={() => finishWithStatus('skipped')}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.accentDim,
    opacity: 0.6,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.happyBg,
    opacity: 0.7,
  },
  safe: { flex: 1, paddingHorizontal: 28 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  back: { fontSize: 15, color: COLORS.accentBright, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: COLORS.accentBright,
  },
  content: { flex: 1, justifyContent: 'center' },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 36,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  dataCards: { gap: 12, marginBottom: 24 },
  dataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dataIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataEmoji: { fontSize: 24 },
  dataInfo: { flex: 1 },
  dataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  dataSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  privacyNote: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  footer: { paddingBottom: 20, gap: 10 },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    shadowOpacity: 0.55,
    elevation: 12,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
});
