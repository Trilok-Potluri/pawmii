import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import type { PetComputedState } from '@pawmii/shared';
import { COLORS } from '../utils/theme';

const SPRITES: Record<PetComputedState, ReturnType<typeof require>> = {
  happy: require('../../assets/sprites/dog_happy.gif'),
  neutral: require('../../assets/sprites/dog_neutral.gif'),
  sad: require('../../assets/sprites/dog_sad.gif'),
};

const STATE_COLOR: Record<PetComputedState, string> = {
  happy: COLORS.happy,
  neutral: COLORS.neutral,
  sad: COLORS.sad,
};

const STATE_BG: Record<PetComputedState, string> = {
  happy: COLORS.happyBg,
  neutral: COLORS.neutralBg,
  sad: COLORS.sadBg,
};

interface Props {
  state: PetComputedState;
}

export function DogSprite({ state }: Props) {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const glowColor = STATE_COLOR[state];
  const platformColor = STATE_BG[state];

  return (
    <View style={styles.wrapper}>
      {/* Pulsing outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: glowColor,
            shadowColor: glowColor,
          },
          ringStyle,
        ]}
      />

      {/* Soft circular platform */}
      <View style={[styles.platform, { backgroundColor: platformColor }]} />

      {/* Dog GIF */}
      <Image
        source={SPRITES[state]}
        style={styles.sprite}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 28,
    shadowOpacity: 1,
    elevation: 16,
  },
  platform: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  sprite: {
    width: 210,
    height: 210,
    zIndex: 1,
  },
});
