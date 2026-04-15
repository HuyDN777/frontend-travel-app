import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type InputProps = TextInputProps & {
  /** Nhãn phía trên ô (khuyên dùng khi placeholder không đủ rõ). */
  label?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { style, label, leading, trailing, ...props },
  ref,
) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  const field = (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style as object | undefined,
      ]}>
      {leading}
      <TextInput
        ref={ref}
        placeholderTextColor={palette.textMuted}
        style={[styles.input, { color: palette.text }]}
        {...props}
      />
      {trailing}
    </View>
  );

  if (!label) {
    return field;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[Typography.caption, { color: palette.textMuted }]}>{label}</Text>
      {field}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  container: {
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    ...Elevation.card,
  } as const,
  input: {
    flex: 1,
    ...Typography.body,
  } as const,
});

