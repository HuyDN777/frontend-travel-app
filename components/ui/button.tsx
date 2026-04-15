import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const backgroundColor = isPrimary
    ? palette.primary
    : isSecondary
      ? palette.surface
      : 'transparent';

  const pressedColor = isPrimary
    ? palette.primaryPressed
    : isSecondary
      ? palette.surfaceMuted
      : palette.surfaceMuted;

  const borderColor = isSecondary ? palette.border : 'transparent';
  const textColor =
    variant === 'ghost' ? palette.text : isPrimary ? '#0B1B18' : palette.text;

  const showShadow = variant !== 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        showShadow && styles.shadowed,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: pressed ? pressedColor : backgroundColor, borderColor },
        isSecondary && styles.withBorder,
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0B1B18' : palette.icon} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Ghost là liên kết dạng nút — không dùng đổ bóng (tránh viền xám “loang” trên Android). */
  shadowed: {
    ...Elevation.card,
  },
  withBorder: {
    borderWidth: 1,
  },
  md: {
    height: 44,
    paddingHorizontal: Spacing.lg,
  },
  lg: {
    height: 52,
    paddingHorizontal: Spacing.xl,
  },
  label: {
    ...Typography.bodySemi,
    letterSpacing: 0.2,
  },
});

