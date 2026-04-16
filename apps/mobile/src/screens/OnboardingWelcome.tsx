/**
 * Screen 1 — Welcome
 * Shows dog GIF + headline. Triggers Firebase Anonymous Auth on CTA tap.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { signInAnonymously } from '../services/firebase';
import { createUserDoc } from '../services/firestore';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../utils/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingWelcome'>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingWelcomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((s) => s.setUser);
  const scale = useSharedValue(1);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      const { uid } = await signInAnonymously();
      setUser(uid, true);
      // Create the user document in Firestore (idempotent — merge:true)
      await createUserDoc(uid);
      navigation.navigate('OnboardingNameDog');
    } catch (err) {
      console.error('[OnboardingWelcome] Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Atmospheric blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Step indicator */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.spriteContainer}>
            <View style={styles.spriteGlow} />
            <Image
              source={require('../../assets/sprites/dog_happy.gif')}
              style={styles.sprite}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.headline}>
            Meet your new{'\n'}fitness companion.
          </Text>
          <Text style={styles.subCopy}>
            Your real workouts keep them happy.{'\n'}
            Your real habits help them grow.
          </Text>

          {/* Social proof pill */}
          <View style={styles.trustPill}>
            <Text style={styles.trustText}>🐾  100% real fitness data  ·  no cheating</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.cta, loading && styles.ctaDisabled, btnStyle]}
            onPress={handleGetStarted}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.ctaText}>Get Started  →</Text>
            )}
          </AnimatedPressable>
          <Text style={styles.legal}>No account needed · Free forever</Text>
        </View>
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
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.accentDim,
    opacity: 0.7,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: COLORS.happyBg,
    opacity: 0.8,
  },
  safe: { flex: 1, paddingHorizontal: 28 },
  dots: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  spriteGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.happyBg,
    shadowColor: COLORS.happy,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.5,
    elevation: 12,
  },
  sprite: {
    width: 210,
    height: 210,
    zIndex: 1,
  },
  headline: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  subCopy: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  trustPill: {
    backgroundColor: COLORS.surface,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
    alignItems: 'center',
  },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
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
  legal: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
