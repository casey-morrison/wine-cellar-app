/** Dark cellar aesthetic with deep burgundy accents */
const burgundy = '#7B1E3A';
const burgundyLight = '#A63D57';
const burgundyMuted = '#4A1524';

export default {
  dark: {
    text: '#F5EDE8',
    textSecondary: '#B8A9A0',
    textMuted: '#7A6B63',
    background: '#0D0A0B',
    backgroundElevated: '#1A1214',
    backgroundCard: '#22181B',
    tint: burgundy,
    tintLight: burgundyLight,
    tintMuted: burgundyMuted,
    tabIconDefault: '#7A6B63',
    tabIconSelected: burgundyLight,
    border: '#2E2226',
    success: '#4CAF7A',
    warning: '#D4A017',
    danger: '#C44536',
    scoreGold: '#E8C547',
    inputBg: '#161012',
  },
  light: {
    // App is dark-first; light kept for completeness
    text: '#1A1214',
    textSecondary: '#5A4A44',
    textMuted: '#8A7A74',
    background: '#F8F4F2',
    backgroundElevated: '#FFFFFF',
    backgroundCard: '#FFFFFF',
    tint: burgundy,
    tintLight: burgundyLight,
    tintMuted: '#E8D0D6',
    tabIconDefault: '#8A7A74',
    tabIconSelected: burgundy,
    border: '#E5D9D4',
    success: '#2E7D4F',
    warning: '#B8860B',
    danger: '#A33A2E',
    scoreGold: '#C9A227',
    inputBg: '#F0EAE6',
  },
};

export const Theme = {
  burgundy,
  burgundyLight,
  burgundyMuted,
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 34,
  },
};
