import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Provider = 'google' | 'apple';

const ICONS: Record<Provider, keyof typeof Ionicons.glyphMap> = {
  google: 'logo-google',
  apple: 'logo-apple',
};

type Props = {
  provider: Provider;
  label: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export function SocialOAuthButton({ provider, label, onPress, style }: Props) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? palette.surfaceMuted : palette.surface,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <Ionicons name={ICONS[provider]} size={22} color={palette.text} style={styles.icon} />
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Elevation.card,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    ...Typography.bodySemi,
    letterSpacing: 0.2,
  },
});
