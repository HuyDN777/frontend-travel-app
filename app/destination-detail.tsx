import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DestinationDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    subtitle?: string;
    image?: string;
    description?: string;
    bestTime?: string;
    highlights?: string;
  }>();

  const highlights = (params.highlights ?? '')
    .split('||')
    .map((x) => x.trim())
    .filter(Boolean);

  const destinationName = params.name || 'Điểm đến';

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm }]}>
        <Image
          source={{
            uri:
              params.image ||
              'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1200&q=80',
          }}
          style={styles.hero}
          contentFit="cover"
        />
        <Card style={styles.infoCard}>
          <Text style={[Typography.titleLG, { color: palette.text }]}>{destinationName}</Text>
          <Text style={[Typography.body, { color: palette.textMuted }]}>{params.subtitle || ''}</Text>
          <Text style={[Typography.body, { color: palette.text, marginTop: Spacing.sm }]}>
            {params.description || 'Khám phá điểm đến nổi bật tại Việt Nam.'}
          </Text>

          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color={palette.primary} />
            <Text style={[Typography.caption, { color: palette.textMuted }]}>
              Thời điểm đẹp: {params.bestTime || 'Quanh năm'}
            </Text>
          </View>

          {highlights.length > 0 ? (
            <View style={styles.highlights}>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>Gợi ý nổi bật</Text>
              {highlights.map((item) => (
                <View key={item} style={styles.row}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={palette.primary} />
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <Button
          title="Tạo kế hoạch du lịch"
          size="lg"
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: '/name-trip',
              params: {
                tripName: `Khám phá ${destinationName}`,
                destination: destinationName,
              },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  hero: {
    width: '100%',
    height: 240,
    borderRadius: Radius.xl,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  highlights: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  cta: {
    width: '100%',
    borderRadius: Radius.pill,
  },
});
