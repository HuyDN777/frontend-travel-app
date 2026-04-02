import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type InputProps = TextInputProps & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { style, leading, trailing, ...props },
  ref,
) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style as any,
      ]}
    >
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
});

const styles = StyleSheet.create({
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

