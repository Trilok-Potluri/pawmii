export const COLORS = {
  // ── Backgrounds ─────────────────────────────────────────────────
  bg: '#0A0918',
  surface: '#15112A',
  surfaceRaised: '#1E1838',
  border: '#2D2650',

  // ── Brand purple ─────────────────────────────────────────────────
  accent: '#7B5CF6',
  accentBright: '#9D7FFF',
  accentDim: '#1E1456',
  accentGlow: 'rgba(123,92,246,0.25)',

  // ── Coins / Gold ─────────────────────────────────────────────────
  gold: '#FFCB47',
  goldBg: '#2A1E00',
  goldBorder: 'rgba(255,203,71,0.35)',
  goldGlow: 'rgba(255,203,71,0.18)',

  // ── Pet states ───────────────────────────────────────────────────
  happy: '#22D4B4',
  happyBg: 'rgba(34,212,180,0.12)',
  neutral: '#FFB627',
  neutralBg: 'rgba(255,182,39,0.12)',
  sad: '#FF5F5F',
  sadBg: 'rgba(255,95,95,0.12)',

  // ── Text ─────────────────────────────────────────────────────────
  textPrimary: '#F0EBF8',
  textSecondary: '#9B8FBE',
  textMuted: '#5C5480',

  // ── Legacy aliases (keep for any unconverted references) ─────────
  purple: '#7B5CF6',
  purpleLight: '#1E1456',
  green: '#22D4B4',
  amber: '#FFB627',
  red: '#FF5F5F',
  background: '#0A0918',
  white: '#F0EBF8',
};

export const FONTS = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semibold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
  extrabold: { fontWeight: '800' as const },
};

export const RADII = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};
