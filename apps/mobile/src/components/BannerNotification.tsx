import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHealthStore } from '../store/healthStore';
import { COLORS } from '../utils/theme';

type BannerType = 'reconnect' | 'coins';

interface Props {
  type: BannerType;
  petName?: string;
  uid?: string | null;
}

export function BannerNotification({ type, petName }: Props) {
  const steps = useHealthStore((s) => s.steps);
  const coinsEarnedToday = useHealthStore((s) => s.coinsEarnedToday);

  if (type === 'reconnect') {
    return (
      <View style={[styles.card, styles.reconnectCard]}>
        <Text style={styles.reconnectIcon}>⚡</Text>
        <Text style={styles.reconnectText}>
          Connect health data to earn coins for {petName ?? 'your dog'}
        </Text>
      </View>
    );
  }

  if (type === 'coins' && steps > 0) {
    return (
      <View style={[styles.card, styles.coinsCard]}>
        <Text style={styles.coinsText}>
          👣 {steps.toLocaleString()} steps  ·  +{coinsEarnedToday} 🪙 today
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  reconnectCard: {
    backgroundColor: 'rgba(255,182,39,0.08)',
    borderColor: 'rgba(255,182,39,0.25)',
  },
  reconnectIcon: { fontSize: 18 },
  reconnectText: {
    flex: 1,
    color: COLORS.neutral,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  coinsCard: {
    backgroundColor: COLORS.accentGlow,
    borderColor: 'rgba(123,92,246,0.3)',
    justifyContent: 'center',
  },
  coinsText: {
    color: COLORS.accentBright,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
