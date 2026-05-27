import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyProfile, type UserProfile } from '@/utils/api';
import { getSessionUser, getSessionUserId } from '@/utils/session';

type DestinationTag = 'city' | 'beach' | 'food' | 'nature' | 'culture';
type FeaturedDestination = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  tag: DestinationTag;
  description: string;
  bestTime: string;
  highlights: string[];
};

const destinations: FeaturedDestination[] = [
  {
    id: 'hanoi',
    title: 'Hà Nội',
    subtitle: 'Phố cổ & ẩm thực đường phố',
    image: 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1200&q=80',
    tag: 'culture',
    description: 'Thủ đô nghìn năm văn hiến với hồ, phố cổ và văn hóa ẩm thực phong phú.',
    bestTime: 'Tháng 9 - Tháng 11',
    highlights: ['Hồ Hoàn Kiếm', 'Phố cổ', 'Văn Miếu'],
  },
  {
    id: 'danang',
    title: 'Đà Nẵng',
    subtitle: 'Biển xanh & Bà Nà Hills',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1228&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tag: 'beach',
    description: 'Thành phố biển hiện đại, sạch đẹp, thuận tiện đi Hội An - Huế.',
    bestTime: 'Tháng 2 - Tháng 8',
    highlights: ['Biển Mỹ Khê', 'Bà Nà Hills', 'Cầu Rồng'],
  },
  {
    id: 'hoian',
    title: 'Hội An',
    subtitle: 'Đèn lồng & phố cổ ven sông',
    image: 'https://images.unsplash.com/photo-1701397955118-79059690ef50?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tag: 'culture',
    description: 'Phố cổ yên bình, đậm chất di sản với kiến trúc và ẩm thực đặc trưng miền Trung.',
    bestTime: 'Tháng 2 - Tháng 4',
    highlights: ['Chùa Cầu', 'Phố đèn lồng', 'Biển An Bàng'],
  },
  {
    id: 'tphcm',
    title: 'TP.HCM',
    subtitle: 'Năng động, nhiều quán ăn hot',
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    tag: 'food',
    description: 'Đô thị sôi động bậc nhất cả nước, nhiều lựa chọn vui chơi và ăn uống về đêm.',
    bestTime: 'Tháng 12 - Tháng 4',
    highlights: ['Nhà thờ Đức Bà', 'Chợ Bến Thành', 'Phố đi bộ Nguyễn Huệ'],
  },
  {
    id: 'dalat',
    title: 'Đà Lạt',
    subtitle: 'Săn mây, cà phê, không khí mát',
    image: 'https://images.unsplash.com/photo-1626608017817-211d7c48177d?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    tag: 'nature',
    description: 'Thành phố ngàn hoa với khí hậu mát mẻ, rừng thông và nhiều quán cà phê chill.',
    bestTime: 'Tháng 11 - Tháng 3',
    highlights: ['Hồ Xuân Hương', 'Đồi chè Cầu Đất', 'Thung lũng Tình Yêu'],
  },
];

/**
 * Trang chủ: lối tắt đặt vé + banner AI (mục 4) theo code nhóm.
 */
