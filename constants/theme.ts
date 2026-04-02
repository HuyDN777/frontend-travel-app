/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Travel app "warm cream + mint" palette
const primaryMint = '#8BD3C7';
const primaryMintDark = '#74BEB3';
const accentTerracotta = '#E07A5F';
const accentTerracottaDark = '#CC6D55';
const creamBackground = '#F6EFE6';
const surfaceLight = '#FFFFFF';
const surfaceDark = '#1B1D1F';
const textPrimaryLight = '#1A1C1E';
const textSecondaryLight = '#5E646B';
const textPrimaryDark = '#ECEDEE';
const textSecondaryDark = '#A3A8AE';

export const Colors = {
  light: {
    text: textPrimaryLight,
    textMuted: textSecondaryLight,
    background: creamBackground,
    surface: surfaceLight,
    surfaceMuted: '#F3F4F6',
    tint: primaryMint,
    primary: primaryMint,
    primaryPressed: primaryMintDark,
    accent: accentTerracotta,
    accentPressed: accentTerracottaDark,
    border: '#E5E7EB',
    icon: '#6B7280',
    tabIconDefault: '#8A8F98',
    tabIconSelected: primaryMint,
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  dark: {
    text: textPrimaryDark,
    textMuted: textSecondaryDark,
    background: '#121416',
    surface: surfaceDark,
    surfaceMuted: '#131619',
    tint: '#E6FBF7',
    primary: '#99E6DB',
    primaryPressed: '#7FD8CB',
    accent: '#F09A84',
    accentPressed: '#E7826B',
    border: '#2A2F35',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#E6FBF7',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Layout tokens for consistent spacing, radius, and shadows.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const Typography = {
  titleXL: { fontSize: 32, lineHeight: 36, fontWeight: '700' as const },
  titleLG: { fontSize: 24, lineHeight: 28, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodySemi: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;
