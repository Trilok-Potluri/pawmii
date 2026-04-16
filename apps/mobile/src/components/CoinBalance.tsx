import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

interface Props {
  balance: number;
}

export function CoinBalance({ balance }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.amount}>{balance.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.goldBg,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  icon: { fontSize: 15 },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.4,
  },
});