export default function ExploreScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTag, setActiveTag] = useState<DestinationTag | 'all'>('all');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) return undefined;

      let active = true;
      (async () => {
        try {
          const me = await getMyProfile(userId);
          if (!active) return;
          setProfile(me);
        } catch {
          // keep fallback session values
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const session = getSessionUser();

  const getAvatarFallback = (url: string | null | undefined): string => {
    if (!url || typeof url !== 'string') return 'https://i.pravatar.cc/100?img=12';
    const trimmed = url.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return 'https://i.pravatar.cc/100?img=12';
    if (!trimmed.startsWith('http')) return 'https://i.pravatar.cc/100?img=12';
    return trimmed;
  };

  const avatar = getAvatarFallback(profile?.avatarUrl) !== 'https://i.pravatar.cc/100?img=12'
    ? getAvatarFallback(profile?.avatarUrl)
    : getAvatarFallback(session?.avatarUrl);

  const displayName = profile?.fullName || session?.fullName || 'Bạn đồng hành';
  const tagLabel: Record<DestinationTag | 'all', string> = {
    all: 'Tất cả',
    city: 'Thành phố',
    beach: 'Biển',
    food: 'Ẩm thực',
    nature: 'Thiên nhiên',
    culture: 'Văn hóa',
  };

  const visibleDestinations = useMemo(() => {
    const filtered = activeTag === 'all' ? destinations : destinations.filter((item) => item.tag === activeTag);
    const ranked = filtered
      .map((item, idx) => ({ item, score: (idx * 37 + shuffleSeed * 17) % 101 }))
      .sort((a, b) => a.score - b.score)
      .map((entry) => entry.item);
    return ranked.slice(0, 3);
  }, [activeTag, shuffleSeed]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: avatar }}
              style={[styles.avatar, { borderColor: palette.border }]}
            />
            <View>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Chào mừng</Text>
              <Text style={[Typography.titleLG, { color: palette.text }]}>{displayName}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <Text style={[Typography.body, { color: palette.textMuted }]}>Bạn muốn đi đâu?</Text>
        </View>

        <View style={styles.quickGrid}>
          {[
            { icon: 'airplane-outline', label: 'Chuyến bay', route: '/flights', active: true },
            { icon: 'car-outline', label: 'Xe', route: '/transport', active: true },
            { icon: 'restaurant-outline', label: 'Nhà hàng', route: '/restaurants', active: true },
            { icon: 'bed-outline', label: 'Khách sạn', route: '/hotels', active: true },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickItemWrap}
              activeOpacity={0.85}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as '/flights');
                }
              }}>
              <Card style={styles.quickCard}>
                <View style={[styles.quickIcon, { backgroundColor: '#F6EEDA' }]}>
                  <Ionicons name={item.icon as 'airplane-outline'} size={16} color={palette.text} />
                </View>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>{item.label}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Typography.titleLG, styles.sectionTitle, { color: palette.text }]}>
            Điểm đến nổi bật
          </Text>
          <Pressable
            onPress={() => setShuffleSeed((prev) => prev + 1)}
            style={[styles.viewAll, { backgroundColor: '#2F3338' }]}>
            <Text style={[Typography.caption, { color: '#FFF' }]}>Đổi gợi ý</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
          {(['all', 'city', 'beach', 'food', 'nature', 'culture'] as const).map((tag) => {
            const active = tag === activeTag;
            return (
              <Pressable
                key={tag}
                onPress={() => setActiveTag(tag)}
                style={[
                  styles.tagChip,
                  {
                    borderColor: active ? palette.primary : palette.border,
                    backgroundColor: active ? `${palette.primary}22` : palette.surface,
                  },
                ]}>
                <Text style={[Typography.caption, { color: palette.text }]}>{tagLabel[tag]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.destinationRow}>
          {visibleDestinations.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/destination-detail',
                  params: {
                    name: item.title,
                    subtitle: item.subtitle,
                    image: item.image,
                    description: item.description,
                    bestTime: item.bestTime,
                    highlights: item.highlights.join('||'),
                  },
                })
              }
              style={styles.destinationCard}>
              <Image source={{ uri: item.image }} style={styles.destinationImage} contentFit="cover" />
              <View style={styles.destinationOverlay}>
                <Text style={[Typography.titleLG, styles.destinationTitle]}>{item.title}</Text>
                <Text style={[Typography.body, styles.destinationSubtitle]}>{item.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/ai-itinerary')}
          style={({ pressed }) => [
            styles.aiBanner,
            { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.92 : 1 },
          ]}>
          <View style={[styles.aiBannerIcon, { backgroundColor: palette.primary }]}>
            <Ionicons name="sparkles" size={24} color="#0B1B18" />
          </View>
          <View style={styles.aiBannerText}>
            <Text style={[Typography.titleLG, { color: palette.text }]}>Chatbot gợi ý lịch AI</Text>
            <Text style={[Typography.body, { color: palette.textMuted }]}>
              Trò chuyện để gửi số ngày, sở thích, ngân sách; nhận lịch theo ngày rồi duyệt / sửa / áp dụng
              DayPlan nháp.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={palette.textMuted} />
        </Pressable>
      </ScrollView>
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
    paddingBottom: Spacing['2xl'],
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
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  quickItemWrap: {
    width: '48%',
  },
  quickCard: {
    width: '100%',
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
    flex: 1,
  },
  viewAll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  tagRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  destinationRow: {
    gap: Spacing.md,
  },
  destinationCard: {
    height: 160,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Elevation.card,
  },
  destinationImage: {
    ...StyleSheet.absoluteFillObject,
  },
  destinationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  destinationTitle: {
    color: '#FFF',
  },
  destinationSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    ...Elevation.card,
  },
  aiBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerText: {
    flex: 1,
    gap: Spacing.sm,
  },
});
