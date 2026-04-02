import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const destinations = [
  {
    id: 'hanoi',
    title: 'Hà Nội',
    subtitle: 'Phố cổ & ẩm thực đường phố',
    image:
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'danang',
    title: 'Đà Nẵng',
    subtitle: 'Biển xanh & Bà Nà Hills',
    image:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80',
  },
];

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/100?img=12' }}
              style={[styles.avatar, { borderColor: palette.border }]}
            />
            <View>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Good Morning,</Text>
              <Text style={[Typography.titleLG, { color: palette.text }]}>Hello Traveler</Text>
            </View>
          </View>
          <View style={[styles.bellWrap, { backgroundColor: palette.surface }]}>
            <Ionicons name="notifications-outline" size={18} color={palette.icon} />
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <Text style={[Typography.body, { color: palette.textMuted }]}>Where to next?</Text>
        </View>

        <View style={styles.quickGrid}>
          {[
            { icon: 'airplane-outline', label: 'Flights' },
            { icon: 'car-outline', label: 'Rides' },
            { icon: 'restaurant-outline', label: 'Restaurants' },
            { icon: 'bed-outline', label: 'Hotels' },
          ].map((item) => (
            <Card key={item.label} style={styles.quickCard}>
              <View style={[styles.quickIcon, { backgroundColor: '#F6EEDA' }]}>
                <Ionicons name={item.icon as any} size={16} color={palette.text} />
              </View>
              <Text style={[Typography.bodySemi, { color: palette.text }]}>{item.label}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Typography.titleLG, styles.sectionTitle, { color: palette.text }]}>
            Trending Destinations
          </Text>
          <View style={[styles.viewAll, { backgroundColor: '#2F3338' }]}>
            <Text style={[Typography.caption, { color: '#FFF' }]}>View All</Text>
          </View>
        </View>

        <View style={styles.destinationRow}>
          {destinations.map((item) => (
            <View key={item.id} style={styles.destinationCard}>
              <Image source={{ uri: item.image }} style={styles.destinationImage} contentFit="cover" />
              <View style={styles.destinationOverlay}>
                <Text style={[Typography.titleLG, styles.destinationTitle]}>{item.title}</Text>
                <Text style={[Typography.body, styles.destinationSubtitle]}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.fabGroup}>
        {['sparkles-outline', 'play-outline', 'map-outline', 'location-outline'].map((iconName) => (
          <View key={iconName} style={[styles.fab, { backgroundColor: '#C35F44' }]}>
            <Ionicons name={iconName as any} size={20} color="#FFF" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
  },
  bellWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.card,
  },
  search: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Elevation.card,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  quickCard: {
    width: '48%',
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 32,
    lineHeight: 36,
    maxWidth: '72%',
  },
  viewAll: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  destinationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  destinationCard: {
    width: '48%',
    height: 280,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  destinationTitle: {
    color: '#FFF',
    fontSize: 36,
    lineHeight: 38,
  },
  destinationSubtitle: {
    color: '#FFF',
  },
  fabGroup: {
    position: 'absolute',
    right: 18,
    bottom: 92,
    gap: Spacing.sm,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.floating,
  },
});
