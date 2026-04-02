import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Colors, Elevation, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type CardProps = ViewProps & {
  elevated?: boolean;
  padded?: boolean;
};

export function Card({
  children,
  elevated = true,
  padded = true,
  style,
  ...rest
}: PropsWithChildren<CardProps>) {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: palette.surface, borderColor: palette.border },
        elevated ? styles.elevated : styles.outline,
        padded ? styles.padded : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
  },
  elevated: {
    ...Elevation.card,
  },
  outline: {
    borderWidth: 1,
  },
  padded: {
    padding: Spacing.lg,
  },
});

