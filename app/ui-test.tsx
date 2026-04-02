import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function UiTestScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <ThemedView style={styles.root} lightColor={palette.background} darkColor={palette.background}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          UI Test
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Verify theme palette + shared components match the design vibe.
        </ThemedText>

        <Card style={styles.sectionCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Buttons
          </ThemedText>

          <View style={styles.row}>
            <Button title="Primary" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Secondary" variant="secondary" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Disabled" disabled onPress={() => {}} />
          </View>
          <View style={styles.row}>
            <Button title="Loading" loading onPress={() => {}} />
          </View>
        </Card>

        <Card style={styles.sectionCard} elevated={false}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Inputs + Surfaces
          </ThemedText>

          <Input placeholder="Email" keyboardType="email-address" />
          <View style={styles.gap} />
          <Input placeholder="Password" secureTextEntry />

          <View style={styles.gapLg} />
          <View style={[styles.swatch, { backgroundColor: palette.surface }]}>
            <ThemedText>surface</ThemedText>
          </View>
          <View style={styles.gap} />
          <View style={[styles.swatch, { backgroundColor: palette.surfaceMuted }]}>
            <ThemedText>surfaceMuted</ThemedText>
          </View>
          <View style={styles.gap} />
          <View style={[styles.swatch, { backgroundColor: palette.background }]}>
            <ThemedText>background</ThemedText>
          </View>
        </Card>

        <ThemedText style={styles.footer} lightColor={palette.textMuted} darkColor={palette.textMuted}>
          Tip: switch Light/Dark mode and confirm colors + shadows look consistent.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: 140,
  },
  title: {
    marginTop: Spacing.sm,
  },
  subtitle: {
    marginTop: -Spacing.sm,
  },
  sectionCard: {
    padding: 0,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  row: {
    marginBottom: Spacing.md,
  },
  gap: {
    height: Spacing.md,
  },
  gapLg: {
    height: Spacing.lg,
  },
  swatch: {
    borderRadius: 16,
    padding: Spacing.md,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

