import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';
import { HUNGER_HAPPY_THRESHOLD, HUNGER_SAD_THRESHOLD } from '@pawmii/shared';

interface Props {
  hunger: number; // 0–100
}

const getConfig = (hunger: number) => {
  if (hunger > HUNGER_HAPPY_THRESHOLD) {
    return { color: COLORS.happy, bg: COLORS.happyBg, label: 'Full', emoji: '😋' };
  }
  if (hunger >= HUNGER_SAD_THRESHOLD) {
    return { color: COLORS.neutral, bg: COLORS.neutralBg, label: 'Peckish', emoji: '😐' };
  }
  return { color: COLORS.sad, bg: COLORS.sadBg, label: 'Hungry!', emoji: '😢' };
};

export function HungerBar({ hunger }: Props) {
  const pct = Math.max(0, Math.min(hunger, 100));
  const { color, bg, label, emoji } = getConfig(hunger);

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.row}>
        <View style={styles.labelGroup}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.labelText}>HUNGER</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: bg, borderColor: color + '40' }]}>
          <Text style={[styles.statusLabel, { color }]}>{label}</Text>
        </View>
      </View>

      {/* Track */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>

      {/* Value */}
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>
          {Math.round(hunger)}
          <Text style={styles.valueDim}> / 100</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: { fontSize: 20 },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
    elevation: 4,
  },
  valueRow: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  valueDim: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
});
