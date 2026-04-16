import React from 'react';
import { Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { COLORS } from '../utils/theme';
import { FEED_COST_COINS } from '@pawmii/shared';

interface Props {
  petName: string;
  canFeed: boolean;
  isLoading: boolean;
  onFeed: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FeedButton({ petName, canFeed, isLoading, onFeed }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  return (
    <AnimatedPressable
      style={[styles.button, !canFeed && styles.disabled, animatedStyle]}
      onPress={onFeed}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!canFeed || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.textPrimary} />
      ) : (
        <Text style={styles.text}>
          🍖  Feed {petName}  ·  {FEED_COST_COINS} 🪙
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    shadowOpacity: 0.55,
    elevation: 12,
  },
  disabled: {
    opacity: 0.3,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
