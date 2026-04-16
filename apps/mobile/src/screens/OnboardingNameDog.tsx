/**
 * Screen 2 — Name Your Dog
 * Text input with suggestion chips. Writes petName to onboarding store.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import { useUserStore } from '../store/userStore';
import { createPetDoc } from '../services/firestore';
import { COLORS } from '../utils/theme';
import { PET_NAME_MAX_LENGTH } from '@pawmii/shared';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingNameDog'>;
};

const SUGGESTIONS = ['Mochi', 'Biscuit', 'Pepper', 'Noodle', 'Waffles'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingNameDogScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const setPetName = useOnboardingStore((s) => s.setPetName);
  const uid = useUserStore((s) => s.uid);
  const scale = useSharedValue(1);

  const isValid = name.trim().length >= 1 && !!uid;

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleContinue = async () => {
    if (!isValid || !uid) return;
    const trimmedName = name.trim();
    setPetName(trimmedName);
    // Create pet document now — deterministic ID means safe to retry
    const petId = `${uid}_dog`;
    createPetDoc(uid, petId, trimmedName).catch((err) =>
      console.error('[OnboardingNameDog] createPetDoc error:', err),
    );
    navigation.navigate('OnboardingHealth');
  };

  return (
    <View style={styles.root}>
      <View style={styles.blobTop} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Progress dots + back */}
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Text style={styles.back}>← Back</Text>
            </Pressable>
            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>

          {/* Main content */}
          <View style={styles.content}>
            <Text style={styles.headline}>Give your dog{'\n'}a name.</Text>
            <Text style={styles.sub}>They'll carry it forever 🐾</Text>

            {/* Input */}
            <View
              style={[
                styles.inputWrap,
                focused && { borderColor: COLORS.accentBright, shadowOpacity: 0.4 },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter a name…"
                placeholderTextColor={COLORS.textMuted}
                maxLength={PET_NAME_MAX_LENGTH}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {name.length > 0 && (
                <Text style={styles.charCount}>{name.length}/{PET_NAME_MAX_LENGTH}</Text>
              )}
            </View>

            {/* Suggestion chips */}
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.chip,
                    name === s && styles.chipSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setName(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      name === s && styles.chipTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* CTA */}
          <AnimatedPressable
            style={[styles.cta, !isValid && styles.ctaDisabled, btnStyle]}
            onPress={handleContinue}
            onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
            disabled={!isValid}
          >
            <Text style={styles.ctaText}>That's the one!  →</Text>
          </AnimatedPressable>
        </KeyboardAvoidingView>
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
    top: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.accentDim,
    opacity: 0.6,
  },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingBottom: 20 },
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
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextSelected: {
    color: COLORS.accentBright,
  },
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
  ctaDisabled: { opacity: 0.3, shadowOpacity: 0, elevation: 0 },
  ctaText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
